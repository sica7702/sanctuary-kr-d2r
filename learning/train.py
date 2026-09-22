"""Fine-tune a pinned pretrained MiniLM, then distill into a numeric edge MLP.

No production accuracy is inferred from training loss or synthetic smoke tests.
Server-only human test labels are never downloaded to this process.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import random
import subprocess
import time

os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')
import torch
from torch import nn
from torch.nn import functional as F
from transformers import AutoModel, AutoTokenizer

MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
REVISION = '1110a243fdf4706b3f48f1d95db1a4f5529b4d41'
SCHEMA = 'sanctuary-value-neural-v1'

def stable_hash(data):
    return hashlib.sha256(json.dumps(data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

class Teacher(nn.Module):
    def __init__(self, count, cache):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(MODEL, revision=REVISION, cache_dir=cache, trust_remote_code=False, use_safetensors=True)
        # Fine-tune the final two pretrained encoder blocks, not merely a new head.
        for p in self.encoder.parameters():
            p.requires_grad = False
        for block in self.encoder.encoder.layer[-2:]:
            for p in block.parameters():
                p.requires_grad = True
        self.head = nn.Sequential(nn.Linear(self.encoder.config.hidden_size + count, 64), nn.ReLU(), nn.Linear(64, 6))

    def forward(self, tokens, numeric):
        result = self.encoder(**tokens).last_hidden_state
        mask = tokens['attention_mask'].unsqueeze(-1)
        pooled = (result * mask).sum(1) / mask.sum(1).clamp(min=1)
        return self.head(torch.cat([pooled, numeric], dim=1))

def targets(rows, device):
    ys, weights = [], []
    for row in rows:
        value, review = row['labels']['value'], row['labels']['review']
        weak = row.get('weak_value') if value is None else None
        ys.append([value if value is not None else weak if weak is not None else -1, review if review is not None else -1])
        weights.append([1.0 if value is not None else .15 if weak is not None else 0.0, 1.0 if review is not None else 0.0])
    return torch.tensor(ys, device=device), torch.tensor(weights, device=device)

def supervised_loss(logits, labels, weights):
    terms = []
    for t, (start, end) in enumerate([(0, 4), (4, 6)]):
        valid = labels[:, t] >= 0
        if valid.any():
            loss = F.cross_entropy(logits[valid, start:end], labels[valid, t], reduction='none')
            terms.append((loss * weights[valid, t]).mean())
    return sum(terms) if terms else logits.sum() * 0

def train(data, out, *, device='auto', epochs=6, student_epochs=120, max_seconds=1800, smoke=False):
    started = time.monotonic()
    random.seed(136); torch.manual_seed(136); torch.set_num_threads(min(4, os.cpu_count() or 1))
    if data['schema'] != SCHEMA or not data.get('train'):
        raise ValueError('schema_or_training_data_missing')
    if data.get('test'):
        raise ValueError('server_holdout_must_not_be_given_to_trainer')
    device = ('cuda' if torch.cuda.is_available() else 'cpu') if device == 'auto' else device
    output = Path(out); output.mkdir(parents=True, exist_ok=True)
    # An isolated cache/checkpoint directory; no changes to site assets or raw data.
    cache = str(output.parent / 'model-cache')
    tokenizer = AutoTokenizer.from_pretrained(MODEL, revision=REVISION, cache_dir=cache, trust_remote_code=False)
    count = len(data['features']); teacher = Teacher(count, cache).to(device)
    rows = data['train']
    labels, weights = targets(rows, device)
    if not (weights > 0).any():
        raise ValueError('no_human_or_weak_training_labels')
    signatures = {str(r['candidate_id']): stable_hash([r['source_hash'], r['labels'], r.get('weak_value')]) for r in rows}
    checkpoint = output.parent / 'previous-teacher.pt'
    manifest = output.parent / 'previous-teacher.json'
    resumed = False
    if checkpoint.exists() and manifest.exists() and not smoke:
        old = json.loads(manifest.read_text(encoding='utf-8'))
        # Removed/corrected samples force a clean rebuild; don't retain their influence.
        if old.get('revision') == REVISION and old.get('features') == data['features'] and all(signatures.get(k) == v for k, v in old.get('samples', {}).items()):
            teacher.load_state_dict(torch.load(checkpoint, map_location=device, weights_only=True))
            resumed = True
    tracked = next(p for p in teacher.encoder.parameters() if p.requires_grad)
    before = tracked.detach().clone()
    optimizer = torch.optim.AdamW([
        {'params': [p for p in teacher.encoder.parameters() if p.requires_grad], 'lr': 2e-5},
        {'params': teacher.head.parameters(), 'lr': 1e-3}], weight_decay=.01)
    numeric = torch.tensor([r['features'] for r in rows], dtype=torch.float32, device=device)
    steps = 0; last_loss = None
    def check_time():
        if time.monotonic() - started > max_seconds:
            raise TimeoutError('training_time_budget_exceeded')
    def tokens(batch):
        return {k: v.to(device) for k, v in tokenizer([r['text'] for r in batch], padding=True, truncation=True, max_length=192, return_tensors='pt').items()}
    teacher.train()
    for epoch in range(epochs):
        indices = list(range(len(rows))); random.shuffle(indices)
        for offset in range(0, len(indices), 8):
            check_time(); idx = indices[offset:offset+8]
            logits = teacher(tokens([rows[i] for i in idx]), numeric[idx])
            loss = supervised_loss(logits, labels[idx], weights[idx])
            optimizer.zero_grad(); loss.backward(); nn.utils.clip_grad_norm_(teacher.parameters(), 1.0); optimizer.step()
            steps += 1; last_loss = float(loss.detach())
        print(json.dumps({'phase': 'fine_tuning', 'epoch': epoch+1, 'loss': last_loss}), flush=True)
    delta = float((tracked.detach() - before).abs().sum())
    if not math.isfinite(delta) or delta <= 0:
        raise RuntimeError('pretrained_weights_did_not_change')
    teacher.eval(); soft = []
    with torch.no_grad():
        for offset in range(0, len(rows), 16):
            check_time(); soft.append(teacher(tokens(rows[offset:offset+16]), numeric[offset:offset+16]))
    soft = torch.cat(soft).detach()
    student = nn.Sequential(nn.Linear(count, 48), nn.ReLU(), nn.Linear(48, 6)).to(device)
    opt = torch.optim.AdamW(student.parameters(), lr=.005, weight_decay=.001)
    for epoch in range(student_epochs):
        check_time(); student.train(); logits = student(numeric)
        kd = sum(F.kl_div(F.log_softmax(logits[:, a:b]/2, dim=-1), F.softmax(soft[:, a:b]/2, dim=-1), reduction='batchmean')*4 for a,b in [(0,4),(4,6)])
        loss = .5 * kd + supervised_loss(logits, labels, weights)
        opt.zero_grad(); loss.backward(); nn.utils.clip_grad_norm_(student.parameters(), 1); opt.step()
    student.eval()
    # Calibration labels are disjoint from training and server-held final tests.
    thresholds = {'value': .85, 'review': .99}
    calibration = data.get('calibration', [])
    if calibration:
        with torch.no_grad():
            pred = student(torch.tensor([r['features'] for r in calibration], dtype=torch.float32, device=device))
        for task, (start, end) in {'value': (0,4), 'review': (4,6)}.items():
            p = F.softmax(pred[:, start:end], dim=-1).cpu()
            for threshold in ([.7,.8,.85,.9,.95,.98,.995] if task == 'value' else [.95,.98,.99,.995]):
                examples = [(int(p[i].argmax()), r['labels'][task]) for i,r in enumerate(calibration) if r['labels'][task] is not None and float(p[i].max()) >= threshold]
                if len(examples) >= 10 and sum(a == b for a,b in examples)/len(examples) >= (.9 if task == 'value' else .98):
                    thresholds[task] = threshold; break
    support = {}
    for row in rows:
        family = row['family']; s = support.setdefault(family, {'family': family, 'keys': [], 'ranges': {}, 'reqlevels': []})
        level = row['context'].get('reqlevel', 0)
        if level not in s['reqlevels']: s['reqlevels'].append(level)
        for key, value in row['context']['values'].items():
            if key not in s['ranges']: s['ranges'][key] = [value, value]
            s['ranges'][key] = [min(s['ranges'][key][0], value), max(s['ranges'][key][1], value)]
        s['keys'] = sorted(s['ranges'])
    artifact = {'schema': SCHEMA, 'kind': 'minilm-distilled-mlp', 'features': data['features'],
        'teacher': {'model': MODEL, 'revision': REVISION, 'fine_tuned': True, 'steps': steps, 'weight_delta': delta, 'continued_from_previous': resumed},
        'layers': [{'weights': layer.weight.detach().cpu().tolist(), 'bias': layer.bias.detach().cpu().tolist()} for layer in [student[0],student[2]]],
        'thresholds': thresholds, 'support': list(support.values()), 'fixture_only': bool(smoke)}
    (output / 'artifact.json').write_text(json.dumps(artifact, ensure_ascii=False, allow_nan=False), encoding='utf-8')
    if not smoke:
        tmp = checkpoint.with_suffix('.tmp'); torch.save(teacher.cpu().state_dict(), tmp); tmp.replace(checkpoint)
        manifest.write_text(json.dumps({'revision': REVISION, 'features': data['features'], 'samples': signatures}), encoding='utf-8')
    with torch.no_grad():
        checks = student(numeric[:8]).cpu().tolist()
    report = {'fixture_only': bool(smoke), 'seconds': time.monotonic()-started, 'device': device, 'pretrained_weight_delta': delta,
        'teacher_steps': steps, 'training_examples': len(rows), 'human_value_labels': sum(r['labels']['value'] is not None for r in rows),
        'weak_labels': sum(r.get('weak_value') is not None for r in rows), 'parity': [{'features': rows[i]['features'], 'logits': z} for i,z in enumerate(checks)]}
    (output / 'training-report.json').write_text(json.dumps(report, allow_nan=False), encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k != 'parity'}), flush=True)
    return artifact

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', required=True); parser.add_argument('--out', required=True)
    parser.add_argument('--device', default='auto', choices=['auto','cpu','cuda'])
    parser.add_argument('--epochs', type=int, default=6); parser.add_argument('--student-epochs', type=int, default=120)
    parser.add_argument('--max-seconds', type=int, default=1800); parser.add_argument('--smoke', action='store_true')
    args = parser.parse_args()
    raw = Path(args.dataset).read_text(encoding='utf-8')
    enriched = subprocess.run(['node', str(Path(__file__).with_name('weak-baseline.mjs'))], input=raw, text=True, encoding='utf-8', capture_output=True, check=True)
    train(json.loads(enriched.stdout), args.out, device=args.device, epochs=args.epochs, student_epochs=args.student_epochs, max_seconds=args.max_seconds, smoke=args.smoke)
