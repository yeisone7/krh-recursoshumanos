

## Plan: Adjuntar documentos a candidatos

### Resumen
Crear una tabla `candidate_documents` y agregar una pestaña "Documentos" en el diálogo de detalle del candidato, replicando el patrón existente de `vacancy_documents`.

### Cambios

**1. Migración de base de datos** — Crear tabla `candidate_documents`
- Misma estructura que `vacancy_documents` pero con `candidate_id` en vez de `vacancy_id`
- Columnas: `id`, `candidate_id` (FK), `company_id` (FK), `document_name`, `file_url`, `file_name`, `file_size`, `mime_type`, `observations`, `uploaded_by`, `created_at`, `updated_at`
- RLS: lectura/escritura para usuarios autenticados con acceso a la empresa
- Storage: reutilizar el bucket `documents` existente

**2. CandidateDetailDialog.tsx** — Agregar pestaña "Documentos"
- Nueva pestaña con ícono `FileText` junto a "Proceso" e "Información"
- Funcionalidad de carga de archivos (PDF, imágenes, Word, Excel, hasta 10MB)
- Lista de documentos con opción de ver/descargar y eliminar
- Seguir el mismo patrón de código usado en `VacancyDetailDialog` para documentos

### Detalles técnicos
- Path de archivos en storage: `candidates/docs_{candidateId}_{timestamp}.{ext}`
- Se importará `supabase` y `useAuth` directamente en el componente
- Los tipos se actualizarán automáticamente tras la migración

