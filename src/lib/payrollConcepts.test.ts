import { describe, expect, it } from 'vitest';
import { conceptOptions, noveltyConceptKey, noveltyConceptLabel, noveltyQuantity, validateConcepts } from './payrollConcepts';
import type { PayrollConcept, PayrollConceptDraft } from '@/types/payroll';
const concept: PayrollConcept = { id: 'a', company_id: 'company-a', name: 'Bono', identifier: 'BONO', unit: 'days', percentage: 12.5, is_active: false, system_type: null, sort_order: 8 };
const draft: PayrollConceptDraft = { ...concept, percentage: '12.5' };
describe('payroll concept validation and resolution', () => {
  it('accepts zero and decimal percentages', () => {
    expect(validateConcepts([draft])).toEqual({});
    expect(validateConcepts([{ ...draft, percentage: '0' }])).toEqual({});
  });
  it.each(['', '-1', 'Infinity', 'NaN'])('rejects an invalid percentage %s', percentage => {
    expect(validateConcepts([{ ...draft, percentage }])).toHaveProperty('a');
  });
  it('rejects empty names and identifiers and marks both duplicate identifiers', () => {
    expect(validateConcepts([{ ...draft, name: ' ' }])).toHaveProperty('a');
    expect(validateConcepts([{ ...draft, identifier: ' ' }])).toHaveProperty('a');
    expect(Object.keys(validateConcepts([draft, { ...draft, id: 'b', identifier: ' bono ' }]))).toEqual(['b', 'a']);
  });
  it('excludes inactive concepts from creation and includes the original for editing', () => {
    expect(conceptOptions([concept]).some(o => o.value === 'concept:a')).toBe(false);
    expect(conceptOptions([concept], 'a')).toContainEqual({ value: 'concept:a', label: 'BONO · Bono (inactivo)' });
  });
  it('resolves the stable identity and keeps days separate from equivalent hours', () => {
    const novelty = { novelty_type: 'custom' as const, concept_id: 'a', payroll_concepts: concept, quantity: 2, quantity_unit: 'days' as const, hours: 16 };
    expect(noveltyConceptKey(novelty)).toBe('concept:a');
    expect(noveltyConceptLabel(novelty)).toBe('BONO · Bono');
    expect(noveltyQuantity(novelty)).toEqual({ quantity: 2, unit: 'days' });
  });
});
