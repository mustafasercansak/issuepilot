import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { classifyLog } from '../dist/ci-log.js';

const cases = [
  ['permissions', 'Run gh api\nHTTP 403: Resource not accessible by integration', false],
  ['dependency', 'npm error code ERESOLVE\nnpm error Could not resolve dependency', false],
  ['build', 'src/cli.ts(3,5): error TS2322: Type string is not assignable', false],
  ['test', '✖ queue: broken (3.1ms)\nℹ tests 5\nℹ fail 1', false],
  ['timeout', 'Error: The job running on runner GitHub Actions 1 has exceeded the maximum execution time of 5 minutes.', true],
  ['infrastructure', 'npm error network request failed: ECONNRESET', true],
];
for (const [category, log, retryable] of cases)
  test(`classifies ${category}`, () => {
    const result = classifyLog(log);
    assert.equal(result.category, category);
    assert.equal(result.retryable, retryable);
    assert.ok(result.evidence.length > 0);
  });

test('unknown logs and first-match priority', () => {
  assert.deepEqual(classifyLog('everything is fine\nDone.'), { category: 'unknown', matched: [], retryable: false, evidence: [] });
  const mixed = classifyLog('error TS2304: Cannot find name x\nECONNRESET');
  assert.equal(mixed.category, 'build');
  assert.deepEqual(mixed.matched, ['build', 'infrastructure']);
});

test('evidence drops ANSI and timestamps, redacts credentials and bounds length', () => {
  const token = 'ghp_' + 'a'.repeat(30);
  const result = classifyLog(`2026-10-31T10:00:00.1234567Z \x1b[31mnot ok 1\x1b[0m token=${token} Authorization: Bearer abcdefgh12345678 ${'x'.repeat(500)}`);
  assert.equal(result.category, 'test');
  const line = result.evidence[0];
  assert.ok(line.startsWith('not ok 1'));
  assert.ok(line.length <= 200);
  assert.doesNotMatch(line, /ghp_a|abcdefgh1234/);
  const short = classifyLog(`not ok 1 token=${token} Bearer abcdefgh12345678`).evidence[0];
  assert.match(short, /\[redacted\]/);
  assert.doesNotMatch(short, /ghp_|abcdefgh/);
});

test('oversized logs are rejected and at most five evidence lines are kept', () => {
  assert.throws(() => classifyLog('x'.repeat(5_000_001)), /too large/);
  assert.equal(classifyLog(Array.from({ length: 20 }, (_, i) => `not ok ${i + 1}`).join('\n')).evidence.length, 5);
});

test('CLI reads a file and uses exit codes 0, 1 and 2', () => {
  const root = mkdtempSync(join(tmpdir(), 'issuepilot-log-'));
  try {
    const known = join(root, 'known.log'), unknown = join(root, 'unknown.log');
    writeFileSync(known, 'npm error code ERESOLVE');
    writeFileSync(unknown, 'all good');
    const run = file => spawnSync(process.execPath, [resolve('dist/cli.js'), 'classify-log', file], { encoding: 'utf8', env: { PATH: process.env.PATH } });
    const ok = run(known);
    assert.equal(ok.status, 0);
    assert.equal(JSON.parse(ok.stdout).category, 'dependency');
    assert.equal(run(unknown).status, 1);
    const missing = run(join(root, 'missing.log'));
    assert.equal(missing.status, 2);
    assert.equal(missing.stdout, '');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
