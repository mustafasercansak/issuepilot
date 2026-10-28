import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const scenarios = ['success','quota','existing-closed-pr','rejected','revoked','backlog','project-error','moved-away',
  'project-write-denied','resume-document','resume-pr','lost-ref-response','lost-document-response','lost-pr-response',
  'lost-review-response','tampered-checkpoint','changed-sources','working-recovery','model-timeout','failed-document-write','working-without-resume','second-task','journal-unavailable'];
for (const scenario of scenarios) {
  test(`inventory workflow: ${scenario}`,()=>{
    const issueNumber=scenario==='second-task'?3:1;
    const root=mkdtempSync(join(tmpdir(),'issuepilot-flow-'));
    try {
      execFileSync('git',['init','--quiet'],{cwd:root});
      mkdirSync(join(root,'.github/workflows'),{recursive:true});
      for(const name of ['README.md','package.json','.github/workflows/ci.yml']) writeFileSync(join(root,name),'Example source');
      execFileSync('git',['add','.'],{cwd:root});
      const preload=join(root,'mock.mjs'), log=join(root,'requests.json');
      const moduleUrl=pathToFileURL(resolve('dist/inventory-checkpoint.js')).href;
      writeFileSync(preload,`
        import {writeFileSync} from 'node:fs';
        import {sourceFingerprint, checkpointMessage} from ${JSON.stringify(moduleUrl)};
        let labels=[{name:'Agent::Allowed'}], projectStatus='Ready';
        const issueNumber=${issueNumber};
        const calls=[], scenario=${JSON.stringify(scenario)}, base='a'.repeat(40), saved='b'.repeat(40);
        const markdown='# Technical summary\\n\\nStatic analysis only; commands were not executed. Human review is required for factual accuracy.\\n\\n- Project: [README](../README.md)\\n- Runtime: [package](../package.json)\\n- CI: [CI](../.github/workflows/ci.yml)\\n';
        let branchExists=['resume-document','resume-pr','tampered-checkpoint','changed-sources','working-recovery'].includes(scenario);
        let documentSaved=branchExists, prExists=scenario==='resume-pr';
        let lost=false, journalComment=null;
        if(['working-recovery','working-without-resume'].includes(scenario)) {labels=[{name:'Agent::Working'}];projectStatus='In progress';}
        if(scenario==='rejected') labels.push({name:'Agent::Rejected'});
        process.on('exit',()=>writeFileSync(${JSON.stringify(log)},JSON.stringify(calls)));
        const pr=()=>({html_url:'https://github.com/example/repo/pull/2',state:scenario==='existing-closed-pr'?'closed':'open',body:'<!-- issuepilot:issue='+issueNumber+' -->'});
        globalThis.fetch=async(url,options={})=>{
          const method=options.method??'GET', body=options.body?JSON.parse(options.body):undefined;
          calls.push({url,method,body});
          const path=new URL(url).pathname;
          if(path==='/graphql') {
            if(body.query.startsWith('mutation')) {
              if(scenario==='project-write-denied') return Response.json({errors:[{}]});
              projectStatus=body.variables.option==='progress'?'In progress':'In review';
              if(scenario==='lost-review-response'&&projectStatus==='In review'&&!lost){lost=true;throw new TypeError('network');}
              return Response.json({data:{updateProjectV2ItemFieldValue:{projectV2Item:{id:'item'}}}});
            }
            if(scenario==='project-error') return Response.json({errors:[{}]});
            return Response.json({data:{node:{items:{nodes:[{id:'item',content:{number:issueNumber,repository:{nameWithOwner:'example/repo'}},fieldValueByName:{name:scenario==='backlog'?'Backlog':projectStatus,field:{id:'status-field',options:[{id:'progress',name:'In progress'},{id:'review',name:'In review'}]}}}],pageInfo:{hasNextPage:false,endCursor:null}}}}});
          }
          if(url.includes('generativelanguage')) {
            if(scenario==='quota') return new Response('',{status:429});
            if(scenario==='model-timeout') throw new TypeError('network');
            if(scenario==='moved-away') projectStatus='Backlog';
            if(scenario==='revoked') labels.push({name:'Agent::Rejected'});
            return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:markdown}]}}]});
          }
          if(path.endsWith('/issues/'+issueNumber+'/comments')) {
            if(scenario==='journal-unavailable') return new Response('',{status:403});
            if(method==='GET')return Response.json(journalComment?[journalComment]:[]);
            journalComment={id:101,body:body.body,user:{login:'github-actions[bot]'}};
            return Response.json(journalComment);
          }
          if(path.endsWith('/issues/comments/101')&&method==='PATCH') {
            journalComment.body=body.body;return Response.json(journalComment);
          }
          if(path.endsWith('/example/repo')&&method==='GET')return Response.json({default_branch:'main'});
          if(path.endsWith('/issues/'+issueNumber)&&method==='GET')return Response.json({number:issueNumber,title:'Inventory',body:'summary',html_url:'https://github.com/example/repo/issues/1',state:'open',labels});
          if(path.endsWith('/pulls')&&method==='GET')return Response.json(prExists||scenario==='existing-closed-pr'?[pr()]:[]);
          if(path.endsWith('/labels')&&method==='POST'){for(const name of body.labels)if(!labels.some(l=>l.name===name))labels.push({name});return Response.json(labels);}
          if(path.includes('/labels/')&&method==='DELETE'){labels=labels.filter(l=>l.name!==decodeURIComponent(path.split('/labels/')[1]));return new Response(null,{status:204});}
          if(path.includes('/git/ref/heads/')&&method==='GET')return branchExists?Response.json({object:{sha:documentSaved?saved:base}}):new Response('',{status:404});
          if(path.endsWith('/git/refs')&&method==='POST'){
            branchExists=true;
            if(scenario==='lost-ref-response'&&!lost){lost=true;throw new TypeError('network');}
            return Response.json({object:{sha:base}});
          }
          if(path.includes('/contents/')&&method==='GET')return documentSaved?Response.json({type:'file',encoding:'base64',size:Buffer.byteLength(markdown),content:Buffer.from(markdown).toString('base64')}):new Response('',{status:404});
          if(path.includes('/contents/')&&method==='PUT'){
            if(scenario==='failed-document-write'&&!lost){lost=true;return new Response('',{status:503});}
            documentSaved=true;
            if(scenario==='lost-document-response'&&!lost){lost=true;throw new TypeError('network');}
            return Response.json({});
          }
          if(path.includes('/commits/')){
            const sources=['.github/workflows/ci.yml','README.md','package.json'].map(path=>({path,content:'Example source'}));
            return Response.json({sha:saved,commit:{message:checkpointMessage(issueNumber,base,scenario==='changed-sources'?'0'.repeat(64):sourceFingerprint({sources,omitted:[]}),'test-model')},parents:[{sha:base}],files:[{filename:scenario==='tampered-checkpoint'?'src/evil.ts':(issueNumber===1?'docs/repository-inventory.md':'docs/technical-summary-'+issueNumber+'.md'),status:'added'}]});
          }
          if(path.includes('/compare/'))return Response.json({status:'identical',merge_base_commit:{sha:base}});
          if(path.endsWith('/pulls')&&method==='POST'){
            prExists=true;
            if(scenario==='lost-pr-response'&&!lost){lost=true;throw new TypeError('network');}
            return Response.json(pr());
          }
          if(path.endsWith('/comments')&&method==='POST')return Response.json({});
          throw new Error('Unexpected request: '+method+' '+url);
        };
      `);
      const result=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,resolve('dist/run-inventory.js')],{
        cwd:root,encoding:'utf8',env:{...process.env,GITHUB_ACTIONS:'true',GITHUB_RUN_ID:'42',GITHUB_RUN_ATTEMPT:'1',GITHUB_REPOSITORY:'example/repo',ISSUE_NUMBER:String(issueNumber),INVENTORY_ISSUE_NUMBER:String(issueNumber),PROJECT_ID:'PVT_example',PROJECT_TOKEN:'project-fake',GH_TOKEN:'fake',GEMINI_API_KEY:scenario.startsWith('resume-')?'':'fake',GITHUB_SHA:'a'.repeat(40),RESUME_WORKING:scenario==='working-recovery'?'true':'false'}
      });
      const calls=JSON.parse(readFileSync(log,'utf8'));
      const modelCalls=calls.filter(c=>c.url.includes('generativelanguage'));
      const creates=calls.filter(c=>c.method==='POST'&&c.url.endsWith('/pulls'));
      const successes=['success','resume-document','resume-pr','lost-ref-response','lost-document-response','lost-pr-response','lost-review-response','working-recovery','failed-document-write','second-task','journal-unavailable'];
      if(successes.includes(scenario)){
        assert.equal(result.status,0,result.stderr);
        if(scenario==='second-task')assert.ok(calls.some(c=>c.method==='PUT'&&c.url.endsWith('/docs/technical-summary-3.md')));
        assert.ok(calls.some(c=>c.body?.labels?.includes('Agent::In-Review')));
        assert.ok(calls.some(c=>c.body?.variables?.option==='review'));
        if(scenario!=='journal-unavailable') {
          assert.equal(calls.filter(c=>c.method==='POST'&&c.url.endsWith('/comments')).length,1);
          const updates=calls.filter(c=>c.method==='PATCH'&&c.url.includes('/issues/comments/'));
          assert.match(updates.at(-1).body.body,/Tamamlandı/);
          assert.match(updates.at(-1).body.body,/https:\/\/github.com\/example\/repo\/pull\/2/);
        }
        assert.equal(creates.length,scenario==='resume-pr'?0:1,'no duplicate PR');
        assert.equal(modelCalls.length,scenario.startsWith('resume-')||scenario==='working-recovery'?0:1,'reuse document without another model call');
        if(modelCalls.length)assert.ok(calls.findIndex(c=>c.body?.variables?.option==='progress')<calls.findIndex(c=>c.url.includes('generativelanguage')));
      }else{
        assert.equal(result.status,2,result.stderr);
        assert.equal(creates.length,0);
        assert.equal(calls.filter(c=>c.method==='PUT').length,0);
        if(['quota','model-timeout'].includes(scenario))assert.equal(modelCalls.length,1);
        if(['tampered-checkpoint','changed-sources','backlog','project-error','project-write-denied','rejected','existing-closed-pr'].includes(scenario))assert.equal(modelCalls.length,0);
        if(scenario==='revoked')assert.equal(calls.some(c=>c.body?.labels?.includes('Agent::Needs-Human')),false);
      }
    }finally{rmSync(root,{recursive:true,force:true});}
  });
}
