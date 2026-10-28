import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
test('repository inputs are rejected before network access',()=>{
  const root=mkdtempSync(join(tmpdir(),'issuepilot-cli-input-'));
  try {
    const log=join(root,'network'),preload=join(root,'mock.mjs');
    writeFileSync(preload,"import {writeFileSync} from 'node:fs';globalThis.fetch=async()=>{writeFileSync("+JSON.stringify(log)+",'called');return Response.json({number:1,title:'fixture',body:null,html_url:'https://github.com/example/repo/issues/1',state:'closed',labels:[]});};");
    const valid=['octocat/Hello-World','org/repo.name','org/.github','org/repo_1','org/repo-1'];
    const invalid=['octocat/.','octocat/..','owner/','/repo','owner/repo/extra','owner/repo name','owner/r?x','owner/r#x','owner/r%2f','own er/repo'];
    for(const value of [...valid,...invalid]) {
      rmSync(log,{force:true});
      const result=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,resolve('dist/cli.js'),'issue',value,'1'],{
        encoding:'utf8',env:{PATH:process.env.PATH},timeout:2000,
      });
      assert.equal(result.error,undefined,'CLI must finish within its deadline');
      if(valid.includes(value)) {
        assert.equal(result.status,1,'Valid input '+value+' must reach the mocked issue');
        assert.equal(JSON.parse(result.stdout).Reason,'closed');
        assert.equal(existsSync(log),true);
      } else {
        assert.equal(existsSync(log),false,'Input '+value+' must not call network');
        assert.equal(result.status,2);
        assert.equal(result.stdout,'');
        assert.match(result.stderr,/Usage:/);
      }
    }
  } finally {rmSync(root,{recursive:true,force:true});}
});
