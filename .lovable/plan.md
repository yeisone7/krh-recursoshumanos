

## Plan: Sistema de Enlaces Públicos para Auto-registro de Candidatos y Empleados

### Concepto

Crear un sistema donde el empleador genera un enlace con token, seleccionando qué campos debe llenar el candidato/empleado. El destinatario abre el enlace público (sin necesidad de autenticarse) y completa solo los campos habilitados.

Se reutiliza el patrón ya existente en el proyecto con `training_access_tokens` y la página `/capacitacion`.

---

### 1. Base de datos (migración)

Crear tabla `self_registration_tokens`:

| Columna | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | Empresa |
| token | text unique | Token generado (UUID) |
| target_type | text | `'candidate'` o `'employee'` |
| vacancy_id | uuid FK nullable | Solo para candidatos |
| enabled_fields | jsonb | Array de campos habilitados (ej: `["phone","address","city","birthDate","gender","educationLevel"]`) |
| is_used | boolean | Si ya fue utilizado |
| used_at | timestamptz | Cuándo se usó |
| expires_at | timestamptz | Expiración |
| created_by | uuid | Usuario que creó el link |
| created_at / updated_at | timestamptz | |

- RLS: Lectura pública (anon + authenticated) para validar tokens; inserción/actualización restringida a miembros de la empresa.

### 2. Diálogo de generación de enlace

Componente `GenerateRegistrationLinkDialog`:
- Recibe `target_type` (`candidate` | `employee`) y opcionalmente `vacancyId`.
- Muestra una lista de checkboxes con todos los campos del formulario correspondiente, organizados por sección (Personal, Contacto, Laboral, etc.).
- Campos como nombre, apellido y documento siempre estarán habilitados (no se pueden desmarcar).
- Permite configurar fecha de expiración (1 día, 3 días, 7 días, 30 días).
- Al confirmar, genera un token UUID, lo guarda en la tabla y muestra el enlace copiable: `{APP_URL}/registro?token=xxx`.

### 3. Página pública de auto-registro (`/registro`)

Nueva página `src/pages/RegistroPublico.tsx`:
- Ruta pública sin autenticación (como `/capacitacion`).
- Flujo: Carga token → valida vigencia → muestra formulario con solo los campos habilitados → guarda datos.
- Para **candidatos**: Inserta en tabla `candidates` con `source = 'auto_registro'`.
- Para **empleados**: Inserta en tabla `employees_v2` + `employee_contact` + `employee_work_info` según los campos llenados.
- Al completar, marca el token como `is_used = true`.
- Diseño con branding de la app (logo, colores), similar al AccesoPublico de capacitaciones.

### 4. Integración en las vistas existentes

- **Vacante (VacancyDetailDialog)**: Botón "Generar enlace para candidato" en la pestaña de Candidatos, que abre el diálogo con `target_type='candidate'` y `vacancyId`.
- **Empleados (página de empleados)**: Botón "Generar enlace de registro" que abre el diálogo con `target_type='employee'`.

### 5. Gestión de enlaces generados

- Dentro de la pestaña Candidatos de la vacante: listado simple de enlaces activos con estado (pendiente/usado/expirado), opción de copiar y desactivar.
- Similar para empleados.

### 6. Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| Migración SQL | Crear tabla + RLS |
| `src/hooks/useRegistrationTokens.ts` | Hook para CRUD de tokens |
| `src/components/registration/GenerateRegistrationLinkDialog.tsx` | Diálogo de selección de campos y generación |
| `src/components/registration/RegistrationTokensList.tsx` | Lista de enlaces generados |
| `src/pages/RegistroPublico.tsx` | Página pública del formulario |
| `src/App.tsx` | Agregar ruta `/registro` |
| `src/components/vacancies/VacancyDetailDialog.tsx` | Agregar botón y lista de enlaces |

