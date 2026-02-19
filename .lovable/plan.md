
## Validacion visual de turnos/descansos afectados antes de crear vacaciones

### Que se hara

Cuando el usuario seleccione un empleado y un rango de fechas en el formulario de vacaciones (`VacationFormDialog`), el sistema consultara en tiempo real cuantas asignaciones de turno (trabajo y descanso) existen para ese empleado en ese periodo. Se mostrara un aviso informativo justo debajo del calculo de dias habiles indicando cuantas asignaciones seran eliminadas al confirmar.

### Cambios

**Archivo: `src/components/vacations/VacationFormDialog.tsx`**

1. Agregar una consulta reactiva a la tabla `employee_shift_assignments` que se ejecute cuando se tengan `selectedEmployeeId`, `watchStartDate` y `watchEndDate`.
   - Contar total de asignaciones en el rango.
   - Separar cuantas son turnos de trabajo (donde `shifts.is_rest_day = false`) y cuantas son descansos (`shifts.is_rest_day = true`).

2. Mostrar un bloque informativo (con icono de alerta naranja) debajo del panel de "Dias habiles" con texto como:
   ```
   Se eliminaran X asignacion(es) de turno en este periodo:
   - Y turno(s) de trabajo
   - Z descanso(s)
   ```
   Solo se muestra si hay al menos 1 asignacion afectada.

### Detalles tecnicos

- La consulta usara `supabase.from('employee_shift_assignments').select('id, shifts(is_rest_day)').eq('employee_id', ...).gte('assignment_date', startDate).lte('assignment_date', endDate)`.
- Se implementara con `useEffect` y estado local (`affectedShifts`) para evitar agregar un hook de react-query dedicado (mantener el cambio en un solo archivo).
- No se modifica ningun otro archivo.
