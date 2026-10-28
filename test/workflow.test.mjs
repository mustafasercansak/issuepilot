import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

for (const scenario of ['success','quota','existing-pr','rejected','revoked','backlog','project-error','moved-away']) {
  test(`inventory workflow: ${scenario}`,()=>{
    const root=mkdtempSync(join(tmpdir(),'issuepilot-flow-'));
    try {
      execFileSync('git',['init','--quiet'],{cwd:root});
      mkdirSync(join(root,'.github/workflows'),{recursive:true});
      for(const name of ['README.md','package.json','.github/workflows/ci.yml']) writeFileSync(join(root,name),'Example source');
      execFileSync('git',['add','.'],{cwd:root});
      const preload=join(root,'mock.mjs');
      const log=join(root,'requests.json');
      writeFileSync(preload,`
        import {writeFileSync} from 'node:fs';
        let labels=[{name:'Agent::Allowed'}];
        let projectStatus='Ready';
        const calls=[];
        const scenario=${JSON.stringify(scenario)};
        if(scenario==='rejected') labels.push({name:'Agent::Rejected'});
        process.on('exit',()=>writeFileSync(${JSON.stringify(log)},JSON.stringify(calls)));
        globalThis.fetch=async(url,options={})=>{
          const method=options.method??'GET';
          const body=options.body?JSON.parse(options.body):undefined;
          calls.push({url,method,body});
          const path=new URL(url).pathname;
          if(path==='/graphql') {
            if(scenario==='project-error') return Response.json({errors:[{message:'Forbidden'}]});
            return Response.json({data:{node:{items:{nodes:[{content:{number:1,repository:{nameWithOwner:'example/repo'}},fieldValueByName:{name:scenario==='backlog'?'Backlog':projectStatus}}],pageInfo:{hasNextPage:false,endCursor:null}}}}});
          }
          if(url.includes('generativelanguage')) {
            if(scenario==='quota') return new Response('',{status:429});
            if(scenario==='moved-away') projectStatus='Backlog';
            if(scenario==='revoked') labels.push({name:'Agent::Rejected'});
            return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'# Repository inventory\\n\\nStatic analysis only; commands were not executed. Human review is required for factual accuracy.\\n\\n- Project: [README](../README.md)\\n- Runtime: [package](../package.json)\\n- Guidance: [CI](../.github/workflows/ci.yml)\\n'}]}}]});
          }
          if(path.endsWith('/issues/1') && method==='GET') return Response.json({number:1,title:'Inventory',body:'docs/repository-inventory.md',html_url:'https://github.com/example/repo/issues/1',state:'open',labels});
          if(path.endsWith('/pulls') && method==='GET') return Response.json(scenario==='existing-pr'?[{number:2}]:[]);
          if(path.endsWith('/labels') && method==='POST') { for(const name of body.labels) if(!labels.some(l=>l.name===name)) labels.push({name}); return Response.json(labels); }
          if(path.includes('/labels/') && method==='DELETE') { labels=labels.filter(l=>l.name!==decodeURIComponent(path.split('/labels/')[1])); return new Response(null,{status:204}); }
          if(path.endsWith('/git/refs') && method==='POST') return Response.json({});
          if(path.endsWith('/contents/docs/repository-inventory.md') && method==='PUT') return Response.json({});
          if(path.endsWith('/example/repo/') && method==='GET') return Response.json({default_branch:'main'});
          if(path.endsWith('/pulls') && method==='POST') return Response.json({html_url:'https://github.com/example/repo/pull/2'});
          if(path.endsWith('/comments') && method==='POST') return Response.json({});
          throw new Error('Unexpected request: '+method+' '+url);
        };
      `);
      const result=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,resolve('dist/run-inventory.js')],{
        cwd:root,encoding:'utf8',env:{...process.env,GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'example/repo',ISSUE_NUMBER:'1',INVENTORY_ISSUE_NUMBER:'1',PROJECT_ID:'PVT_example',PROJECT_TOKEN:'project-fake',GH_TOKEN:'fake',GEMINI_API_KEY:'fake',GITHUB_SHA:'a'.repeat(40)}
      });
      const calls=JSON.parse(readFileSync(log,'utf8'));
      if(scenario==='success') {
        assert.equal(result.status,0,result.stderr);
        const writes=calls.filter(c=>c.method==='PUT');
        assert.equal(writes.length,1);
        assert.match(writes[0].url,/contents\/docs\/repository-inventory.md$/);
        assert.equal(calls.filter(c=>c.method==='POST'&&c.url.endsWith('/pulls')).length,1);
        assert.ok(calls.some(c=>c.body?.labels?.includes('Agent::In-Review')));
      } else {
        assert.equal(result.status,2,result.stderr);
        assert.equal(calls.filter(c=>c.method==='PUT').length,0);
        assert.equal(calls.filter(c=>c.method==='POST'&&c.url.endsWith('/pulls')).length,0);
        if(scenario==='quota') {
          assert.ok(calls.some(c=>c.body?.labels?.includes('Agent::Needs-Human')));
          assert.equal(calls.filter(c=>c.url.includes('generativelanguage')).length,1);
        } else if(scenario==='revoked') {
          assert.equal(calls.some(c=>c.body?.labels?.includes('Agent::Needs-Human')),false);
        } else if(scenario==='moved-away') {
          assert.ok(calls.some(c=>c.body?.labels?.includes('Agent::Needs-Human')));
        } else assert.equal(calls.filter(c=>c.method!=='GET' && !c.url.endsWith('/graphql')).length,0);
      }
    } finally {rmSync(root,{recursive:true,force:true});}
  });
}
