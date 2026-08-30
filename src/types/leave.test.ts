import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createLeaveTypeKey, getAllowedLeaveDurations, getLeaveTypeLabel } from './leave';

describe('custom leave types', () => {
  it('creates a stable technical key from the display name', () => {
    expect(createLeaveTypeKey('Permiso Día de la Familia')).toBe('permiso_dia_de_la_familia');
    expect(createLeaveTypeKey('  Comisión / Viaje  ')).toBe('comision_viaje');
  });

  it('uses the company configuration label and humanizes unknown legacy keys', () => {
    const configs = [{ leave_type: 'dia_familia', display_name: 'Día de la Familia' }];
    expect(getLeaveTypeLabel('dia_familia', configs)).toBe('Día de la Familia');
    expect(getLeaveTypeLabel('permiso_especial')).toBe('Permiso Especial');
  });

  it('only exposes duration modes enabled for the selected leave type', () => {
    expect(getAllowedLeaveDurations(null)).toEqual(['dias_completos']);
    expect(getAllowedLeaveDurations({ allows_half_day: true, allows_hours: false })).toEqual([
      'dias_completos',
      'medio_dia',
    ]);
    expect(getAllowedLeaveDurations({ allows_half_day: true, allows_hours: true })).toEqual([
      'dias_completos',
      'medio_dia',
      'horas',
    ]);
  });

  it('guards deletion in both the client and the database', () => {
    const hookSource = readFileSync(`${process.cwd()}/src/hooks/useLeaves.ts`, 'utf8');
    const migrationSource = readFileSync(
      `${process.cwd()}/supabase/migrations/20260826205635_allow_custom_leave_types.sql`,
      'utf8',
    );

    expect(hookSource).toContain(".from('leave_requests')");
    expect(hookSource).toContain(".from('leave_balances')");
    expect(hookSource).toContain('throw new LeaveTypeInUseError(usage)');
    expect(migrationSource).toContain('ON UPDATE CASCADE ON DELETE RESTRICT');
    expect(migrationSource).toContain('FOR DELETE TO authenticated');
  });

  it('annuls unused leave against one employment-cycle balance only', () => {
    const migrationSource = readFileSync(
      `${process.cwd()}/supabase/migrations/20260830120000_leave_pending_documents_and_unused_annulment.sql`,
      'utf8',
    );

    expect(migrationSource).toContain('v_balance_id uuid');
    expect(migrationSource).toContain('WHERE balance.id = v_balance_id');
    expect(migrationSource).toContain('cycle.start_date <= v_request.start_date');
  });
});
