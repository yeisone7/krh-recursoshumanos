# Plan: Gestión de Turnos - COMPLETADO ✓

## Funcionalidades Implementadas

### 1. Alerta Visual para Conflictos Turno/Novedad ✓
- Indicador rojo (borde + badge "!") cuando hay turno de trabajo en día con novedad
- Tooltip diferenciado explicando el conflicto

### 2. Eliminación Automática de Turnos ✓
- Al aprobar vacaciones/permisos: turnos de trabajo eliminados automáticamente
- Al crear incapacidad: turnos de trabajo eliminados automáticamente
- Turnos de descanso NO se eliminan (compatibles con novedades)
- Toast informativo indicando cantidad eliminada

### 3. Menú Contextual en Calendario ✓
- **Click derecho en celda vacía**: Lista de turnos disponibles para asignar
- **Click derecho en celda con turno**: Cambiar a otro turno o eliminar
- **Click derecho en día con novedad**: Solo permite asignar descansos
- Los tooltips ahora indican "Click derecho para opciones"

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/..._cleanup_shifts.sql` | Función SQL `delete_shift_assignments_for_absence` |
| `src/hooks/useCleanupShiftAssignments.ts` | Hook + función standalone para limpieza |
| `src/hooks/useVacations.ts` | Limpieza al aprobar vacaciones |
| `src/hooks/useLeaves.ts` | Limpieza al aprobar permisos |
| `src/hooks/useIncapacities.ts` | Limpieza al crear incapacidad |
| `src/components/vacations/VacationDetailDialog.tsx` | Parámetros adicionales para aprobar |
| `src/components/schedules/ShiftCalendar.tsx` | ContextMenu + indicador conflicto + leyenda |

---

## Uso

### Menú Contextual
1. Navega a **Jornadas** → pestaña **Calendario**
2. Haz **click derecho** en cualquier celda:
   - **Celda vacía**: Asignar turno
   - **Celda con turno**: Cambiar o eliminar
   - **Celda con novedad**: Solo descansos permitidos

### Conflictos
- Los conflictos se muestran automáticamente con indicador rojo
- Al aprobar novedades, los turnos conflictivos se eliminan solos
