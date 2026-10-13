import { describe, expect, it } from 'vitest';
import { shiftSaveError } from './shiftSaveError';

describe('shift save error feedback', () => {
  it.each([false, true])('explains a plain PostgREST permission error for editing=%s', isEditing => {
    const feedback = shiftSaveError({ code: '42501', message: 'new row violates row-level security policy for table "shifts"' }, isEditing);
    expect(feedback.title).toBe('Permisos insuficientes');
    expect(feedback.description).toContain(isEditing ? 'modificar turnos' : 'crear turnos');
    expect(feedback.description).toContain('administrador');
    expect(feedback.description).toContain('Jornadas');
    expect(feedback.description).not.toContain('row-level');
  });

  it('identifies denied operation center assignment separately', () => {
    const feedback = shiftSaveError({ code: '42501', message: 'permission denied for table shift_operation_centers' }, false);
    expect(feedback.description).toContain('asociar este turno a los centros');
  });

  it('recognizes permission failures represented as native errors', () => {
    expect(shiftSaveError(new Error('permission denied for table shifts'), false).title).toBe('Permisos insuficientes');
  });

  it('preserves other database error messages without calling them permission failures', () => {
    expect(shiftSaveError({ code: 'P0001', message: 'Uno o más centros no pertenecen a la empresa del turno' }, false)).toEqual({
      title: 'No se pudo crear el turno', description: 'Uno o más centros no pertenecen a la empresa del turno',
    });
    expect(shiftSaveError(new Error('Sin conexión'), true)).toEqual({ title: 'No se pudo actualizar el turno', description: 'Sin conexión' });
  });

  it.each([null, undefined, {}, { message: 123 }, 'error desconocido'])('handles an unknown error safely: %s', error => {
    expect(shiftSaveError(error, false)).toEqual({ title: 'No se pudo crear el turno', description: 'No se pudo guardar el turno. Intenta nuevamente.' });
  });
});
