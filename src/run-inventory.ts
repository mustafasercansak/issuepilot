import { collectInventoryContext, inventoryPrompt, pilotInventoryContext } from './inventory-context.js';
import { generateInventory, defaultModel } from './gemini.js';
import { eligibility, readIssue } from './github.js';
import { normalizeInventoryLinks, validateInventoryDocument } from './inventory-document.js';

// Fixed inventory task only: model output is never a path, a command or GitHub API arguments.
const repository = process.env.GITHUB_REPOSITORY ?? '';
const number = Number(process.env.ISSUE_NUMBER);
const approved = Number(process.env.INVENTORY_ISSUE_NUMBER);
const token = process.env.GH_TOKEN ?? '';
const apiKey = process.env.GEMINI_API_KEY ?? '';
const sha = process.env.GITHUB_SHA ?? '';
const model = process.env.GEMINI_MODEL || defaultModel;
const branch = `issuepilot/inventory-${number}`;
const output = 'docs/repository-inventory.md';
let claimed = false;

async function github(path: string, method = 'GET', body?: unknown): Promise<any> {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
      'User-Agent': 'IssuePilot/0.1', 'X-GitHub-Api-Version': '2026-03-10',
      'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status} (${method} ${path.split('?')[0]})`);
  return response.status === 204 ? null : response.json();
}

async function transition(add: string, remove: string[]): Promise<void> {
  // Add first: a failed removal must never leave an unclaimed Allowed issue.
  await github(`issues/${number}/labels`, 'POST', { labels: [add] });
  const issue = await readIssue(repository, number, token);
  for (const label of remove.filter(label => issue.labels.some(item => item.name === label)))
    await github(`issues/${number}/labels/${encodeURIComponent(label)}`, 'DELETE');
}

async function stillWorking(): Promise<void> {
  const issue = await readIssue(repository, number, token);
  const labels = issue.labels.map(label => label.name);
  if (issue.state !== 'open' || labels.includes('Agent::Rejected') || !labels.includes('Agent::Working'))
    throw new Error('Issue authorization changed; stopped before publishing');
}

try {
  if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !Number.isSafeInteger(number) || number < 1 ||
    number !== approved || !/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid or unsupported inventory task configuration');
  if (!token || !apiKey) throw new Error('GH_TOKEN or GEMINI_API_KEY is missing');
  const issue = await readIssue(repository, number, token);
  const reason = eligibility(issue);
  if (reason !== 'eligible') throw new Error(`Issue is not eligible: ${reason}`);
  const pulls = await github(`pulls?state=all&head=${encodeURIComponent(repository.split('/')[0] + ':' + branch)}&per_page=100`);
  if (pulls.length > 0) throw new Error('This task already has a PR; automatic duplicate/revision runs are disabled');
  const context = pilotInventoryContext(collectInventoryContext(process.cwd()));
  if (!context.sources.length) throw new Error('No inventory sources available');
  // Only the Actions workflow concurrency group provides mutual exclusion.
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Run this task via the inventory workflow');
  claimed = true;
  await transition('Agent::Working', ['Agent::Allowed', 'Agent::Needs-Human']);
  const markdown = normalizeInventoryLinks(await generateInventory(inventoryPrompt(context), apiKey, model), context);
  validateInventoryDocument(markdown, context);
  await stillWorking();
  // Existing orphan branches are not overwritten. A human must inspect/recover them.
  await github('git/refs', 'POST', { ref: `refs/heads/${branch}`, sha });
  await github(`contents/${output}`, 'PUT', {
    message: `docs: repository inventory for #${number}`,
    content: Buffer.from(markdown + '\n').toString('base64'), branch,
  });
  await stillWorking();
  const repo = await github('');
  const pr = await github('pulls', 'POST', {
    title: `docs: repository inventory (#${number})`, head: branch, base: repo.default_branch,
    body: `Closes #${number}\n\nAI-generated repository inventory using Gemini (${model}).\n\n` +
      `Only \`${output}\` changes. Static source analysis; the model ran no commands.\n\n` +
      `Checks: Markdown size/format and supplied-source link validation passed. These checks do not prove factual correctness.\n\n` +
      `Sources: ${context.sources.length}; omitted by size/type: ${context.omitted.length}.\n\nHuman review is required; no automatic merge.`,
  });
  await transition('Agent::In-Review', ['Agent::Working', 'Agent::Allowed', 'Agent::Needs-Human']);
  console.log(`Created PR: ${pr.html_url}`);
} catch (error) {
  // Error messages are controlled; provider bodies, prompts and credentials are never logged.
  const message = error instanceof Error && /^(GitHub HTTP|Gemini |Inventory |Issue |This task|No inventory|Invalid |GH_TOKEN|Run this)/.test(error.message)
    ? error.message : 'Inventory failed (network, timeout or unexpected response)';
  console.error(message);
  if (claimed) {
    try {
      const latest = await readIssue(repository, number, token);
      if (latest.labels.some(label => label.name === 'Agent::Rejected')) {
        for (const label of latest.labels.filter(label => ['Agent::Working', 'Agent::Allowed'].includes(label.name)))
          await github(`issues/${number}/labels/${encodeURIComponent(label.name)}`, 'DELETE');
      } else {
        await transition('Agent::Needs-Human', ['Agent::Working', 'Agent::Allowed']);
      }
      await github(`issues/${number}/comments`, 'POST', {
        body: `IssuePilot stopped: ${message}.\n\nInspect any inventory branch/PR before retrying. A human can add Agent::Allowed after resolving the problem.`,
      });
    } catch { console.error('Could not update issue status; inspect the workflow and labels manually.'); }
  }
  process.exitCode = 2;
}
