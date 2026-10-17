import { describe, it, expect } from 'vitest';
import { EVALUATION_PRESETS } from './evaluationPresets';
import { calculateEvaluationResult, templateAppliesToPosition } from './evaluationScoring';
import { DEFAULT_RATING_SCALE, type EvaluationTemplate } from '@/types/evaluation';

describe('GH-FO-05-DR', () => {
  it.each([[0, 28, 10], [1, 22, 8], [2, 16, 6]])('conserva los criterios y competencias de la hoja %i', (index, count, groups) => {
    const preset = EVALUATION_PRESETS[index];
    expect(preset.criteria).toHaveLength(count);
    expect(new Set(preset.criteria.map(c => c.category)).size).toBe(groups);
    expect(preset.criteria.every(c => c.dimension && c.competency_description && c.max_score === 4 && c.weight === 1)).toBe(true);
  });
  it.each([1, 2, 3, 4])('coincide con las tres fórmulas del Excel para nivel %i', level => {
    for (const preset of EVALUATION_PRESETS) {
      const criteria = preset.criteria.map((c,i) => ({ ...c, id: String(i) }));
      const scores = Object.fromEntries(criteria.map(c => [c.id, { level }]));
      const result = calculateEvaluationResult(criteria, scores, DEFAULT_RATING_SCALE);
      expect(result.percentage).toBe(level * 25);
      expect(result.average).toBe(level);
    }
  });
  it('conserva decimales y resuelve los huecos de la tabla con redondeo explícito', () => {
    const criteria = Array.from({ length: 28 }, (_,i) => ({ id: String(i), weight: 1, max_score: 4 }));
    const scores = Object.fromEntries(criteria.map((c,i) => [c.id, { level: i < 18 ? 4 : 3 }]));
    expect(calculateEvaluationResult(criteria,scores,DEFAULT_RATING_SCALE)).toMatchObject({ percentage: 91.07, rating: 'Sobresaliente' });
    const score = (raw: number) => calculateEvaluationResult([{ id: 'a', max_score: 100 / raw, weight: 1 }], { a: { level: 1 } }, DEFAULT_RATING_SCALE).rating;
    expect(score(90.49)).toBe('Bueno'); expect(score(90.5)).toBe('Sobresaliente');
    expect(score(74.49)).toBe('Aceptable'); expect(score(74.5)).toBe('Bueno');
    expect(score(59.49)).toBe('Deficiente'); expect(score(59.5)).toBe('Aceptable');
  });
  it('no convierte respuestas faltantes, cero o fuera de escala en resultados', () => {
    const criteria = [{ id: 'a' }, { id: 'b' }];
    for (const level of [null, 0, 5, 2.5, NaN]) expect(calculateEvaluationResult(criteria, { a: { level: 4 }, b: { level } }, DEFAULT_RATING_SCALE).percentage).toBeNull();
    expect(calculateEvaluationResult(criteria, { a: { level: 4 } }, DEFAULT_RATING_SCALE)).toMatchObject({ answered: 1, complete: false, percentage: null });
  });
  it('requiere cargos explícitos para los formatos del Excel', () => {
    const template = { preset_key: 'strategic', is_active: true, positions: [] } as EvaluationTemplate;
    expect(templateAppliesToPosition(template, 'manager')).toBe(false);
    template.positions = [{ id: 'manager', name: 'Gerente' }];
    expect(templateAppliesToPosition(template, 'manager')).toBe(true);
    expect(templateAppliesToPosition(template, 'operator')).toBe(false);
    expect(templateAppliesToPosition(template)).toBe(false);
    expect(templateAppliesToPosition({ ...template, is_active: false }, 'manager')).toBe(false);
  });
});
