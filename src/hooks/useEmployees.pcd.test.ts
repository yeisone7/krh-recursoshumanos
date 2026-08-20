import { describe, expect, it, vi } from 'vitest';
import {
  applyEmployeePcdFilter,
  countEmployeesWithDisability,
  employeeMatchesPcdFilter,
  hasEmployeeDisability,
} from './useEmployees';

function createQueryDouble() {
  const query = {
    not: vi.fn(),
    neq: vi.fn(),
  };

  query.not.mockReturnValue(query);
  query.neq.mockReturnValue(query);

  return query;
}

describe('applyEmployeePcdFilter', () => {
  it('filters by the disability selected in the employee profile', () => {
    const query = createQueryDouble();

    const result = applyEmployeePcdFilter(query, true);

    expect(result).toBe(query);
    expect(query.not).toHaveBeenCalledWith('disability_type', 'is', null);
    expect(query.neq).toHaveBeenCalledWith('disability_type', '');
    expect(query.neq).toHaveBeenCalledWith('disability_type', 'ninguna');
  });

  it('does not change the query when the filter is disabled', () => {
    const query = createQueryDouble();

    const result = applyEmployeePcdFilter(query, false);

    expect(result).toBe(query);
    expect(query.not).not.toHaveBeenCalled();
    expect(query.neq).not.toHaveBeenCalled();
  });
});

describe('hasEmployeeDisability', () => {
  it.each(['fisica', 'auditiva', 'visual', 'cognitiva', ' multiple '])(
    'recognizes %s as a disability selected in the employee profile',
    (disabilityType) => {
      expect(hasEmployeeDisability(disabilityType)).toBe(true);
    },
  );

  it.each([null, undefined, '', '   ', 'ninguna', 'NINGUNA'])(
    'does not classify %s as a disability',
    (disabilityType) => {
      expect(hasEmployeeDisability(disabilityType)).toBe(false);
    },
  );
});

describe('employeeMatchesPcdFilter', () => {
  it('keeps every employee when Solo PcD is disabled', () => {
    expect(employeeMatchesPcdFilter({ disability_type: null }, false)).toBe(true);
  });

  it('keeps only employees with a disability when Solo PcD is enabled', () => {
    expect(employeeMatchesPcdFilter({ disability_type: 'visual' }, true)).toBe(true);
    expect(employeeMatchesPcdFilter({ disability_type: 'ninguna' }, true)).toBe(false);
    expect(employeeMatchesPcdFilter({ disability_type: null }, true)).toBe(false);
  });
});

describe('countEmployeesWithDisability', () => {
  it('uses the same profile field as the Solo PcD filter', () => {
    const employees = [
      { disability_type: 'fisica' },
      { disability_type: 'ninguna' },
      { disability_type: null },
      { disability_type: 'auditiva' },
    ];

    expect(countEmployeesWithDisability(employees)).toBe(2);
  });
});
