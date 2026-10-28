import test from 'node:test';
import assert from 'node:assert/strict';
import { readProjectStatus, setProjectStatus } from '../dist/projects.js';
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

test('unreadable issue content is an access failure, not a missing Ready card',async()=>{
  await assert.rejects(readProjectStatus('example/repo',1,'PVT_test','fake',async()=>response([{content:null,fieldValueByName:{name:'Ready'}}])),/repository permissions/);
});

test('board transition uses selected item and option IDs and checks mutation result', async()=>{
  const projectItem = {...item('Ready'),id:'item',fieldValueByName:{name:'Ready',field:{id:'field',options:[{id:'progress',name:'In progress'}]}}};
  let mutations=0;
  await setProjectStatus('example/repo',1,'PVT_test','fake','Ready','In progress',async(url,options)=>{
    const body=JSON.parse(options.body);
    if(!body.query.startsWith('mutation')) return response([projectItem]);
    mutations++;
    assert.deepEqual(body.variables,{project:'PVT_test',item:'item',field:'field',option:'progress'});
    return Response.json({data:{updateProjectV2ItemFieldValue:{projectV2Item:{id:'item'}}}});
  });
  assert.equal(mutations,1);
  await assert.rejects(setProjectStatus('example/repo',1,'PVT_test','fake','Backlog','In progress',async()=>response([projectItem])),/status changed/);
  await assert.rejects(setProjectStatus('example/repo',1,'PVT_test','fake','Ready','In progress',async(url,options)=>JSON.parse(options.body).query.startsWith('mutation')?Response.json({errors:[{}]}):response([projectItem])),/write permission/);
});
