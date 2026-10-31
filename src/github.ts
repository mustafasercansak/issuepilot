export interface Issue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  labels: { name: string }[];
  pull_request?: unknown;
}

export function eligibility(issue: Issue): string {
  const labels = new Set(issue.labels.map(label => label.name));
  if (issue.pull_request !== undefined) return "pull-request";
  if (labels.has("Agent::Rejected")) return "rejected";
  if (issue.state !== "open") return "closed";
  if (labels.has("Agent::Working")) return "already-working";
  if (labels.has("Agent::In-Review")) return "in-review";
  return labels.has("Agent::Allowed") ? "eligible" : "not-allowed";
}

export async function readIssue(repository: string, number: number, token?: string,
  request: typeof fetch = fetch): Promise<Issue> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "IssuePilot/0.1",
    "X-GitHub-Api-Version": "2026-03-10",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await request(`https://api.github.com/repos/${repository}/issues/${number}`, {
    headers, signal: AbortSignal.timeout(30_000), redirect: "error",
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  const issue = await response.json() as Issue;
  if (!issue || typeof issue.number !== "number" || typeof issue.title !== "string" ||
    !(issue.body === null || typeof issue.body === "string") ||
    typeof issue.html_url !== "string" || typeof issue.state !== "string" ||
    !Array.isArray(issue.labels) || issue.labels.some(label => !label || typeof label.name !== "string"))
    throw new Error("Invalid GitHub issue response");
  return issue;
}

const maxIssuePages = 10;
// Open issues carrying Agent::Allowed. Pull requests are returned by this endpoint and are dropped.
export async function listAllowedIssues(repository: string, token?: string,
  request: typeof fetch = fetch): Promise<Issue[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "IssuePilot/0.1",
    "X-GitHub-Api-Version": "2026-03-10",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const issues: Issue[] = [];
  for (let page = 1; page <= maxIssuePages; page++) {
    const response = await request(`https://api.github.com/repos/${repository}/issues?state=open&labels=${encodeURIComponent("Agent::Allowed")}&sort=created&direction=asc&per_page=100&page=${page}`, {
      headers, signal: AbortSignal.timeout(30_000), redirect: "error",
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const batch = await response.json() as Issue[];
    if (!Array.isArray(batch) || batch.some(issue => !issue || typeof issue.number !== "number" ||
      typeof issue.title !== "string" || typeof issue.html_url !== "string" || typeof issue.state !== "string" ||
      !Array.isArray(issue.labels) || issue.labels.some(label => !label || typeof label.name !== "string")))
      throw new Error("Invalid GitHub issue list response");
    issues.push(...batch.filter(issue => issue.pull_request === undefined));
    if (batch.length < 100) return issues;
  }
  throw new Error("Issue list pagination limit reached");
}
