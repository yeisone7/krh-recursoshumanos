/** Supabase can reject with a plain PostgREST object rather than an Error. */
export function shiftSaveError(error: unknown, isEditing: boolean) {
  const details = error && typeof error === 'object'
    ? error as { code?: unknown; message?: unknown }
    : null;
  const message = typeof details?.message === 'string' ? details.message.trim() : '';
  const permissionDenied = details?.code === '42501'
    || /permission denied|row[- ]level security|sin permisos?\b|no tienes permisos?\b/i.test(message);

  if (permissionDenied) {
    const centerDenied = /shift_operation_centers|sync_shift_operation_centers/i.test(message);
    return {
      title: 'Permisos insuficientes',
      description: centerDenied
        ? 'No tienes autorización para asociar este turno a los centros de operación. Solicita a un administrador que revise tu rol y los permisos de Jornadas en esta empresa.'
        : `No tienes autorización para ${isEditing ? 'modificar' : 'crear'} turnos en esta empresa. Solicita a un administrador que revise tu rol y los permisos de Jornadas.`,
    };
  }

  return {
    title: isEditing ? 'No se pudo actualizar el turno' : 'No se pudo crear el turno',
    description: message || 'No se pudo guardar el turno. Intenta nuevamente.',
  };
}
