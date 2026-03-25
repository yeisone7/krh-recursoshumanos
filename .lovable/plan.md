

## Plan: Anexos de Perfil de Cargo por Centro de Operación

### Resumen
Crear un sistema de "anexos" (overrides parciales) que permita personalizar campos específicos del perfil de un cargo para centros de operación particulares, sin duplicar el perfil completo.

### 1. Migración SQL
Nueva tabla `position_profile_annexes` con todos los campos del perfil como nullable (solo se llenan los que cambian), referenciando `position_profiles(id)` y `operation_centers(id)`. Constraint UNIQUE en `(profile_id, operation_center_id)`. RLS basada en `company_id` con `is_company_member()`.

### 2. Tipos TypeScript
Agregar `PositionProfileAnnex` y `PositionProfileAnnexFormData` en `src/types/positionProfile.ts`.

### 3. Hook `src/hooks/useProfileAnnexes.ts`
- `useProfileAnnexes(profileId)` — lista anexos del perfil con join a `operation_centers` para mostrar nombre.
- `useCreateProfileAnnex()` / `useUpdateProfileAnnex()` / `useDeleteProfileAnnex()` — CRUD.
- `useMergedProfile(profileId, operationCenterId)` — devuelve perfil base fusionado con el anexo si existe (campo del anexo reemplaza al base cuando no es null).

### 4. Componente `src/components/config/ProfileAnnexesTab.tsx`
Pestaña nueva en `PositionProfileDetailDialog`:
- Lista de centros de operación que tienen anexo (cards con badge de campos modificados).
- Botón "+ Agregar Anexo" abre selector de centro de operación (solo los que no tienen anexo aún).
- Al seleccionar, muestra formulario donde cada sección tiene un checkbox "Personalizar este campo" — al activarlo, aparece el campo editable pre-llenado con el valor base.
- Vista comparativa: valor base (tachado o gris) vs valor del anexo.

### 5. Componente `src/components/config/ProfileAnnexForm.tsx`
Formulario de creación/edición del anexo:
- Select de centro de operación (solo en creación).
- Cada campo con toggle para activar/desactivar override.
- Campos: purpose, reports_to, supervises, num_positions, education_level, education_detail, experience, specific_knowledge, skills, functions, responsibilities, working_conditions.
- Campo `notes` para justificar las diferencias.

### 6. Modificar `PositionProfileDetailDialog.tsx`
Agregar tercera pestaña "Anexos por Centro" con icono `Building2` al `TabsList`, renderizando `ProfileAnnexesTab`.

### 7. Archivos

| Archivo | Acción |
|---|---|
| Migración SQL | Crear tabla `position_profile_annexes` + RLS |
| `src/types/positionProfile.ts` | Agregar tipos de anexo |
| `src/hooks/useProfileAnnexes.ts` | Nuevo — CRUD + merge |
| `src/components/config/ProfileAnnexesTab.tsx` | Nuevo — listado de anexos |
| `src/components/config/ProfileAnnexForm.tsx` | Nuevo — formulario de anexo |
| `src/components/config/PositionProfileDetailDialog.tsx` | Agregar pestaña |

### Forma de uso
1. Ve a **Catálogos > Cargos** y abre el perfil de un cargo.
2. Verás la nueva pestaña **"Anexos por Centro"**.
3. Haz clic en **"+ Agregar Anexo"**, selecciona un Centro de Operación.
4. Activa solo los campos que necesitas personalizar para ese centro (los demás se heredan del perfil base).
5. Guarda. En la lista verás el centro con badges indicando qué campos fueron modificados.
6. Para editar o eliminar un anexo, usa los botones en cada tarjeta.

