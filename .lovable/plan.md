

## Plan: Catálogo de Exámenes + Profesiograma + Transacción-Detalle para Exámenes Médicos

### Resumen

Replicar la arquitectura completa de Dotaciones para el módulo de Exámenes Médicos: un catálogo CRUD de tipos de examen, un profesiograma por centro+cargo, y un sistema de entregas transacción-detalle con firma, archivos adjuntos, exportación PDF y eliminación.

---

### 1. Base de datos (migración SQL)

**Nuevas tablas:**

- **`exam_catalog`** — Catálogo de exámenes aplicables (equivalente a `dotation_item_types`)
  - `id`, `company_id`, `name`, `code`, `description`, `is_active`, `created_by`, `created_at`, `updated_at`
  - UNIQUE(company_id, name)
  - RLS: misma política que `dotation_item_types`

- **`exam_profesiograma`** — Perfiles de exámenes por centro+cargo (clon de `dotation_profesiograma`)
  - `id`, `company_id`, `operation_center_id`, `position_id`, `created_by`, `created_at`, `updated_at`
  - UNIQUE(company_id, operation_center_id, position_id)

- **`exam_profesiograma_items`** — Ítems del profesiograma (clon de `dotation_profesiograma_items`)
  - `id`, `profesiograma_id` → FK `exam_profesiograma`, `exam_catalog_id` → FK `exam_catalog`, `is_required`, `notes`, `created_at`
  - UNIQUE(profesiograma_id, exam_catalog_id)

- **`exam_delivery_transactions`** — Cabecera de transacciones (clon de `dotation_delivery_transactions`)
  - `id`, `employee_id` → FK `employees_v2`, `exam_date` (DATE), `provider`, `doctor_name`, `signature_url`, `document_url`, `observations`, `created_by`, `created_at`, `updated_at`

- **`exam_delivery_items`** — Detalle de exámenes aplicados por transacción
  - `id`, `transaction_id` → FK `exam_delivery_transactions`, `exam_catalog_id` → FK `exam_catalog`, `exam_name` (TEXT), `result` (enum `exam_result`), `concept`, `restrictions`, `expiration_date`, `document_url`

**RLS:** Replicar las políticas de dotación: `is_admin_or_rrhh()` + `has_employee_v2_access()` para escritura, `has_employee_v2_access()` para lectura.

**Datos iniciales:** Insertar los 11 registros del catálogo para la empresa actual del usuario usando el insert tool.

**RPC:** Crear `get_exam_profesiogramas_with_items(_company_id)` análogo a `get_profesiogramas_with_items`.

---

### 2. Hooks (lógica de datos)

- **`useExamCatalog.ts`** — CRUD del catálogo (listar, crear, actualizar, eliminar). Patrón idéntico a tipos de dotación.
- **`useExamProfesiograma.ts`** — CRUD de profesiogramas de exámenes. Clonar `useDotationProfesiograma.ts` adaptando nombres de tabla.
- **`useExamTransactions.ts`** — Transacciones con detalle. Clonar `useDotationTransactions.ts` adaptando a las tablas de exámenes.

---

### 3. Interfaz de usuario

Reestructurar la página `/examenes` para usar **Tabs** como en Dotación:

- **Tab "Aplicaciones"** — Vista transacción-detalle (tabla con empleado, exámenes aplicados, fecha, estado, acciones: ver, exportar PDF, eliminar)
- **Tab "Catálogo"** — CRUD de tipos de examen (tabla con nombre, código, estado activo/inactivo, botones crear/editar/eliminar)
- **Tab "Profesiograma"** — Perfiles de exámenes por centro+cargo (clonar `ProfesiogramaTab` de dotación adaptado a exámenes)
- **Tab "Cumplimiento"** — Cruce profesiograma vs aplicaciones reales (fase posterior, se puede dejar placeholder)

**Componentes nuevos:**
- `ExamCatalogTab.tsx` — Tabla CRUD del catálogo
- `ExamCatalogFormDialog.tsx` — Formulario crear/editar tipo de examen
- `ExamProfesiogramaTab.tsx` — Clon de `ProfesiogramaTab` para exámenes
- `ExamProfesiogramaFormDialog.tsx` — Formulario del profesiograma
- `ExamTransactionFormDialog.tsx` — Formulario de aplicación (3 pasos: empleado → exámenes con sugerencias del profesiograma → datos de entrega con firma)
- `ExamTransactionDetailDialog.tsx` — Vista detalle con firma, archivos adjuntos, exportación PDF

---

### 4. Funcionalidades clave

- **Firma digital:** Reutilizar `SignatureCanvas` existente
- **Archivos adjuntos:** Almacenar en bucket `documents` o `dotation-images`
- **Exportación PDF:** Generar acta de aplicación de exámenes similar al acta de entrega de dotación
- **Eliminación:** Confirmación con AlertDialog, cascade delete de ítems
- **Profesiograma → Sugerencias:** Al seleccionar empleado en el formulario, autosugerir exámenes del profesiograma configurado para su centro+cargo

---

### 5. Orden de implementación

1. Migración de base de datos (tablas + RLS + RPC)
2. Insertar datos iniciales del catálogo
3. Hooks de datos (catálogo, profesiograma, transacciones)
4. Tab Catálogo con CRUD
5. Tab Profesiograma
6. Tab Aplicaciones (transacción-detalle) con formulario, detalle, firma, exportación y eliminación
7. Actualizar página Examenes.tsx con la nueva estructura de tabs

