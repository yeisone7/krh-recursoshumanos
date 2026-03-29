

## Plan: Portal del Empleado — Self-Service Mejorado

### Resumen
Agregar tres capacidades clave al portal existente: (1) solicitar vacaciones y permisos directamente, (2) consultar y descargar recibos de nómina, y (3) generar certificados laborales bajo demanda.

---

### Estado Actual
- El portal ya muestra: datos personales, documentos, saldos de vacaciones (solo lectura), incapacidades y solicitudes de cambio de datos.
- Ya existen hooks `useCreateVacationRequest` y `useCreateLeaveRequest` en el sistema administrativo.
- No existe tabla de recibos de nómina ni generador de certificados laborales.

---

### Fase 1: Solicitar Vacaciones y Permisos desde el Portal

**Cambios:**
- **`PortalVacationsLeaves.tsx`**: Agregar botón "Solicitar Vacaciones" que abre un formulario simplificado (no necesita selector de empleado, ya se sabe quién es). Campos: tipo (disfrute/compensación), fecha inicio, fecha fin, motivo.
- **`PortalVacationsLeaves.tsx`**: Agregar botón "Solicitar Permiso" con formulario: tipo de permiso (desde `leave_type_config`), fechas, motivo, adjunto opcional.
- **`src/components/portal/PortalVacationRequestForm.tsx`**: Nuevo componente — formulario de solicitud de vacaciones adaptado al portal.
- **`src/components/portal/PortalLeaveRequestForm.tsx`**: Nuevo componente — formulario de solicitud de permisos adaptado al portal.
- **`useEmployeePortal.ts`**: Agregar mutations `createVacationRequest` y `createLeaveRequest` que reutilizan la lógica existente pero con el employee_id del empleado vinculado.
- **RLS**: Las tablas `vacation_requests` y `leave_requests` ya tienen RLS; se agrega política para que el empleado vinculado pueda insertar sus propias solicitudes.

**Migración SQL:**
- Política RLS en `vacation_requests`: INSERT para usuarios autenticados donde `employee_id = get_my_employee_id()`.
- Política RLS en `leave_requests`: INSERT para usuarios autenticados donde `employee_id = get_my_employee_id()`.

---

### Fase 2: Recibos de Nómina

**Migración SQL:**
- Nueva tabla `payroll_receipts`:
  - `id`, `company_id`, `employee_id`, `period_start`, `period_end`, `period_label` (ej: "Marzo 2026"), `file_url` (referencia a storage), `file_name`, `total_earnings`, `total_deductions`, `net_pay`, `created_at`, `created_by`
- RLS: SELECT para empleados vinculados (`employee_id = get_my_employee_id()`), INSERT/UPDATE/DELETE solo para usuarios admin/rrhh.

**Archivos:**
- **`src/components/portal/PortalPayslips.tsx`**: Nueva pestaña — lista de recibos con periodo, devengado, deducciones, neto, y botones ver/descargar PDF.
- **`Portal.tsx`**: Agregar pestaña "Nómina" con icono `Wallet`.
- **`useEmployeePortal.ts`**: Agregar query para `payroll_receipts`.

> Nota: La carga de recibos se hará desde el módulo administrativo de nómina (fuera del portal). El portal solo consulta y descarga.

---

### Fase 3: Certificados Laborales

**Archivos:**
- **`src/components/portal/PortalCertificates.tsx`**: Nueva pestaña — botón "Generar Certificado Laboral" que produce un PDF con datos del empleado (nombre, documento, cargo, fecha de ingreso, salario, tipo de contrato).
- **`src/lib/laborCertificatePdfGenerator.ts`**: Nuevo — genera el PDF con encabezado corporativo, datos del empleado y fecha de expedición. Formato estándar colombiano.
- **`Portal.tsx`**: Agregar pestaña "Certificados" con icono `Award`.

> No requiere tabla nueva; se genera dinámicamente con los datos ya disponibles del empleado.

---

### Resumen de Archivos

| Archivo | Acción |
|---|---|
| Migración SQL | RLS para solicitudes + tabla `payroll_receipts` |
| `src/components/portal/PortalVacationRequestForm.tsx` | Nuevo — formulario solicitud vacaciones |
| `src/components/portal/PortalLeaveRequestForm.tsx` | Nuevo — formulario solicitud permisos |
| `src/components/portal/PortalPayslips.tsx` | Nuevo — pestaña recibos de nómina |
| `src/components/portal/PortalCertificates.tsx` | Nuevo — pestaña certificados laborales |
| `src/lib/laborCertificatePdfGenerator.ts` | Nuevo — generador PDF certificado laboral |
| `src/components/portal/PortalVacationsLeaves.tsx` | Agregar botones de solicitud |
| `src/hooks/useEmployeePortal.ts` | Agregar mutations y queries |
| `src/pages/Portal.tsx` | Agregar 2 pestañas nuevas (Nómina, Certificados) |
| `src/components/portal/index.ts` | Exportar nuevos componentes |

---

### Pestañas del Portal (resultado final)

```text
Mis Datos | Documentos | Vacaciones/Permisos | Incapacidades | Nómina | Certificados | Solicitudes
```

