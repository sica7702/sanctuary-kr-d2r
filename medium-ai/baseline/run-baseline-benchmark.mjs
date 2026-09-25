import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const extensionRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const projectRoot = dirname(extensionRoot);

async function checkSyntax(file) {
  const started = performance.now();
  try { await exec('node', ['--check', join(projectRoot, file)], { windowsHide: true }); return { file, passed: true, duration_ms: Math.round(performance.now() - started) }; }
  catch (error) { return { file, passed: false, duration_ms: Math.round(performance.now() - started), error: String(error?.stderr || error?.message || error).slice(0, 500) }; }
}

export async function runBaselineBenchmark(output = join(extensionRoot, 'baseline-benchmark.json')) {
  const syntax = await Promise.all(['worker.js', 'ai-service.mjs', 'traderie-integrity.mjs'].map(checkSyntax));
  const tests = (await readdir(join(extensionRoot, 'tests'))).filter(name => name.endsWith('.test.mjs'));
  const testResults = [];
  for (const name of tests) {
    const started = performance.now();
    try { const result = await exec('node', ['--test', join(extensionRoot, 'tests', name)], { windowsHide: true, maxBuffer: 2_000_000 }); testResults.push({ file: name, passed: true, duration_ms: Math.round(performance.now() - started), summary: String(result.stdout || '').split(/\r?\n/).slice(-8).join('\n') }); }
    catch (error) { testResults.push({ file: name, passed: false, duration_ms: Math.round(performance.now() - started), summary: String(error?.stdout || error?.stderr || error?.message || error).slice(-1000) }); }
  }
  const report = { benchmark_version: 'baseline-benchmark-v1', captured_at: new Date().toISOString(), scope: 'read-only syntax and extension smoke tests; no D1 or model provider calls', syntax, tests: testResults, all_passed: [...syntax, ...testResults].every(item => item.passed) };
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8'); return report;
}

if (process.argv[1]?.endsWith('run-baseline-benchmark.mjs')) { const report = await runBaselineBenchmark(process.argv[2]); process.stdout.write(`${JSON.stringify({ benchmark_version: report.benchmark_version, all_passed: report.all_passed, syntax: report.syntax, test_count: report.tests.length })}\n`); }
