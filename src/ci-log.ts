export type FailureCategory = 'permissions' | 'dependency' | 'build' | 'test' | 'timeout' | 'infrastructure' | 'unknown';
export interface LogClassification {
  category: FailureCategory;
  matched: FailureCategory[];
  retryable: boolean;
  evidence: string[];
}

const maxLogBytes = 5_000_000;
const maxEvidenceLines = 5;
const maxLineLength = 200;

// First match wins; more specific, code-pointing causes come before transient ones.
const rules: { category: Exclude<FailureCategory, 'unknown'>; pattern: RegExp }[] = [
  { category: 'permissions', pattern: /Resource not accessible by integration|Permission denied|\bEACCES\b|HTTP 403\b|\b403 Forbidden\b/i },
  { category: 'dependency', pattern: /npm (?:ERR!|error) (?:code )?(?:E404|ERESOLVE|ETARGET|EINTEGRITY)\b|Could not resolve dependency|No matching version found/ },
  { category: 'build', pattern: /\berror TS\d+:|SyntaxError:|Cannot find module|Process completed with exit code 2\b.*tsc/ },
  { category: 'test', pattern: /^\s*✖ |^\s*not ok \d+|^\s*ℹ fail [1-9]\d*\b|\bAssertionError\b|\b[1-9]\d* failing\b|\bTests?:\s+[1-9]\d* failed/ },
  { category: 'timeout', pattern: /exceeded the maximum execution time|The operation was canceled|\bTimeout of \d+\s?ms exceeded|\btimed out after\b/i },
  { category: 'infrastructure', pattern: /\bECONNRESET\b|\bETIMEDOUT\b|\bEAI_AGAIN\b|\bSocket hang up\b|HTTP (?:502|503|504)\b|\b(?:502|503|504) (?:Bad Gateway|Service Unavailable|Gateway Time-?out)\b|rate limit exceeded|The hosted runner lost communication/i },
];
const retryable = new Set<FailureCategory>(['timeout', 'infrastructure']);

const redactions: RegExp[] = [
  /\b(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+\/=-]{8,}/gi,
  /\b((?:api[_-]?key|token|secret|password|passwd)\s*[=:]\s*)\S+/gi,
];

function redact(line: string): string {
  let result = line;
  for (const pattern of redactions) result = result.replace(pattern, (_, prefix) => typeof prefix === 'string' ? `${prefix}[redacted]` : '[redacted]');
  return result;
}

function clean(line: string): string {
  return line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s?/, '').trimEnd();
}

// Local heuristic over log text the caller already has. It never fetches logs, and evidence lines
// are shortened and scrubbed of common credential shapes; it is not a general secret scanner.
export function classifyLog(text: string): LogClassification {
  if (Buffer.byteLength(text) > maxLogBytes) throw new Error('Log is too large to classify');
  const lines = text.split(/\r?\n/).map(clean);
  const matched: FailureCategory[] = [];
  const evidence: string[] = [];
  for (const rule of rules) {
    const hits = lines.filter(line => rule.pattern.test(line));
    if (hits.length === 0) continue;
    matched.push(rule.category);
    if (matched.length === 1)
      evidence.push(...hits.slice(0, maxEvidenceLines).map(line => redact(line).slice(0, maxLineLength)));
  }
  const category = matched[0] ?? 'unknown';
  return { category, matched, retryable: retryable.has(category), evidence };
}
