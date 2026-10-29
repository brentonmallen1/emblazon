import { mkdirSync, writeFileSync } from 'node:fs';
import { heraldrySheet } from '../src/preview/heraldry-sheet.ts';

mkdirSync('out', { recursive: true });
writeFileSync('out/sheet-heraldry.html', heraldrySheet());
console.log('wrote out/sheet-heraldry.html');
