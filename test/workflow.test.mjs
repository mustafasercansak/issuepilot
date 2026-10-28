import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const scenarios = ['success','quota','existing-closed-pr','rejected','revoked','backlog','project-error','moved-away',
  'project-write-denied','resume-document','resume-pr','lost-ref-response','lost-document-response','lost-pr-response',
  'lost-review-response','tampered-checkpoint','changed-sources','working-recovery','model-timeout','failed-document-write','working-without-resume','second-task','journal-unavailable','readme-task','code-task','lost-code-commit-response'];
for (const scenario of scenarios) {
  test(`inventory workflow: ${scenario}`,()=>{
    const codeTask=['code-task','lost-code-commit-response'].includes(scenario);
    const legacy=readFileSync(new URL('./fixtures/cli-before-dot-fix.ts',import.meta.url),'utf8');
    const issueNumber=codeTask?7:scenario==='readme-task'?5:scenario==='second-task'?3:1;
    const root=mkdtempSync(join(tmpdir(),'issuepilot-flow-'));
    try {
      execFileSync('git',['init','--quiet'],{cwd:root});
      mkdirSync(join(root,'.github/workflows'),{recursive:true});
      for(const name of ['README.md','package.json','.github/workflows/ci.yml']) writeFileSync(join(root,name),'Example source');
      if(scenario==='readme-task') {
        mkdirSync(join(root,'docs'),{recursive:true});
        writeFileSync(join(root,'README.md'),'# Existing README\n');
        for(const name of ['ai-workflow.md','ready-gate.md','label-protocol.md','issue-journal.md'])writeFileSync(join(root,'docs',name),'source');
        writeFileSync(join(root,'.github/workflows/issue-intake.yml'),'source');
      }
      if(codeTask) {
        mkdirSync(join(root,'src'));mkdirSync(join(root,'dist'));
        writeFileSync(join(root,'package.json'),'{"type":"module"}');
        writeFileSync(join(root,'src/cli.ts'),legacy);
        writeFileSync(join(root,'dist/cli.js'),stripTypeScriptTypes(legacy));
        for(const name of ['github.js','projects.js'])copyFileSync(resolve('dist',name),join(root,'dist',name));
      }
      execFileSync('git',['add','.'],{cwd:root});
      const preload=join(root,'mock.mjs'), log=join(root,'requests.json');
      const moduleUrl=pathToFileURL(resolve('dist/inventory-checkpoint.js')).href;
      writeFileSync(preload,`
        import {writeFileSync} from 'node:fs';
        import {sourceFingerprint, checkpointMessage} from ${JSON.stringify(moduleUrl)};
        let labels=[{name:'Agent::Allowed'}], projectStatus='Ready';
        const issueNumber=${issueNumber},codeTask=${codeTask},legacy=${JSON.stringify(legacy)};
        const calls=[], scenario=${JSON.stringify(scenario)}, base='a'.repeat(40), saved='b'.repeat(40);
        const markdown='# Technical summary\\n\\nStatic analysis only; commands were not executed. Human review is required for factual accuracy.\\n\\n- Project: [README](../README.md)\\n- Runtime: [package](../package.json)\\n- CI: [CI](../.github/workflows/ci.yml)\\n';
        let branchExists=['resume-document','resume-pr','tampered-checkpoint','changed-sources','working-recovery'].includes(scenario);
        let documentSaved=branchExists, prExists=scenario==='resume-pr';
        let lost=false, journalComment=null,treeFiles=[],commitMessage;
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
            const text=codeTask?JSON.stringify({pattern:${JSON.stringify(String.raw`^[A-Za-z0-9_-]+\/(?!\.{1,2}$)[A-Za-z0-9_.-]+$`)}}):scenario==='readme-task'?'## GitHub Actions ile ilk görev\\n\\nNode.js 24 gerekir. npm ci ve npm run build ile kurun. GEMINI_API_KEY ve PROJECT_TOKEN secret adlarıdır. PROJECT_ID panoyu, INVENTORY_ISSUE_NUMBER görevi seçer; INVENTORY_AI_ENABLED ve PROJECT_POLLING_ENABLED etkinleştirir. Ready + Agent::Allowed gerekir; In progress sonra In review olur. Etiket hemen, tarama 30 dakikada bir çalışır. Bu yapılandırılmış tek görevdir; genel kuyruk değildir. [AI](docs/ai-workflow.md), [Ready](docs/ready-gate.md), [Günlük](docs/issue-journal.md).':markdown;
            return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text}]}}]});
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
          if(path.includes('/contents/')&&method==='GET'&&codeTask) {
            const file=treeFiles.find(file=>path.endsWith('/contents/'+file.path));
            if(file)return Response.json({type:'file',encoding:'base64',size:Buffer.byteLength(file.content),content:Buffer.from(file.content).toString('base64')});
            if(path.endsWith('/contents/src/cli.ts'))return Response.json({type:'file',encoding:'base64',sha:'c'.repeat(40),content:Buffer.from(legacy).toString('base64')});
            return new Response('',{status:404});
          }
          if(path.endsWith('/git/trees')&&method==='POST'){treeFiles=body.tree;return Response.json({sha:'e'.repeat(40)});}
          if(path.endsWith('/git/commits')&&method==='POST'){commitMessage=body.message;return Response.json({sha:saved});}
          if(path.includes('/git/refs/heads/')&&method==='PATCH') {
            documentSaved=true;
            if(scenario==='lost-code-commit-response'&&!lost){lost=true;throw new TypeError('network');}
            return Response.json({object:{sha:saved}});
          }
          if(path.includes('/git/commits/')&&method==='GET')return Response.json({tree:{sha:'c'.repeat(40)}});
          if(path.includes('/commits/')&&codeTask)return Response.json({sha:saved,commit:{message:commitMessage},parents:[{sha:base}],files:[{filename:'src/cli.ts',status:'modified'},{filename:'test/cli-repository-regression.test.mjs',status:'added'}]});
          if(path.includes('/contents/')&&method==='GET'&&scenario==='readme-task'&&!documentSaved)return Response.json({type:'file',encoding:'base64',sha:'c'.repeat(40),content:Buffer.from('# Existing README\\n').toString('base64')});
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
        cwd:root,encoding:'utf8',env:{...process.env,GITHUB_ACTIONS:'true',GITHUB_RUN_ID:'42',GITHUB_RUN_ATTEMPT:'1',GITHUB_REPOSITORY:'example/repo',ISSUE_NUMBER:String(issueNumber),INVENTORY_ISSUE_NUMBER:String(issueNumber),PROJECT_ID:'PVT_example',PROJECT_TOKEN:'project-fake',GH_TOKEN:'fake',INVENTORY_TASK_KIND:codeTask?'cli-repository':scenario==='readme-task'?'readme-setup':'summary',GEMINI_API_KEY:scenario.startsWith('resume-')?'':'fake',GITHUB_SHA:'a'.repeat(40),RESUME_WORKING:scenario==='working-recovery'?'true':'false'}
      });
      const calls=JSON.parse(readFileSync(log,'utf8'));
      const modelCalls=calls.filter(c=>c.url.includes('generativelanguage'));
      const creates=calls.filter(c=>c.method==='POST'&&c.url.endsWith('/pulls'));
      const successes=['success','resume-document','resume-pr','lost-ref-response','lost-document-response','lost-pr-response','lost-review-response','working-recovery','failed-document-write','second-task','journal-unavailable','readme-task','code-task','lost-code-commit-response'];
      if(successes.includes(scenario)){
        assert.equal(result.status,0,result.stderr);
        if(codeTask) {
          const trees=calls.filter(c=>c.url.endsWith('/git/trees')&&c.method==='POST');
          assert.equal(trees.length,1);
          assert.deepEqual(trees[0].body.tree.map(file=>file.path),['src/cli.ts','test/cli-repository-regression.test.mjs']);
          assert.equal(calls.filter(c=>c.method==='PUT').length,0);
        }
        if(scenario==='readme-task') {
          const write=calls.find(c=>c.method==='PUT');
          assert.ok(write.url.endsWith('/contents/README.md'));
          assert.equal(write.body.sha,'c'.repeat(40));
          assert.ok(Buffer.from(write.body.content,'base64').toString('utf8').startsWith('# Existing README\n'));
        }
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
