import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve('src/pages/AnaliticaSeleccion.tsx'), 'utf8');
const executive = source.split('<TabsContent value="ejecutivo"')[1].split('</TabsContent>')[0];
const sections = [...executive.matchAll(/<section aria-labelledby="([^"]+)"[\s\S]*?<\/section>/g)];
const titles = (body: string, component: string) => [...body.matchAll(new RegExp(`<${component} title="([^"]+)"`, 'g'))].map((match) => match[1]);

describe('selection executive dashboard layout', () => {
  it('groups content in the same logical order for desktop and mobile', () => {
    expect(sections.map((section) => section[1])).toEqual([
      'selection-overview', 'selection-timing', 'selection-funnel', 'selection-demand', 'selection-alerts',
    ]);
    for (const section of sections) expect(section[0]).toContain(`<h2 id="${section[1]}"`);
    expect(executive).not.toMatch(/\border-\d/);
  });

  it('preserves every KPI without duplicates and puts operational exceptions last', () => {
    expect(titles(sections[0][0], 'KpiCard')).toEqual([
      'Requisiciones activas', 'Vacantes activas', 'Candidatos en proceso',
      'Contratados', 'Tiempo prom. cobertura', 'Tasa descarte global',
    ]);
    expect(sections[0][0]).toContain('grid gap-3 sm:grid-cols-2 xl:grid-cols-3');
    expect(titles(sections[4][0], 'KpiCard')).toEqual([
      'Descartados', 'Desistidos', 'Vacantes pausadas', 'Vacantes canceladas',
    ]);
    expect(titles(executive, 'KpiCard')).toHaveLength(10);
  });

  it('preserves all 19 charts and groups the two detailed timing comparisons together', () => {
    const chartTitles = titles(executive, 'ChartCard');
    expect(chartTitles).toHaveLength(19);
    expect(new Set(chartTitles).size).toBe(19);
    expect(titles(sections[1][0], 'ChartCard')).toEqual([
      'Tiempos de selección por mano de obra (MOC / MONC)',
      'Embudo de tiempo de aprobación por área',
      'Tendencia semanal: aperturas, cierres y cobertura',
      'Comparativo mensual: volumen vs tiempo de cobertura',
    ]);
    expect(sections[2][0]).toContain('Desempeño por etapa de selección');
    expect(sections[4][0]).toContain('Alertas de estancamiento');
    expect(sections[4][0]).toContain('Vacantes canceladas con justificación');
  });

  it('avoids orphan half-width charts before full-width charts on desktop', () => {
    for (const section of sections) {
      let occupied = 0;
      for (const chart of section[0].matchAll(/<ChartCard title="[^"]+"([^>]*?)\s+info=/g)) {
        const fullWidth = chart[1].includes('xl:col-span-2');
        if (fullWidth) expect(occupied % 2).toBe(0);
        occupied += fullWidth ? 2 : 1;
      }
      expect(occupied % 2).toBe(0);
    }
  });

  it('retains the infographic tab and all current filters', () => {
    expect(source).toContain('<TabsContent value="infografias"');
    expect(source).toContain('setCenterFilter');
    expect(source).toContain('setStartDate');
    expect(source).toContain('setEndDate');
  });
});
