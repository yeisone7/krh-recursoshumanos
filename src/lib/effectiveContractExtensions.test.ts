import { describe, expect, it } from 'vitest';
import { effectiveContractEndDate, effectiveContractExtensions } from './effectiveContractExtensions';
describe('contract terms after an amendment', () => {
  const old = { start_date: '2026-01-01', end_date: '2027-01-01' };
  it('keeps old extensions out of indefinite terms', () => {
    expect(effectiveContractEndDate({ contract_type: 'indefinido', end_date: null, contract_extensions: [old] })).toBeNull();
  });
  it('preserves evidence and uses only extensions of the amended terms', () => {
    const contract = { contract_type: 'fijo', end_date: '2026-12-31', amendment_effective_on: '2026-11-01', contract_extensions: [old, { start_date: '2027-01-01', end_date: '2027-06-30' }] };
    expect(effectiveContractExtensions(contract)).toHaveLength(1);
    expect(effectiveContractEndDate(contract)).toBe('2027-06-30');
    expect(contract.contract_extensions).toHaveLength(2);
  });
  it('uses the amendment end date when all extensions predate it', () => {
    expect(effectiveContractEndDate({ contract_type: 'fijo', end_date: '2026-12-31', amendment_effective_on: '2026-11-01', contract_extensions: [old] })).toBe('2026-12-31');
  });
});
