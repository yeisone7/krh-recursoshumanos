import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve('src/pages/AnaliticaSeleccion.tsx'), 'utf8');
const theme = postcss.parse(readFileSync(resolve('src/index.css'), 'utf8'));
const chartCss = () => postcss.parse(readFileSync(resolve('src/pages/AnaliticaSeleccion.css'), 'utf8'));

function declaration(selector: string, property: string) {
  let value = '';
  let important = false;
  chartCss().walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls(property, (decl) => { value = decl.value; important = Boolean(decl.important); });
  });
  return { value, important };
}

function luminance(hsl: string) {
  const [h, s, l] = hsl.match(/[\d.]+/g)!.map(Number);
  const saturation = s / 100;
  const lightness = l / 100;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const rgb = [0, 8, 4].map((n) => {
    const k = (n + h / 30) % 12;
    const c = lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

describe('selection chart text contrast', () => {
  it('applies the contrast stylesheet to every shared chart card', () => {
    expect(page).toContain("import './AnaliticaSeleccion.css'");
    expect(page).toContain("cn('selection-analytics-chart overflow-hidden', className)");
    chartCss().walkRules((rule) => {
      expect(rule.selectors.every((selector) => selector.startsWith('.selection-analytics-chart '))).toBe(true);
    });
  });

  it('overrides inline series colors for tooltip items and headings', () => {
    for (const part of ['.recharts-tooltip-item', '.recharts-tooltip-label']) {
      expect(declaration(`.selection-analytics-chart ${part}`, 'color')).toEqual({
        value: 'hsl(var(--popover-foreground))', important: true,
      });
    }
    expect(declaration('.selection-analytics-chart .recharts-default-tooltip', 'background-color')).toEqual({
      value: 'hsl(var(--popover))', important: true,
    });
  });

  it('gives legend text and SVG labels a readable foreground without recoloring series', () => {
    expect(declaration('.selection-analytics-chart .recharts-legend-item-text', 'color')).toEqual({
      value: 'hsl(var(--foreground))', important: true,
    });
    expect(declaration('.selection-analytics-chart .recharts-text', 'fill')).toEqual({
      value: 'hsl(var(--foreground))', important: true,
    });
    expect(chartCss().toString()).not.toMatch(/\.recharts-(bar|line|sector|legend-icon)\b/);
  });

  it.each([':root', '.dark'])('uses text/background pairs above 4.5:1 in %s', (selector) => {
    const tokens: Record<string, string> = {};
    theme.walkRules((rule) => {
      if (rule.selector === selector) rule.walkDecls((decl) => { tokens[decl.prop] = decl.value; });
    });
    for (const [text, background] of [['--foreground', '--card'], ['--popover-foreground', '--popover']]) {
      const values = [luminance(tokens[text]), luminance(tokens[background])].sort((a, b) => b - a);
      expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
