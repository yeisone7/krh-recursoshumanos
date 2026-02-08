# Plan: Conflictos Turno/Novedad - COMPLETADO ✓

## Resumen

Se implementaron dos funcionalidades para gestionar conflictos entre asignaciones de turnos y novedades:

1. ✅ **Alerta Visual en el Calendario**: Indicador de conflicto (borde rojo + badge "!") cuando hay turno de trabajo en un día con novedad
2. ✅ **Trigger Automático**: Eliminación de turnos conflictivos al aprobar vacaciones/permisos o crear incapacidades

---

## Cambios Realizados

### Backend (Supabase)
- ✅ Función SQL `delete_shift_assignments_for_absence(employee_id, start_date, end_date)` que elimina turnos de trabajo (no descansos)

### Frontend

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useCleanupShiftAssignments.ts` | Hook reutilizable + función standalone para limpieza |
| `src/components/schedules/ShiftCalendar.tsx` | Indicador visual de conflicto + leyenda actualizada |
| `src/hooks/useVacations.ts` | Limpieza al aprobar vacaciones (disfrute/compensación) |
| `src/hooks/useLeaves.ts` | Limpieza al aprobar permisos |
| `src/hooks/useIncapacities.ts` | Limpieza al crear incapacidad |
| `src/components/vacations/VacationDetailDialog.tsx` | Pasar parámetros adicionales al aprobar |

---

## Comportamiento

### Visual
- Celda con conflicto: `ring-destructive`, badge rojo con "!", turno semitransparente
- Tooltip diferenciado: muestra turno + novedad + advertencia

### Automático
- Al aprobar vacación/permiso → elimina turnos de trabajo en el período
- Al crear incapacidad → elimina turnos de trabajo inmediatamente
- Turnos de descanso NO se eliminan (compatibles con novedades)
- Toast informativo si se eliminaron asignaciones
