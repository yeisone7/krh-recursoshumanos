import { describe, expect, it, vi } from 'vitest';
import { scopeToEmploymentCycle, withEmploymentCycle } from './employeeCycleScope';

describe('employee edit cycle scoping', () => {
  it('limits replacements to the active employment cycle', () => {
    const scopedQuery = { cycle: 'active-cycle' };
    const query = {
      eq: vi.fn(() => scopedQuery),
      is: vi.fn(),
    };

    expect(scopeToEmploymentCycle(query, 'active-cycle')).toBe(scopedQuery);
    expect(query.eq).toHaveBeenCalledWith('employment_cycle_id', 'active-cycle');
    expect(query.is).not.toHaveBeenCalled();
  });

  it('keeps legacy employees restricted to unscoped records', () => {
    const scopedQuery = { cycle: null };
    const query = {
      eq: vi.fn(),
      is: vi.fn(() => scopedQuery),
    };

    expect(scopeToEmploymentCycle(query, null)).toBe(scopedQuery);
    expect(query.is).toHaveBeenCalledWith('employment_cycle_id', null);
    expect(query.eq).not.toHaveBeenCalled();
  });

  it('writes the active cycle into replacement records', () => {
    expect(withEmploymentCycle({ employee_id: 'employee-1' }, 'active-cycle')).toEqual({
      employee_id: 'employee-1',
      employment_cycle_id: 'active-cycle',
    });
  });
});
