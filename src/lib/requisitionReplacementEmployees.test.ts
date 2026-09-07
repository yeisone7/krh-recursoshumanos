import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildReplacementEmployeeOptions } from './requisitionReplacementEmployees';

const employees = [
  {
    first_name: 'Ana',
    last_name: 'Activa',
    is_active: true,
  },
  {
    first_name: 'Iván',
    last_name: 'Inactivo',
    is_active: false,
  },
  {
    first_name: 'Celia',
    last_name: 'Otro Centro',
    is_active: false,
  },
];

describe('buildReplacementEmployeeOptions', () => {
  it('includes active and inactive employees and identifies inactive options', () => {
    expect(buildReplacementEmployeeOptions(employees)).toEqual([
      { label: 'Ana Activa', value: 'Ana Activa' },
      { label: 'Iván Inactivo (Inactivo)', value: 'Iván Inactivo' },
      { label: 'Celia Otro Centro (Inactivo)', value: 'Celia Otro Centro' },
    ]);
  });

  it('is wired into the requisition form through the scoped replacement RPC hook', () => {
    const source = readFileSync(
      `${process.cwd()}/src/components/requisitions/RequisitionFormDialog.tsx`,
      'utf8',
    );

    expect(source).toContain('useRequisitionReplacementCandidates(selectedOperationCenterId)');
    expect(source).toContain('options={replacementEmployeeOptions}');
  });
});
