import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve('src/hooks/useEmployees.ts'), 'utf8');

describe('manual employee creation', () => {
  it('does not request the new employees_v2 row before RLS can read it', () => {
    const start = source.indexOf('// 1. Create core employee');
    const end = source.indexOf('const hireDate', start);
    const coreInsert = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(coreInsert).toContain(".from('employees_v2')");
    expect(coreInsert).toContain('id: employeeId');
    expect(coreInsert).not.toContain('.select(');
    expect(coreInsert).not.toContain('.single(');
  });
});
