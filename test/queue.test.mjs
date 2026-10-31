import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQueue } from '../dist/queue.js';
import { listAllowedIssues } from '../dist/github.js';
import { readProjectStatuses } from '../dist/projects.js';
const issue = (number, ...labels) => ({ number, title: `Issue ${number}`, body: null, html_url: `https://github.com/example/repo/issues/${number}`, state: 'open', labels: labels.map(name => ({ name })) });
const allowed = 'Agent::Allowed';

test('queue takes the oldest Allowed + Ready issue and explains every skip', () => {
  const issues = [issue(9, allowed), issue(2, allowed), issue(4, allowed, 'Agent::Rejected'), issue(5, allowed, 'Agent::Working'), issue(6, allowed), issue(7, allowed), issue(3, 'bug')];
  const statuses = new Map([[9, 'Ready'], [2, 'Ready'], [4, 'Ready'], [5, 'In progress'], [6, 'Backlog'], [3, 'Ready']]);
  const result = buildQueue(issues, statuses);
  assert.deepEqual(result.queue.map(item => item.number), [2, 9]);
  assert.equal(result.next.number, 2);
  assert.deepEqual(result.skipped, [
    { number: 3, reason: 'not-allowed' }, { number: 4, reason: 'rejected' }, { number: 5, reason: 'already-working' },
    { number: 6, reason: 'project-not-ready' }, { number: 7, reason: 'project-not-ready' }]);
});

test('empty queue has no next issue', () => {
  assert.deepEqual(buildQueue([], new Map()), { next: null, queue: [], skipped: [] });
});

test('issue listing filters pull requests and paginates', async () => {
  const pages = [];
  const full = Array.from({ length: 100 }, (_, index) => issue(index + 1, allowed));
  const result = await listAllowedIssues('example/repo', 'tok', async url => {
    pages.push(url);
    return Response.json(pages.length === 1 ? [{ ...full[0], pull_request: {} }, ...full.slice(1)] : [issue(101, allowed)]);
  });
  assert.equal(pages.length, 2);
  assert.match(pages[0], /labels=Agent%3A%3AAllowed&state|state=open&labels=Agent%3A%3AAllowed/);
  assert.equal(result.length, 100);
  assert.equal(result.some(item => item.number === 1), false);
  await assert.rejects(listAllowedIssues('example/repo', undefined, async () => new Response('', { status: 403 })));
  await assert.rejects(listAllowedIssues('example/repo', undefined, async () => Response.json({})));
});

test('project statuses are scoped to the repository and fail closed', async () => {
  const node = (repo, number, status) => ({ content: { number, repository: { nameWithOwner: repo } }, fieldValueByName: status ? { name: status } : null });
  const respond = nodes => Response.json({ data: { node: { items: { nodes, pageInfo: { hasNextPage: false, endCursor: null } } } } });
  const statuses = await readProjectStatuses('Example/Repo', 'PVT_test', 'fake', async () =>
    respond([node('example/repo', 1, 'Ready'), node('other/repo', 2, 'Ready'), node('example/repo', 3, null), { content: null }, null]));
  assert.deepEqual([...statuses], [[1, 'Ready'], [3, null]]);
  await assert.rejects(readProjectStatuses('example/repo', 'PVT_test', ''));
  await assert.rejects(readProjectStatuses('example/repo', 'PVT_test', 'fake', async () => Response.json({ errors: [{}] })));
});
