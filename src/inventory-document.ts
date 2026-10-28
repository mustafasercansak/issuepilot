import { posix } from 'node:path';
import type { InventoryContext } from './inventory-context.js';

export function validateInventoryDocument(markdown: string, context: InventoryContext): void {
  if (markdown.length < 200 || Buffer.byteLength(markdown) > 64_000 || !markdown.startsWith('# '))
    throw new Error('Inventory must be a bounded Markdown document with a title');
  if (/<\/?[a-z!][^>]*>/i.test(markdown) || /!\[|```/.test(markdown))
    throw new Error('Inventory must not contain HTML, images or code fences');
  const paths = new Set(context.sources.map(source => source.path));
  const links = [...markdown.matchAll(/\[[^\]\n]+\]\(([^\s)]+)\)/g)];
  if (links.length < 3) throw new Error('Inventory needs at least three source references');
  for (const [, target] of links) {
    const path = target!.split('#')[0]!;
    if (!path.startsWith('../') || !paths.has(posix.normalize(posix.join('docs', path))))
      throw new Error('Inventory references a file outside the supplied sources');
  }
}
