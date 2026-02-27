

# Plan: Generación de Video Educativo con Gemini 3 Flash Preview

## Cambios requeridos

### 1. Nueva Edge Function `generate-training-video`
**Archivo**: `supabase/functions/generate-training-video/index.ts`

- Recibe: `courseId`, `style`, `duration`, `title`, `content`, `puntosClave`, `companyId`
- Usa `google/gemini-3-flash-preview` para generar un **guion narrado** estructurado por escenas
- Usa el modelo de imágenes configurado (`gemini-3-pro-image-preview` o `gemini-2.5-flash-image`) para generar **3-6 imágenes** con el estilo visual seleccionado
- Cada estilo se mapea a un prompt específico:
  - **Clásico**: ilustración corporativa profesional
  - **Pizarra**: dibujo con tiza sobre pizarra verde/negra
  - **Kawaii**: estilo cute japonés con colores pasteles
  - **Anime**: estilo anime japonés detallado
  - **Acuarela**: pintura acuarela artística
  - **Dibujo Retro**: ilustración vintage años 60-70
  - **Legado**: estilo pergamino/manuscrito clásico
  - **Papiroflexia**: estilo origami/papel doblado 3D
- Guarda imágenes en bucket `training-media` y retorna guion + URLs
- Manejo de errores 429/402

### 2. Actualizar `supabase/config.toml`
- Registrar `generate-training-video` con `verify_jwt = false`

### 3. Actualizar UI en `CrearCapacitacion.tsx`
- Agregar estado `videoStyle` (default `'clasico'`)
- Reemplazar la tarjeta de Video Educativo deshabilitada por una funcional:
  - **Selector de estilo**: desplegable con los 8 estilos
  - **Selector de duración**: mantener el existente (controla cantidad de escenas)
  - **Botón "Generar"**: habilitado cuando hay `editId`, llama a la edge function
  - **Estado de carga**: spinner + texto indicando progreso
- Agregar handler `handleGenerateVideo` similar a `handleGenerateMedia` pero invocando `generate-training-video`
- Los resultados (guion + imágenes) se guardan en `training_media` como tipo `video`

### Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `supabase/functions/generate-training-video/index.ts` | Crear |
| `supabase/config.toml` | Modificar (agregar función) |
| `src/pages/capacitaciones/CrearCapacitacion.tsx` | Modificar (tarjeta video + estado + handler) |

