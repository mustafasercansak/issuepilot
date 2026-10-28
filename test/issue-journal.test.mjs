import test from 'node:test';
import assert from 'node:assert/strict';
import { IssueJournal } from '../dist/issue-journal.js';
const metadata={repository:'example/repo',issue:3,runId:'42',attempt:'1',sha:'a'.repeat(40),branch:'issuepilot/inventory-3',output:'docs/technical-summary-3.md'};
test('one comment per run retains all milestone entries',async()=>{
  const calls=[];
  const journal=new IssueJournal(metadata,async(path,method='GET',body)=>{
    calls.push({path,method,body});
    return method==='GET'?[]:{id:101};
  });
  assert.equal(await journal.record('Başladı.'),true);
  assert.equal(await journal.record('Doğrulama geçti.'),true);
  assert.equal(calls.filter(c=>c.method==='POST').length,1);
  assert.equal(calls.filter(c=>c.method==='PATCH').length,1);
  const body=calls.at(-1).body.body;
  assert.match(body,/Başladı/);assert.match(body,/Doğrulama geçti/);
  assert.match(body,/actions\/runs\/42/);assert.match(body,/TSİ/);
});
test('lost create response is recovered without duplicate or editing human comments',async()=>{
  let saved,posts=0,patches=0;
  const journal=new IssueJournal(metadata,async(path,method='GET',body)=>{
    if(method==='GET')return [
      {id:99,body:'<!-- issuepilot:run=42:attempt=1 -->',user:{login:'human'}},
      ...(saved?[saved]:[]),
    ];
    if(method==='POST'){posts++;saved={id:101,body:body.body,user:{login:'github-actions[bot]'}};throw new TypeError('network');}
    patches++;assert.equal(path,'issues/comments/101');saved.body=body.body;return saved;
  });
  assert.equal(await journal.record('Başladı.'),false);
  assert.equal(await journal.record('Devam etti.'),true);
  assert.equal(posts,1);assert.equal(patches,1);
  assert.match(saved.body,/Başladı/);assert.match(saved.body,/Devam etti/);
});
test('separate attempts preserve prior run history',async()=>{
  let posts=0;
  const journal=new IssueJournal({...metadata,attempt:'2'},async(path,method='GET')=>{
    if(method==='GET')return [{id:101,body:'<!-- issuepilot:run=42:attempt=1 -->',user:{login:'github-actions[bot]'}}];
    assert.equal(method,'POST');posts++;return{id:102};
  });
  assert.equal(await journal.record('İkinci deneme.'),true);
  assert.equal(posts,1);
});
