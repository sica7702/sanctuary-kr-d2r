"""Bounded PC learning loop. CTRL+C stops; a stopped PC never stops website inference."""
import argparse
import getpass
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class Client:
    def __init__(self, url, token):
        parts = urlsplit(url)
        if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:
            raise ValueError('HTTPS 사이트 주소만 입력하세요.')
        self.base = f'{parts.scheme}://{parts.netloc}'
        self.token = token
        self.opener = build_opener(NoRedirect)

    def post(self, path, body=None):
        request = Request(self.base + '/api/trainer/' + path, data=json.dumps(body or {}).encode(), method='POST',
            headers={'Content-Type':'application/json', 'Authorization':'Bearer '+self.token})
        with self.opener.open(request, timeout=60) as response:
            raw = response.read(1200001)
            if len(raw) > 1200000: raise ValueError('API 응답 크기 제한 초과')
            return json.loads(raw)

def cycle(client, state_dir, *, max_seconds=1800, device='auto'):
    # Synchronize a complete bounded pass, including older reviewed rows.
    for _ in range(1000):
        page = client.post('sync')
        if page.get('complete'): break
    else: raise RuntimeError('동기화 페이지 한도 초과: 관리자 점검 필요')
    job = client.post('jobs')
    if job.get('status') != 'ready':
        print(json.dumps(job, ensure_ascii=False), flush=True)
        return False
    identity = {k:job[k] for k in ['job_id','lease']}
    stopped = threading.Event(); heartbeat_errors = []
    def heartbeat():
        while not stopped.wait(60):
            try: client.post('heartbeat', identity)
            except Exception as error: heartbeat_errors.append(type(error).__name__)
    thread = threading.Thread(target=heartbeat, daemon=True); thread.start()
    try:
        data = {'schema':job['schema'], 'features':job['features'], 'train':[], 'calibration':[]}
        after = -1
        while True:
            page = client.post('data', {**identity, 'after':after})
            for row in page['rows']:
                fold = row.pop('fold'); row.pop('position', None)
                if fold not in data or fold == 'test': raise ValueError('invalid_training_fold')
                data[fold].append(row)
            if page['next'] is None: break
            after = page['next']
        directory = state_dir / job['job_id']; directory.mkdir(parents=True)
        source = directory / 'dataset.json'; source.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
        env = dict(os.environ); env.pop('SKR_TRAINER_TOKEN', None)
        print('학습 시작. 이 창을 닫으면 작업이 중단됩니다. 사이트의 기존 감정은 유지됩니다.', flush=True)
        subprocess.run([sys.executable, str(Path(__file__).with_name('train.py')), '--dataset', str(source), '--out', str(directory),
            '--device', device, '--max-seconds', str(max_seconds)], check=True, timeout=max_seconds+120, env=env)
        artifact = json.loads((directory/'artifact.json').read_text(encoding='utf-8'))
        result = client.post('result', {**identity, 'dataset_hash':job['dataset_hash'], 'artifact':artifact})
        (directory/'server-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(result, ensure_ascii=False), flush=True)
        return True
    except BaseException as error:
        try: client.post('failed', {**identity, 'error':type(error).__name__})
        except Exception: pass
        raise
    finally:
        stopped.set(); thread.join(timeout=65)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', required=True); parser.add_argument('--once', action='store_true')
    parser.add_argument('--device', default='auto', choices=['auto','cpu','cuda'])
    parser.add_argument('--max-seconds', type=int, default=1800)
    parser.add_argument('--interval', type=int, default=900)
    args = parser.parse_args()
    if not 30 <= args.max_seconds <= 7200 or args.interval < 60: parser.error('학습 30~7200초, 확인 간격 최소 60초')
    token = os.environ.get('SKR_TRAINER_TOKEN') or getpass.getpass('관리자에서 발급한 PC 학습 연결 키: ')
    if len(token) != 64: parser.error('잘못된 연결 키')
    client = Client(args.site, token)
    state = Path(__file__).resolve().parent.parent/'learning-state'; state.mkdir(exist_ok=True)
    stamp = state/'last-attempt.json'
    while True:
        try:
            last = json.loads(stamp.read_text()).get('time', 0) if stamp.exists() else 0
            if args.once or time.time()-last >= 86400:
                # Retry checks without retraining unchanged data. Limit real jobs to one/day.
                trained = cycle(client, state, max_seconds=args.max_seconds, device=args.device)
                if trained: stamp.write_text(json.dumps({'time':time.time()}))
            if args.once: break
        except KeyboardInterrupt:
            print('학습 실행기를 종료했습니다. 배포된 감정 모델은 계속 사용됩니다.');break
        except Exception as error:
            print('학습 중단:', type(error).__name__, str(error)[:300], flush=True)
            stamp.write_text(json.dumps({'time':time.time()}))
            if args.once: raise
        time.sleep(args.interval)

if __name__ == '__main__': main()
