type GitHubRequest = (path: string, method?: string, body?: unknown) => Promise<any>;

export interface JournalMetadata {
  repository: string;
  issue: number;
  runId: string;
  attempt: string;
  sha: string;
  branch: string;
  output: string;
}

// Only controlled operational facts go here: no model reasoning, prompts or raw API bodies.
export class IssueJournal {
  private readonly entries: string[] = [];
  private commentId?: number;
  private readonly marker: string;

  constructor(private readonly metadata: JournalMetadata, private readonly request: GitHubRequest) {
    this.marker = `<!-- issuepilot:run=${metadata.runId}:attempt=${metadata.attempt} -->`;
  }

  async record(message: string): Promise<boolean> {
    const timestamp = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    this.entries.push(`- **${timestamp} TSİ** — ${message}`);
    try {
      if (!this.commentId) {
        // Reconcile a lost create response before posting again. Never edit human comments.
        for (let page = 1; page <= 100; page++) {
          const comments = await this.request(`issues/${this.metadata.issue}/comments?per_page=100&page=${page}`);
          if (!Array.isArray(comments)) throw new Error('Invalid comment list');
          const existing = comments.find(comment => comment.user?.login === 'github-actions[bot]' &&
            typeof comment.body === 'string' && comment.body.includes(this.marker));
          if (existing) { this.commentId = existing.id; break; }
          if (comments.length < 100) break;
          if (page === 100) throw new Error('Comment pagination limit reached');
        }
      }
      const body = this.render();
      if (this.commentId) {
        await this.request(`issues/comments/${this.commentId}`, 'PATCH', { body });
      } else {
        const comment = await this.request(`issues/${this.metadata.issue}/comments`, 'POST', { body });
        if (!Number.isSafeInteger(comment.id) || comment.id < 1) throw new Error('Invalid comment response');
        this.commentId = comment.id;
      }
      return true;
    } catch {
      console.error('Issue journal could not be updated; see Actions logs. A later update will retry the journal.');
      return false;
    }
  }

  private render(): string {
    const { repository, issue, runId, attempt, sha, branch, output } = this.metadata;
    return `${this.marker}\n### IssuePilot çalışma günlüğü\n\n` +
      `Issue: #${issue} · [Actions çalışması / deneme ${attempt}](https://github.com/${repository}/actions/runs/${runId})\n\n` +
      `Başlangıç: [${sha.slice(0, 7)}](https://github.com/${repository}/commit/${sha})\n\n` +
      `Dal: \`${branch}\` · Çıktı: \`${output}\`\n\n` + this.entries.join('\n') +
      '\n\nBu kayıt uygulamanın doğruladığı işlem adımlarını gösterir. Ayrıntılı komut çıktıları Actions logundadır.\n';
  }
}
