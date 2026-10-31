import { eligibility, type Issue } from "./github.js";

export interface QueueEntry { number: number; title: string; url: string }
export interface QueueResult { next: QueueEntry | null; queue: QueueEntry[]; skipped: { number: number; reason: string }[] }

// Oldest eligible issue first. An issue qualifies only with Agent::Allowed and Status = Ready in the
// selected project; a missing card, unknown status or blocking label keeps it out of the queue.
export function buildQueue(issues: Issue[], statuses: ReadonlyMap<number, string | null>): QueueResult {
  const queue: QueueEntry[] = [];
  const skipped: QueueResult['skipped'] = [];
  for (const issue of [...issues].sort((a, b) => a.number - b.number)) {
    let reason = eligibility(issue);
    if (reason === 'eligible' && statuses.get(issue.number) !== 'Ready') reason = 'project-not-ready';
    if (reason === 'eligible') queue.push({ number: issue.number, title: issue.title, url: issue.html_url });
    else skipped.push({ number: issue.number, reason });
  }
  return { next: queue[0] ?? null, queue, skipped };
}
