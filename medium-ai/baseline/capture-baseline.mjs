import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const files = ['worker.js', 'ai-service.mjs', 'traderie-integrity.mjs', 'public/admin/index.html'];

async function sha256(path) {
  const bytes = await readFile(join(root, path));
  return { bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export async function captureBaseline(output = join(root, 'medium-ai', 'baseline', 'baseline-manifest.json')) {
  const manifest = { baseline_version: 'baseline-v1', captured_at: new Date().toISOString(), production_files: {} };
  for (const file of files) {
    try { manifest.production_files[file] = await sha256(file); }
    catch (error) { manifest.production_files[file] = { unavailable: String(error?.message || error) }; }
  }
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

if (process.argv[1]?.endsWith('capture-baseline.mjs')) {
  const manifest = await captureBaseline(process.argv[2]);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}
