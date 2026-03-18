

## Plan: Campo "Autoriza" en Requisiciones

### Resumen
Agregar un campo **"Autoriza"** (lista desplegable) a las requisiciones con dos opciones: *Gerencia Administrativa* y *Gerencia de Operaciones*. Este campo determina cuál paso de aprobación se activa en el timeline (Gerencia **o** Operaciones, nunca ambos). Es obligatorio antes de enviar la requisición.

### Cambios

#### 1. Base de datos — Nueva columna
Migración para agregar `autoriza` (TEXT, nullable) a `personnel_requisitions`:
```sql
ALTER TABLE public.personnel_requisitions 
  ADD COLUMN autoriza TEXT CHECK (autoriza IN ('gerencia_administrativa', 'gerencia_operaciones'));
```

#### 2. Hook `useRequisitions.ts`
- Agregar `autoriza: string | null` a la interfaz `PersonnelRequisition`.

#### 3. Tipos `requisition.ts`
- Agregar tipo `AutorizaType` y labels correspondientes.
- Agregar `autoriza` al schema del formulario (opcional en creación, requerido antes de enviar).

#### 4. Detalle de Requisición (`RequisitionDetailDialog.tsx`)
- Mostrar el campo **Autoriza** como un `Select` editable cuando el estado es `borrador`.
- Al cambiar el valor, guardar inmediatamente con `useUpdateRequisition`.
- Validar que `autoriza` esté seleccionado antes de permitir "Enviar para Aprobación". Si no está seleccionado, mostrar toast de error.
- Mostrar el valor seleccionado en la pestaña de Detalles.

#### 5. Timeline (`RequisitionTimeline.tsx`)
- Actualmente ya tiene lógica condicional para Gerencia (`showGerencia`).
- Modificar `getTimelineSteps` para recibir `autoriza` y:
  - Si `autoriza === 'gerencia_administrativa'`: incluir paso Gerencia, **excluir** Operaciones.
  - Si `autoriza === 'gerencia_operaciones'`: incluir paso Operaciones, **excluir** Gerencia.
  - Si `autoriza` es null (borrador sin selección): mostrar ambos como pendientes.

#### 6. Flujo de aprobación (`useRequisitions.ts` — `useApproveRequisitionStep`)
- Modificar el `statusMap` para que sea dinámico según el valor de `autoriza`:
  - Flujo con **Gerencia Administrativa**: RRHH → Jurídico → Gerencia → Selección (sin Operaciones).
  - Flujo con **Gerencia de Operaciones**: RRHH → Jurídico → Operaciones → Selección (sin Gerencia).
- Actualizar `useSubmitRequisition` para validar que `autoriza` no sea null antes de enviar.

#### 7. Formulario de creación (`RequisitionFormDialog`)
- No se agrega al formulario de creación; se selecciona después de crear, en la vista de detalle (borrador).

#### 8. Diálogo de aprobación (`RequisitionApprovalDialog`)
- El paso que se muestra ya depende del `estado_requisicion`, así que si el flujo salta Operaciones o Gerencia, el botón de aprobación correcto aparecerá automáticamente.

### Archivos a modificar
- `supabase/migrations/` — nueva migración
- `src/hooks/useRequisitions.ts` — interfaz + lógica de flujo
- `src/types/requisition.ts` — tipos y labels
- `src/components/requisitions/RequisitionDetailDialog.tsx` — campo Autoriza + validación
- `src/components/requisitions/RequisitionTimeline.tsx` — filtrar pasos según autoriza
- `src/pages/Requisiciones.tsx` — posible ajuste en botones de aprobación por fila

