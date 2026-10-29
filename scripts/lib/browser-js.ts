/**
 * Turns one library source file into browser-ready JavaScript: Node's built-in type stripping
 * (whitespace-preserving, so line numbers survive) plus `.ts` → `.js` import specifiers.
 * Used by `npm run build` and by the preview server's /lib route.
 */
import { stripTypeScriptTypes } from 'node:module';

export function toBrowserJs(source: string): string {
  return stripTypeScriptTypes(source, { mode: 'strip' }).replace(/(\bfrom\s+['"]\.{1,2}\/[^'"]+)\.ts(['"])/g, '$1.js$2');
}
