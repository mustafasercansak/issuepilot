import { createHash } from 'node:crypto';
import type { InventoryContext } from './inventory-context.js';

export function sourceFingerprint(context: InventoryContext): string {
  return createHash('sha256').update(JSON.stringify(context.sources)).digest('hex');
}

export function checkpointMessage(number: number, base: string, fingerprint: string, model: string, title = 'technical summary'): string {
  return `docs: ${title} for #${number}\n\nIssuePilot-Issue: ${number}\nIssuePilot-Base: ${base}\nIssuePilot-Source: ${fingerprint}\nIssuePilot-Model: ${model}`;
}

export interface CheckpointCommit {
  sha: string;
  commit: { message: string };
  parents: { sha: string }[];
  files: { filename: string; status: string }[];
}

export function validateCheckpoint(commit: CheckpointCommit, number: number, output: string, fingerprint: string, change: 'added' | 'modified' = 'added', extras: string[] = []): string {
  const message = commit.commit?.message ?? '';
  const base = message.match(/^IssuePilot-Base: ([a-f0-9]{40})$/m)?.[1];
  if (!message.split('\n').includes(`IssuePilot-Issue: ${number}`) ||
      !message.split('\n').includes(`IssuePilot-Source: ${fingerprint}`) ||
      !base || commit.parents?.length !== 1 || commit.parents[0]?.sha !== base ||
      commit.files?.length !== 1 + extras.length ||
      commit.files.filter(file => file.filename === output && file.status === change).length !== 1 ||
      extras.some(path => commit.files.filter(file => file.filename === path && file.status === 'added').length !== 1))
    throw new Error('Inventory checkpoint is unrecognized, changed or based on different source content');
  return base;
}
