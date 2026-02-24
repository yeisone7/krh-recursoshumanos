

# Plan: Modulo Completo de Capacitaciones con IA

Dado el tamano de este modulo, la implementacion se dividira en **5 fases secuenciales**. Cada fase se implementara en un mensaje separado para evitar errores por exceso de cambios.

---

## Fase 1: Base de Datos y Storage

### Cambios en tablas existentes
La tabla `training_courses` ya existe pero le faltan columnas. Se agregaran mediante ALTER TABLE:
- `level` (text default 'basico')
- `audience` (text)
- `objective` (text)
- `legal_framework` (text)
- `risk_level` (text default 'medio')
- `language` (text default 'es')
- `status` (text default 'borrador') -- estado del curso: borrador, publicado, completado
- `version` (integer default 1)

La tabla `training_attendance` ya existe pero le falta:
- `signature_data` (text) -- firma digital base64
- Se renombrara conceptualmente a "attendees" pero la tabla fisica mantiene su nombre

### Nuevas tablas
1. **training_access_tokens** - Enlaces de acceso temporal para personal sin cuenta
2. **training_completions** - Evidencias de capacitacion completada con firma digital
3. **training_media** - Archivos multimedia vinculados a cursos

### Storage
- Crear bucket publico `training-media`

### RLS
- Politicas estandar por company_id para tablas protegidas
- Politicas de acceso anonimo (anon) en `training_access_tokens` (SELECT, UPDATE) y `training_completions` (INSERT) para el flujo publico

---

## Fase 2: Edge Functions + Dependencias

### Nuevas dependencias npm
- `react-markdown` - renderizado de contenido markdown
- `qrcode.react` - generacion de codigos QR

### Edge Functions
1. **extract-pdf** - Recibe PDF via FormData, extrae texto, lo retorna
2. **generate-training** - Usa Lovable AI (google/gemini-3-flash-preview) para generar contenido estructurado de capacitacion. Retorna JSON con introduccion, objetivos, contenido markdown, puntos clave y evaluacion

---

## Fase 3: Componentes Reutilizables y Hooks

### Nuevos componentes compartidos
- `SignatureCanvas` - Canvas HTML5 para captura de firma (touch + mouse)
- `EvaluationQuiz` - Componente de evaluacion con retroalimentacion visual
- `TrainingPreviewDialog` - Vista previa de capacitacion con markdown
- `TrainingMediaGallery` - Galeria de multimedia
- `ImageUploader` - Subida de imagenes al bucket training-media
- `MarkdownContent` - Renderizado de markdown con estilos

### Actualizacion de hooks
- Extender `useTraining.ts` con hooks para las nuevas tablas: `useTrainingAccessTokens`, `useTrainingCompletions`, `useTrainingMedia`
- Actualizar tipos en `src/types/training.ts`

---

## Fase 4: Paginas Protegidas

### Nuevas paginas
1. **Capacitaciones Dashboard** - Reescribir la pagina actual con banner IA, KPIs con tendencia, alertas, acciones rapidas, y las tabs existentes mejoradas
2. **/capacitaciones/crear** - Flujo de 3 pasos con IA (Parametros, Contexto+PDF+IA, Revision). Soporte de edicion via ?id=xxx
3. **/capacitaciones/crear-manual** - Flujo de 3 pasos sin IA (Parametros, Contenido manual, Evaluacion manual)
4. **/capacitaciones/biblioteca** - 3 modos de vista (Grid, Arbol, Lista) con busqueda y filtros
5. **/capacitaciones/acceso/generar** - Layout 2 columnas: formulario + lista de enlaces con QR
6. **/capacitaciones/evidencias** - Registro de completaciones con firmas, vista tabla/arbol, exportacion PDF
7. **/capacitaciones/analiticas** - Dashboard de metricas con graficos recharts

### Actualizacion de rutas
- Agregar todas las rutas protegidas nuevas en `App.tsx`
- Actualizar el sidebar con submenu de Capacitaciones expandible (Dashboard, Nueva con IA, Nueva Manual, Biblioteca, Enlaces, Evidencias, Analiticas)

---

## Fase 5: Pagina Publica de Acceso

### Pagina NO protegida
- **/capacitaciones/acceso?token=xxx** - Flujo publico sin autenticacion
  1. Validar token
  2. Identificacion (nombre, cedula segun configuracion)
  3. Mostrar contenido de capacitacion con multimedia
  4. Evaluacion (quiz si es requerida, debe aprobar 100%)
  5. Firma digital (SignatureCanvas)
  6. Registro de completacion con IP y user_agent

### Cambios en App.tsx
- Agregar la ruta publica fuera del bloque ProtectedRoute

---

## Resumen de archivos a crear/modificar

### Migraciones SQL
- 1 migracion con ALTER TABLE, CREATE TABLE, RLS, storage bucket

### Edge Functions (2)
- `supabase/functions/extract-pdf/index.ts`
- `supabase/functions/generate-training/index.ts`

### Paginas nuevas (7)
- `src/pages/capacitaciones/CrearCapacitacion.tsx`
- `src/pages/capacitaciones/CrearManual.tsx`
- `src/pages/capacitaciones/Biblioteca.tsx`
- `src/pages/capacitaciones/GenerarAcceso.tsx`
- `src/pages/capacitaciones/AccesoPublico.tsx`
- `src/pages/capacitaciones/Evidencias.tsx`
- `src/pages/capacitaciones/Analiticas.tsx`

### Componentes nuevos (~8)
- `src/components/training/SignatureCanvas.tsx`
- `src/components/training/EvaluationQuiz.tsx`
- `src/components/training/TrainingPreviewDialog.tsx`
- `src/components/training/TrainingMediaGallery.tsx`
- `src/components/training/ImageUploader.tsx`
- `src/components/training/MarkdownContent.tsx`
- `src/components/training/QRCodeDialog.tsx`
- `src/components/training/TrainingStepIndicator.tsx`

### Archivos modificados
- `src/pages/Capacitaciones.tsx` - Reescritura con banner IA y acciones rapidas
- `src/hooks/useTraining.ts` - Nuevos hooks
- `src/types/training.ts` - Nuevos tipos
- `src/components/training/index.ts` - Nuevos exports
- `src/components/layout/Sidebar.tsx` - Submenu de capacitaciones
- `src/App.tsx` - Nuevas rutas (protegidas y publica)
- `supabase/config.toml` - Registro de edge functions

