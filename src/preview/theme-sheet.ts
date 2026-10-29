import { escapeXml } from '../core/svg.ts';
import { THEMES, emblazon, emblazonOptions, type ThemeName } from '../index.ts';
import { page, section } from './layout.ts';
import { LOOKS } from './looks.ts';

/** A contact sheet for any theme, drawn on its jb-rpg screen colour. */
export function themeSheet(theme: ThemeName): string {
  const look = LOOKS[theme];
  const t = THEMES[theme];
  const card = (svg: string, caption: string, width = 196) =>
    `<figure class="card" style="width:${width}px">${svg}<figcaption>${escapeXml(caption)}</figcaption></figure>`;
  const sized = (svg: string, px: number) => svg.replace('<svg ', `<svg width="${px}" height="${px}" `);

  const picks = emblazonOptions('Wren Ashdown', { theme, count: 6 }).map((e) => card(sized(e.svg, 150), e.description));
  const grid = Array.from({ length: 96 }, (_, i) => {
    const e = emblazon(`user${i}`, { theme });
    return `<figure title="${escapeXml(`user${i}: ${e.description}`)}">${sized(e.svg, 72)}</figure>`;
  }).join('');
  const sizes = [32, 48, 64, 96, 128].map((px) => `<figure>${sized(emblazon('sizes-demo', { theme }).svg, px)}<figcaption>${px}px</figcaption></figure>`).join('');
  const animated =
    theme === 'eldritch'
      ? section('Animated (animate: true)', `<div class="stage">${[0, 1, 2].map((i) => card(sized(emblazon(`motion${i}`, { theme, animate: true }).svg, 150), 'eyes glowing')).join('')}</div>`)
      : '';

  return page(
    `emblazon · ${theme}`,
    `${look.label} · v${t.latest}. Drawn on jb-rpg's ${look.label.split(' · ')[0]} screen colour.`,
    `<style>
      .stage { background: ${look.bg}; border-radius: 14px; padding: 18px; display: flex; flex-wrap: wrap; gap: 14px; }
      .stage .card { background: #ffffff08; border-radius: 12px; padding: 14px 10px; color: #c9c5bb; }
      .stage figcaption { color: #b6b2a8; }
      .stage.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; }
    </style>` +
      section('Options for one hero', `<div class="stage">${picks.join('')}</div>`) +
      animated +
      section('At avatar sizes', `<div class="stage" style="align-items:flex-end">${sizes}</div>`) +
      section('Generated', `<p class="note">96 inputs, hover for the description.</p><div class="stage grid">${grid}</div>`),
  );
}
