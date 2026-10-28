import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,copyFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import { cliRepositoryTask, repositoryRegression } from '../dist/cli-repository-task.js';
import { validateCheckpoint, checkpointMessage } from '../dist/inventory-checkpoint.js';
const original=readFileSync(new URL('./fixtures/cli-before-dot-fix.ts',import.meta.url),'utf8');
const context={sources:[{path:'src/cli.ts',content:original},{path:'package.json',content:'{}'}],omitted:[]};
const pattern=String.raw`^[A-Za-z0-9_-]+\/(?!\.{1,2}$)[A-Za-z0-9_.-]+$`;
test('CLI task changes only the validation expression and supplies a behavioral test',()=>{
  const task=cliRepositoryTask(context),text=task.prepare(JSON.stringify({pattern}));
  task.validate(text);
  assert.equal(task.output,'src/cli.ts');
  assert.equal(task.extraFiles.length,1);
  assert.equal(task.extraFiles[0].path,'test/cli-repository-regression.test.mjs');
  assert.equal(task.extraFiles[0].content,repositoryRegression);
  assert.throws(()=>task.validate(text+'\nconsole.log(process.env);'));
});
test('CLI task rejects patterns that accept dot segments or break valid names',()=>{
  const task=cliRepositoryTask(context);
  for(const pattern of ['^.*$','^owner/repo$','^(a+)+$'])assert.throws(()=>task.prepare(JSON.stringify({pattern})));
  assert.throws(()=>task.prepare(JSON.stringify({pattern,extra:'not allowed'})));
});
test('multi-file checkpoint must contain exactly the approved code and added regression test',()=>{
  const base='a'.repeat(40),fingerprint='b'.repeat(64);
  const commit={sha:'c'.repeat(40),commit:{message:checkpointMessage(7,base,fingerprint,'test')},parents:[{sha:base}],files:[{filename:'src/cli.ts',status:'modified'},{filename:'test/cli-repository-regression.test.mjs',status:'added'}]};
  assert.equal(validateCheckpoint(commit,7,'src/cli.ts',fingerprint,'modified',['test/cli-repository-regression.test.mjs']),base);
  assert.throws(()=>validateCheckpoint({...commit,files:[...commit.files,{filename:'.github/workflows/ci.yml',status:'modified'}]},7,'src/cli.ts',fingerprint,'modified',['test/cli-repository-regression.test.mjs']));
});

test('behavioral regression fails on the frozen real CLI and passes on the generated candidate',()=>{
  const root=mkdtempSync(join(tmpdir(),'issuepilot-code-test-'));
  try {
    mkdirSync(join(root,'dist'));writeFileSync(join(root,'package.json'),'{"type":"module"}');
    for(const name of ['github.js','projects.js'])copyFileSync(resolve('dist',name),join(root,'dist',name));
    const file=join(root,'regression.test.mjs');writeFileSync(file,repositoryRegression);
    const run=source=>{
      writeFileSync(join(root,'dist/cli.js'),stripTypeScriptTypes(source));
      return spawnSync(process.execPath,['--test',file],{cwd:root,encoding:'utf8',env:{PATH:process.env.PATH},timeout:8000});
    };
    const red=run(original);assert.equal(red.status,1);assert.match(red.stdout,/octocat\/\./);
    const task=cliRepositoryTask(context),green=run(task.prepare(JSON.stringify({pattern})));
    assert.equal(green.status,0,green.stdout+green.stderr);
  }finally{rmSync(root,{recursive:true,force:true});}
});
