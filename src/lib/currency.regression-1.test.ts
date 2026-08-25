import { describe, expect, it } from 'vitest';

import { parseCopCurrency } from './currency';

// Regression: ISSUE-005 — formatted COP salaries were saved as decimal fragments
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-seleccion-analitica-2026-08-25.md
describe('COP currency parsing', () => {
  it('preserves Colombian and international thousands separators', () => {
    expect(parseCopCurrency('$1.423.500')).toBe(1_423_500);
    expect(parseCopCurrency('$1,423,500')).toBe(1_423_500);
    expect(parseCopCurrency('1423500')).toBe(1_423_500);
  });

  it('returns null for empty values', () => {
    expect(parseCopCurrency('')).toBeNull();
    expect(parseCopCurrency(undefined)).toBeNull();
  });
});
