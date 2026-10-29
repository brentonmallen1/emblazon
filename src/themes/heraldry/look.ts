import type { Arms } from './arms.ts';
import { CHARGES } from './charges.ts';

/**
 * What you notice at avatar size: field type and tinctures, the ordinary and its tincture, the
 * charge and its tincture. Two arms with the same key look alike at a glance, even if shield,
 * line style or charge count differ.
 */
export function lookKey({ field, ordinary, charges }: Arms): string {
  const f =
    field.kind === 'plain'
      ? `plain:${field.tincture}`
      : `${field.kind === 'partition' ? field.partition : field.variation}:${field.tinctures.join('/')}`;
  return [f, ordinary ? `${ordinary.kind}:${ordinary.tincture}` : '-', charges ? `${charges.charge}:${charges.tincture}` : '-'].join(' | ');
}

/** License credits for the art in these arms (empty when it is all original). */
export function creditsFor({ charges }: Arms): string[] {
  const credit = charges && CHARGES[charges.charge].credit;
  return credit ? [credit] : [];
}

/**
 * One line crediting every third-party artist in the charge set, for an about or rules screen
 * of anything that shows emblems. Built from the charges' own credits, so it stays complete.
 */
export const ATTRIBUTION: string = (() => {
  const authors = [...new Set(Object.values(CHARGES).flatMap((c) => (c.credit ? [c.credit.split(',')[0]] : [])))].sort();
  return authors.length ? `Icons made by ${authors.join(', ')} from game-icons.net, CC BY 3.0.` : '';
})();
