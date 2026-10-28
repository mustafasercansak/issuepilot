import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectInventoryContext, isInventorySource, inventoryPrompt } from '../dist/inventory-context.js';

test('inventory excludes generated files, known credential paths and its own output', () => {
  for (const path of ['.env', '.env.local', 'credentials.json', 'private-key.json', 'node_modules/example/index.ts', 'dist/cli.js', 'package-lock.json', 'docs/repository-inventory.md'])
    assert.equal(isInventorySource(path), false, path);
  for (const path of ['README.md', 'src/cli.ts', '.github/workflows/ci.yml', 'package.json'])
    assert.equal(isInventorySource(path), true, path);
});

test('context contains only tracked bounded regular files', () => {
  const root = mkdtempSync(join(tmpdir(), 'issuepilot-test-'));
  try {
    execFileSync('git',['init','--quiet'],{cwd:root});
    writeFileSync(join(root,'README.md'),'Example');
    writeFileSync(join(root,'untracked.md'),'Not included');
    writeFileSync(join(root,'large.md'),'x'.repeat(24_001));
    symlinkSync('/etc/passwd',join(root,'link.md'));
    execFileSync('git',['add','README.md','large.md','link.md'],{cwd:root});
    const context = collectInventoryContext(root);
    assert.deepEqual(context.sources,[{path:'README.md',content:'Example'}]);
    assert.deepEqual(context.omitted,['large.md','link.md']);
    assert.match(inventoryPrompt(context),/static analysis/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
