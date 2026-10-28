import { posix } from 'node:path';
import type { InventoryContext } from './inventory-context.js';

// Repair only unambiguous links to known supplied files. Unknown paths still fail validation.
export function normalizeInventoryLinks(markdown: string, context: InventoryContext): string {
  const paths = new Set(context.sources.map(source => source.path));
  return markdown.replace(/(\[[^\]\n]+\]\()([^\s)]+)(\))/g, (match, prefix, target, suffix) => {
    const [path, ...fragment] = (target as string).split('#');
    const candidate = path!.startsWith('./') ? path!.slice(2) : path!;
    if (!paths.has(candidate)) return match;
    return `${prefix}../${candidate}${fragment.length ? '#' + fragment.join('#') : ''}${suffix}`;
  });
}

export function validateInventoryDocument(markdown: string, context: InventoryContext): void {
  if (markdown.length < 200 || Buffer.byteLength(markdown) > 64_000 || !markdown.startsWith('# '))
    throw new Error('Inventory must be a bounded Markdown document with a title');
  if (/<\/?[a-z!][^>]*>/i.test(markdown) || /!\[|```/.test(markdown))
    throw new Error('Inventory must not contain HTML, images or code fences');
  const paths = new Set(context.sources.map(source => source.path));
  const links = [...markdown.matchAll(/\[[^\]\n]+\]\(([^\s)]+)\)/g)];
  if (links.filter(([, target]) => !target!.startsWith('#')).length < 3) throw new Error('Inventory needs at least three source references');
  for (const [, target] of links) {
    if (target!.startsWith('#')) continue;
    const path = target!.split('#')[0]!;
    if (!path.startsWith('../') || !paths.has(posix.normalize(posix.join('docs', path))))
      throw new Error('Inventory references a file outside the supplied sources' +
        (/^[a-zA-Z0-9_./#-]{1,160}$/.test(target!) ? `: ${target}` : ' (non-file target)'));
  }
}
