
# Plan: Alerta Visual y Trigger Automático para Conflictos Turno/Novedad

## Resumen

Implementar dos funcionalidades complementarias para gestionar conflictos entre asignaciones de turnos y novedades (vacaciones, permisos, incapacidades):

1. **Alerta Visual en el Calendario**: Mostrar un indicador de conflicto cuando existe un turno asignado en un día donde el empleado tiene una novedad activa
2. **Trigger Automático**: Eliminar automáticamente las asignaciones de turno cuando se aprueba una vacación, permiso o incapacidad que afecta ese período

---

## Comportamiento Esperado

### Alerta Visual
- En el `ShiftCalendar`, cuando un empleado tiene **tanto** un turno asignado **como** una novedad en el mismo día:
  - La celda mostrará un indicador de conflicto (borde rojo + ícono de advertencia)
  - El tooltip mostrará información del conflicto: turno asignado vs tipo de novedad
  - El usuario podrá identificar rápidamente qué asignaciones deben revisarse

### Trigger Automático
- Cuando se **aprueba** una vacación, permiso o incapacidad:
  - El sistema eliminará automáticamente las asignaciones de turno existentes para ese empleado en el período de la novedad
  - Solo se eliminarán turnos de trabajo (no días de descanso)
  - Se mostrará una notificación indicando cuántas asignaciones fueron eliminadas

---

## Cambios Técnicos

### 1. Modificar el Calendario de Turnos (Frontend)

**Archivo:** `src/components/schedules/ShiftCalendar.tsx`

**Cambios:**
- Detectar cuando existe conflicto: `shift` presente Y `absence` presente en el mismo día
- Aplicar estilos de conflicto: borde rojo, fondo con indicador de alerta
- Mostrar tooltip con información del conflicto
- Agregar indicador visual (ícono de exclamación superpuesto)

```text
Flujo Visual:
┌─────────────────────────────────────────────────────────────┐
│  Celda Normal con Turno    │  Celda con Conflicto          │
│  ┌─────────┐               │  ┌─────────┐                  │
│  │  T1     │               │  │⚠ T1 ⚠  │ ← Borde rojo     │
│  └─────────┘               │  └─────────┘                  │
│                            │  Tooltip: "Conflicto:         │
│                            │  Turno Mañana asignado        │
│                            │  durante Vacaciones"          │
└─────────────────────────────────────────────────────────────┘
```

### 2. Crear Función para Eliminar Asignaciones (Backend)

**Archivo:** Nueva migración SQL

**Crear función de base de datos:**
```sql
CREATE OR REPLACE FUNCTION delete_shift_assignments_for_absence(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS INTEGER
```

Esta función:
- Elimina registros de `employee_shift_assignments` donde el turno NO es día de descanso
- Retorna la cantidad de registros eliminados
- Se ejecuta con permisos de servicio (`SECURITY DEFINER`)

### 3. Integrar Eliminación Automática en Hooks (Frontend)

**Archivos a modificar:**
- `src/hooks/useVacations.ts` - en `useApproveVacation`
- `src/hooks/useLeaves.ts` - en `useApproveLeaveRequest`
- `src/hooks/useIncapacities.ts` - en `useCreateIncapacity`

**Lógica:**
Después de aprobar/crear la novedad, llamar a una función RPC o ejecutar un DELETE directo que elimine las asignaciones de turno en el período afectado.

```text
Flujo de Aprobación:
┌──────────────────────────────────────────────────────────────┐
│  1. Usuario aprueba vacación (15-30 Ene)                     │
│                     ↓                                        │
│  2. Se actualiza vacation_requests.status = 'aprobado'       │
│                     ↓                                        │
│  3. Se ejecuta DELETE en employee_shift_assignments          │
│     WHERE employee_id = X                                    │
│       AND assignment_date BETWEEN '2026-01-15' AND '2026-01-30'
│       AND shift.is_rest_day = false                          │
│                     ↓                                        │
│  4. Toast: "3 asignaciones de turno eliminadas               │
│     por conflicto con vacaciones"                            │
│                     ↓                                        │
│  5. Invalidar queries de shift_assignments                   │
└──────────────────────────────────────────────────────────────┘
```

### 4. Crear Hook Reutilizable para Limpiar Asignaciones

**Archivo nuevo:** `src/hooks/useCleanupShiftAssignments.ts`

```typescript
export function useCleanupShiftAssignments() {
  return useMutation({
    mutationFn: async ({
      employeeId,
      startDate,
      endDate,
    }: {
      employeeId: string;
      startDate: string;
      endDate: string;
    }) => {
      // Eliminar asignaciones que no sean días de descanso
      // ...
    },
  });
}
```

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `supabase/migrations/XXXXX_cleanup_shifts_on_absence.sql` | Crear | Función SQL para limpieza |
| `src/hooks/useCleanupShiftAssignments.ts` | Crear | Hook reutilizable para limpieza |
| `src/components/schedules/ShiftCalendar.tsx` | Modificar | Agregar indicador visual de conflicto |
| `src/hooks/useVacations.ts` | Modificar | Llamar limpieza al aprobar vacaciones |
| `src/hooks/useLeaves.ts` | Modificar | Llamar limpieza al aprobar permisos |
| `src/hooks/useIncapacities.ts` | Modificar | Llamar limpieza al crear incapacidad |

---

## Detalles de Implementación Visual

### Estilos de Conflicto en Celda

```tsx
// Detectar conflicto
const hasConflict = shift && absence && !shift.is_rest_day;

// Aplicar estilos
<div className={cn(
  'w-10 p-0.5 border-r shrink-0 cursor-pointer transition-colors select-none relative',
  // Estilos existentes...
  hasConflict && 'ring-2 ring-red-500 bg-red-50'
)}>
  {/* Indicador de turno con conflicto */}
  {hasConflict && (
    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
      <span className="text-[8px] text-white font-bold">!</span>
    </div>
  )}
  {/* Turno */}
  {shift && (
    <div className={cn(
      'h-6 rounded text-[10px] font-medium text-white flex items-center justify-center',
      hasConflict && 'opacity-70'
    )} style={{ backgroundColor: shift.color }}>
      {shift.code || shift.name.slice(0, 2).toUpperCase()}
    </div>
  )}
</div>
```

### Tooltip de Conflicto

```tsx
{hasConflict && (
  <TooltipContent side="top" className="bg-red-50 border-red-200">
    <div className="space-y-1">
      <p className="font-semibold text-red-700">⚠️ Conflicto detectado</p>
      <p className="text-sm">Turno: {shift.name}</p>
      <p className="text-sm">Novedad: {absence.description}</p>
      <p className="text-xs text-red-600">
        La asignación debería eliminarse
      </p>
    </div>
  </TooltipContent>
)}
```

---

## Consideraciones

1. **Incapacidades**: Se eliminan turnos al **crear** la incapacidad (no hay flujo de aprobación separado)
2. **Vacaciones y Permisos**: Se eliminan turnos al **aprobar** la solicitud
3. **Turnos de Descanso**: NO se eliminan (son compatibles con cualquier novedad)
4. **Invalidación de Queries**: Después de eliminar, se invalidan los queries de `shift_assignments` para refrescar el calendario
5. **Notificaciones**: Se muestra toast informando cuántas asignaciones fueron eliminadas

---

## Resultado Final

El usuario podrá:
1. **Visualizar conflictos** existentes en el calendario con indicadores claros
2. **Confiar** en que al aprobar novedades, los turnos conflictivos se eliminarán automáticamente
3. **Reducir errores manuales** al no tener que recordar limpiar asignaciones manualmente
