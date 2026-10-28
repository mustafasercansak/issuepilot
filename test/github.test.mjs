import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibility, readIssue } from '../dist/github.js';
const issue = { number: 1, title: 'Inventory', body: null, html_url: 'https://github.com/example/repo/issues/1', state: 'open', labels: [{name:'Agent::Allowed'}] };
test('human approval and blocking states', () => {
  assert.equal(eligibility(issue), 'eligible');
  assert.equal(eligibility({...issue, labels:[]}), 'not-allowed');
  for (const [label, reason] of [['Rejected','rejected'],['Working','already-working'],['In-Review','in-review']])
    assert.equal(eligibility({...issue, labels:[...issue.labels,{name:`Agent::${label}`}]}),reason);
  assert.equal(eligibility({...issue, state:'closed'}),'closed');
  assert.equal(eligibility({...issue,pull_request:{}}),'pull-request');
  assert.equal(eligibility({...issue,labels:[...issue.labels,{name:'Agent::Needs-Human'}]}),'eligible');
});
test('GitHub request and response', async () => {
  const result = await readIssue('example/repo', 1, 'test-token', async (url, options) => {
    assert.equal(url,'https://api.github.com/repos/example/repo/issues/1');
    assert.equal(options.headers.Authorization,'Bearer test-token');
    return Response.json(issue);
  });
  assert.deepEqual(result, issue);
});
test('API errors and malformed responses fail', async () => {
  await assert.rejects(readIssue('example/repo',1,undefined,async()=> new Response('',{status:403})));
  await assert.rejects(readIssue('example/repo',1,undefined,async()=> Response.json({})));
});
