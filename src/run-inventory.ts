import { collectInventoryContext, inventoryPrompt, pilotInventoryContext } from './inventory-context.js';
import { generateInventory, defaultModel } from './gemini.js';
import { eligibility, readIssue } from './github.js';
import { normalizeInventoryLinks, validateInventoryDocument } from './inventory-document.js';
import { readProjectStatus, setProjectStatus, confirmProjectStatus } from './projects.js';
import { IssueJournal } from './issue-journal.js';
import { sourceFingerprint, checkpointMessage, validateCheckpoint } from './inventory-checkpoint.js';

const repository = process.env.GITHUB_REPOSITORY ?? '';
const number = Number(process.env.ISSUE_NUMBER);
const approved = Number(process.env.INVENTORY_ISSUE_NUMBER);
const token = process.env.GH_TOKEN ?? '';
const projectId = process.env.PROJECT_ID ?? '';
const projectToken = process.env.PROJECT_TOKEN ?? '';
const apiKey = process.env.GEMINI_API_KEY ?? '';
const sha = process.env.GITHUB_SHA ?? '';
const model = process.env.GEMINI_MODEL || defaultModel;
const branch = `issuepilot/inventory-${number}`;
const output = number === 1 ? 'docs/repository-inventory.md' : `docs/technical-summary-${number}.md`;
const marker = `<!-- issuepilot:issue=${number} -->`;
let journal: IssueJournal | undefined;
let claimed = false;
let pendingMarkdown: string | undefined;

class GitHubFailure extends Error {
  constructor(readonly status: number) { super(`GitHub HTTP ${status}`); }
}
function transient(error: unknown): boolean {
  return error instanceof GitHubFailure ? error.status >= 500 :
    error instanceof TypeError || (error instanceof Error && ['TimeoutError','AbortError'].includes(error.name));
}
async function github(path: string, method = 'GET', body?: unknown, optional = false): Promise<any> {
  const response = await fetch(`https://api.github.com/repos/${repository}${path ? '/' + path : ''}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
      'User-Agent': 'IssuePilot/0.1', 'X-GitHub-Api-Version': '2026-03-10', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (optional && response.status === 404) return null;
  if (!response.ok) throw new GitHubFailure(response.status);
  return response.status === 204 ? null : response.json();
}
async function transition(add: string, remove: string[]): Promise<void> {
  await github(`issues/${number}/labels`, 'POST', { labels: [add] });
  const issue = await readIssue(repository, number, token);
  for (const label of remove.filter(label => issue.labels.some(item => item.name === label)))
    await github(`issues/${number}/labels/${encodeURIComponent(label)}`, 'DELETE');
}
async function active(allowReview = false): Promise<string> {
  const issue = await readIssue(repository, number, token);
  const labels = issue.labels.map(label => label.name);
  if (issue.state !== 'open' || labels.includes('Agent::Rejected') ||
      !labels.some(label => label === 'Agent::Working' || (allowReview && label === 'Agent::In-Review')))
    throw new Error('Issue authorization changed; stopped before publishing');
  const status = await readProjectStatus(repository, number, projectId, projectToken);
  if (status !== 'In progress' && !(allowReview && status === 'In review'))
    throw new Error('Issue board status changed; stopped before publishing');
  return status;
}

try {
  if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !Number.isSafeInteger(number) || number < 1 ||
      number !== approved || !/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid or unsupported inventory task configuration');
  if (!token) throw new Error('GH_TOKEN is missing');
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Run this task via the inventory workflow');
  const context = pilotInventoryContext(collectInventoryContext(process.cwd()));
  const fingerprint = sourceFingerprint(context);
  const repo = await github(''); // Fail before spending model quota if repo metadata is unavailable.
  const issue = await readIssue(repository, number, token);
  const reason = eligibility(issue);
  const manualResume = process.env.RESUME_WORKING === 'true' && ['already-working', 'in-review'].includes(reason);
  if (reason !== 'eligible' && !manualResume) throw new Error(`Issue is not eligible: ${reason}`);
  journal = new IssueJournal({ repository, issue: number,
    runId: process.env.GITHUB_RUN_ID ?? 'unknown', attempt: process.env.GITHUB_RUN_ATTEMPT ?? '1',
    sha, branch, output }, github);
  await journal.record(manualResume ? 'Kurtarma kontrolleri başlatıldı; mevcut dal ve PR incelenecek.' : 'Görev kontrolleri başlatıldı; Ready ve yetkilendirme doğrulanacak.');
  if (manualResume) {
    await active(true);
    claimed = true;
  } else {
    if (await readProjectStatus(repository, number, projectId, projectToken) !== 'Ready')
      throw new Error('Issue is not Ready in the configured project');
    await setProjectStatus(repository, number, projectId, projectToken, 'Ready', 'In progress');
    claimed = true;
    await transition('Agent::Working', ['Agent::Allowed', 'Agent::Needs-Human']);
  }

  await journal.record(manualResume ? 'Yetki ve pano durumu doğrulandı; kurtarmaya devam ediliyor.' : 'Görev alındı: pano In progress, etiket Agent::Working.');

  await journal.record(`Kaynaklar: ${context.sources.map(source => source.path).join(', ')}. Kaynak parmak izi: ${fingerprint}.`);

  // Reconcile durable remote state after one transient failure; never blindly repeat writes.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const pulls = await github(`pulls?state=all&head=${encodeURIComponent(repository.split('/')[0] + ':' + branch)}&per_page=100`);
      if (pulls.length > 1 || (pulls[0] && (pulls[0].state !== 'open' || !pulls[0].body?.includes(marker))))
        throw new Error('Inventory PR is closed or unrecognized; automatic replacement is disabled');
      let pr = pulls[0];
      await active(Boolean(pr));
      let ref = await github(`git/ref/heads/${branch}`, 'GET', undefined, true);
      if (!ref) {
        if (pr) throw new Error('Inventory PR branch is missing');
        await active();
        ref = await github('git/refs', 'POST', { ref: `refs/heads/${branch}`, sha });
      }
      if (!/^[a-f0-9]{40}$/.test(ref?.object?.sha ?? '')) throw new Error('Inventory branch response is invalid');
      const head = ref.object.sha;
      let file = await github(`contents/${output}?ref=${head}`, 'GET', undefined, true);
      if (file) {
        const commit = await github(`commits/${head}`);
        const base = validateCheckpoint(commit, number, output, fingerprint);
        const ancestry = await github(`compare/${base}...${sha}`);
        if (!['ahead', 'identical'].includes(ancestry.status) || ancestry.merge_base_commit?.sha !== base)
          throw new Error('Inventory checkpoint base is not an ancestor of the workflow revision');
        if (file.type !== 'file' || file.encoding !== 'base64' || file.size > 64_000)
          throw new Error('Inventory checkpoint content is invalid');
        validateInventoryDocument(Buffer.from(file.content, 'base64').toString('utf8'), context);
        console.log('Reusing validated document checkpoint; no model call.');
        await journal.record('Kaydedilmiş belge, kaynak parmak izi, başlangıç commit’i ve kaynak bağlantıları doğrulandı. AI tekrar çağrılmadı.');
      } else {
        if (pr || head !== sha) throw new Error('Inventory branch has unexpected changes or no reusable checkpoint');
        if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
        await active();
        if (!pendingMarkdown) {
          await journal.record(`Üç kaynak dosyadan Gemini ile kısa teknik özet üretiliyor. İstek modeli: ${/^gemini-[a-zA-Z0-9.-]+$/.test(model) ? model : 'geçersiz model ayarı'}.`);
          let generated: string;
          try { generated = await generateInventory(inventoryPrompt(context), apiKey, model); }
          catch (error) {
            throw new Error(error instanceof Error && error.message.startsWith('Gemini ') ? error.message : 'Gemini request failed; model calls are not automatically retried');
          }
          pendingMarkdown = normalizeInventoryLinks(generated, context);
        }
        const markdown = pendingMarkdown;
        validateInventoryDocument(markdown, context);
        await journal.record('Belge üretildi; Markdown biçimi/boyutu ve kaynak bağlantısı kontrolleri geçti. Model komut çalıştırmadı.');
        await active();
        // A branch changed by another actor must not receive our generated document.
        const latest = await github(`git/ref/heads/${branch}`);
        if (latest.object?.sha !== head) throw new Error('Inventory branch changed during generation');
        await github(`contents/${output}`, 'PUT', {
          message: checkpointMessage(number, sha, fingerprint, model),
          content: Buffer.from(markdown + '\n').toString('base64'), branch,
        });
        await journal.record('Doğrulanmış belge görev dalına kaydedildi.');
      }
      if (!pr) {
        await active();
        pr = await github('pulls', 'POST', {
          title: `docs: technical summary (#${number})`, head: branch, base: repo.default_branch,
          body: `${marker}\nCloses #${number}\n\nAI-generated technical summary. Only \`${output}\` changes.\n\n` +
            `Checks: Markdown format/size and source links validated. Static analysis; the model executed no commands.\n\n` +
            `Sources: ${context.sources.length}. A durable checkpoint is reused on recovery when source content is unchanged.\n\n` +
            `Human review is required for factual accuracy. No automatic merge.`,
        });
      }
      await journal.record(`PR hazır: ${pr.html_url}. Yalnızca görev belgesi değiştirildi; insan incelemesi gerekiyor.`);
      await active(true);
      // Update issue labels before the final board transition, then verify actual board state.
      await transition('Agent::In-Review', ['Agent::Working', 'Agent::Allowed', 'Agent::Needs-Human']);
      await active(true);
      await confirmProjectStatus(repository, number, projectId, projectToken, 'In progress', 'In review');
      await journal.record('Tamamlandı: pano In review ve etiket Agent::In-Review doğrulandı. Otomatik merge yapılmadı.');
      console.log(`PR ready: ${pr.html_url}`);
      break;
    } catch (error) {
      if (attempt === 0 && transient(error)) {
        console.log('Transient GitHub/network failure; reconciling saved state once.');
        await journal.record('Geçici GitHub/ağ hatası alındı. Uzak durum yeniden okunarak bir kez kurtarma deneniyor.');
        continue;
      }
      throw error;
    }
  }
} catch (error) {
  const message = error instanceof Error && /^(GitHub HTTP|Gemini |Inventory |Issue |Invalid |Project |GH_TOKEN|GEMINI_API_KEY|Run this)/.test(error.message)
    ? error.message : 'Inventory failed (network, timeout or unexpected response)';
  console.error(message);
  if (journal) await journal.record(`İşlem durdu: ${message}. Kaydedilmiş dal/belge/PR korunur. Sorun giderilince kart Ready yapılıp Allowed eklenebilir.`);
  if (claimed) {
    try {
      const latest = await readIssue(repository, number, token);
      if (latest.labels.some(label => label.name === 'Agent::Rejected')) {
        for (const label of latest.labels.filter(label => ['Agent::Working', 'Agent::Allowed'].includes(label.name)))
          await github(`issues/${number}/labels/${encodeURIComponent(label.name)}`, 'DELETE');
      } else {
        await transition('Agent::Needs-Human', ['Agent::Working', 'Agent::Allowed', 'Agent::In-Review']);
      }

    } catch { console.error('Could not update issue status; inspect workflow and labels manually.'); }
  }
  process.exitCode = 2;
}
