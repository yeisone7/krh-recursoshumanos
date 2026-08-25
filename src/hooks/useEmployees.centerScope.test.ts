import { describe, expect, it } from 'vitest';
import { mergeEmployeeCenterScopeIds } from './useEmployees';

describe('mergeEmployeeCenterScopeIds', () => {
  it('keeps employees found only through their primary work-info center', () => {
    expect(mergeEmployeeCenterScopeIds(
      [{ employee_id: 'primary-only' }],
      [],
    )).toEqual(['primary-only']);
  });

  it('includes additional centers and removes duplicate employee ids', () => {
    expect(mergeEmployeeCenterScopeIds(
      [{ employee_id: 'shared' }],
      [{ employee_id: 'shared' }, { employee_id: 'additional-only' }],
    )).toEqual(['shared', 'additional-only']);
  });
});
