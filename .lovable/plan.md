

## Plan: Documentos Compartidos entre Candidatos y Empleados

### Resumen
Agregar una nueva pestaña **"Docs Compartidos"** en el detalle del candidato que muestra los documentos de la tabla `employee_documents` cuando el candidato tiene un `employee_id` vinculado. Esto permite que desde Selección se vean y gestionen los mismos documentos que aparecen en la pestaña "Docs" de Empleados.

### Cambios

**1. CandidateDetailDialog.tsx** — Nueva pestaña "Docs Compartidos"
- Agregar una cuarta pestaña con ícono `FolderOpen` llamada "Docs Compartidos"
- Solo visible cuando el candidato tiene `employee_id` (ya existe este campo en la tabla `candidates`)
- Consultar `employee_documents` filtrando por el `employee_id` del candidato
- Mostrar lista de documentos con tipo, nombre, fecha, tamaño
- Acciones: ver/descargar (misma lógica que Tab360Documents con signed URLs)
- Permitir subir nuevos documentos usando el mismo `DocumentFormDialog` de empleados, pasando el `employee_id` del candidato
- Sin opción de eliminar desde candidatos (solo lectura + subida)

**2. Sin cambios en base de datos**
- No se necesita migración: se reutiliza `employee_documents` y el campo `employee_id` ya existente en `candidates`

### Detalles técnicos
- Importar `useEmployeeDocuments` de `@/hooks/useEmployeeHealth` para obtener documentos
- Importar `DocumentFormDialog` de `@/components/employees` para subir documentos al empleado
- Los documentos se acceden via signed URL del bucket `documents` (privado)
- La pestaña muestra un mensaje informativo si el candidato aún no está vinculado a un empleado

