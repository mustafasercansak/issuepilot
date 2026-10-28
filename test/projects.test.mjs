import test from 'node:test';
import assert from 'node:assert/strict';
import { readProjectStatus } from '../dist/projects.js';
const item = status => ({content:{number:1,repository:{nameWithOwner:'example/repo'}},fieldValueByName:status?{name:status}:null});
const response = (nodes,hasNextPage=false,endCursor=null)=>Response.json({data:{node:{items:{nodes,pageInfo:{hasNextPage,endCursor}}}}});
test('project gate reads the selected project, issue and Status',async()=>{
  for(const status of ['Ready','Backlog','In progress','Done',null]) {
    assert.equal(await readProjectStatus('example/repo',1,'PVT_test','fake',async(url,options)=>{
      assert.equal(url,'https://api.github.com/graphql');
      assert.equal(JSON.parse(options.body).variables.project,'PVT_test');
      return response([item(status)]);
    }),status);
  }
  assert.equal(await readProjectStatus('other/repo',1,'PVT_test','fake',async()=>response([item('Ready')])),null);
});
test('project membership is paginated',async()=>{
  let calls=0;
  assert.equal(await readProjectStatus('example/repo',1,'PVT_test','fake',async(url,options)=>{
    calls++;
    if(calls===1) return response([],true,'next');
    assert.equal(JSON.parse(options.body).variables.cursor,'next');
    return response([item('Ready')]);
  }),'Ready');
  assert.equal(calls,2);
});
test('missing credentials and inaccessible projects fail closed',async()=>{
  await assert.rejects(readProjectStatus('example/repo',1,'PVT_test',''));
  await assert.rejects(readProjectStatus('example/repo',1,'PVT_test','fake',async()=>Response.json({errors:[{}]})));
  await assert.rejects(readProjectStatus('example/repo',1,'PVT_test','fake',async()=>new Response('',{status:403})));
  assert.equal(await readProjectStatus('example/repo',1,'PVT_test','fake',async()=>response([])),null);
});
