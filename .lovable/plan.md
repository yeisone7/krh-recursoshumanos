
# Integracion de Avatar HeyGen en Capacitaciones

## Resumen

Agregar soporte para generar videos con avatar IA usando HeyGen. Incluye un campo para la API Key de HeyGen en la configuracion de IA, una nueva Edge Function para comunicarse con la API de HeyGen, y una tarjeta "Avatar Presentador" en la seccion de multimedia de capacitaciones.

## Paso 1: Campo de HeyGen API Key en Configuracion IA

En `src/pages/Configuracion.tsx`, dentro de la pestana "IA", agregar una tercera tarjeta (independiente de la seleccion Gemini/OpenAI) para la API Key de HeyGen:

- Tarjeta con icono de video/usuario, titulo "HeyGen - Avatar IA"
- Campo de API Key con toggle de visibilidad (Eye/EyeOff) y boton "Probar"
- La key se persiste en `system_config` dentro del objeto `ai_config` como `heygen_api_key`
- El boton "Probar" llamara a la API de HeyGen para listar avatares disponibles y confirmar que la key funciona

**Estado en el componente:**
- `heygenApiKey` / `setHeygenApiKey`
- `showHeygenKey` / `setShowHeygenKey`
- `testingHeygen` / `setTestingHeygen`

**Persistencia:** Se agrega `heygen_api_key` al objeto que ya se guarda en `handleSaveAiConfig`.

## Paso 2: Edge Function `generate-training-avatar`

Crear `supabase/functions/generate-training-avatar/index.ts` que:

1. Recibe: `courseId`, `companyId`, `script` (guion de texto), `avatarId` (opcional, usa uno por defecto)
2. Lee la `heygen_api_key` de `system_config` para la empresa
3. Llama a la API de HeyGen:
   - `POST https://api.heygen.com/v2/video/generate` con el guion y avatar seleccionado
   - Retorna un `video_id` para polling
4. Endpoint secundario para consultar estado: `GET https://api.heygen.com/v1/video_status.get?video_id=XXX`
5. Cuando el video esta listo, descarga y sube al bucket `training-media`
6. Inserta registro en `training_media` con `type = 'avatar'`

**Endpoints de HeyGen utilizados:**
- `GET /v2/avatars` - Listar avatares disponibles
- `POST /v2/video/generate` - Crear video
- `GET /v1/video_status.get` - Consultar estado

## Paso 3: Tarjeta "Avatar Presentador" en Multimedia

En `src/pages/capacitaciones/CrearCapacitacion.tsx`, agregar una nueva tarjeta despues del Storyboard:

- Icono de usuario/video, titulo "Avatar Presentador"
- Selector de avatar (dropdown con avatares disponibles de HeyGen)
- Boton "Generar Video con Avatar"
- Indicador de progreso (polling cada 10 segundos hasta que el video este listo)
- Reproductor de video cuando este completo

## Paso 4: Visualizacion en Vista Previa y Link Publico

- En `TrainingPreviewDialog.tsx`: Agregar seccion para mostrar videos de avatar (`type === 'avatar'`) con reproductor HTML5
- En `AccesoPublico.tsx`: Mostrar el video del avatar como reproductor integrado en la capacitacion publica

## Paso 5: Componente AvatarVideoPlayer

Crear `src/components/training/AvatarVideoPlayer.tsx`:
- Reproductor de video HTML5 con controles
- Estado de generacion con polling visual (barra de progreso o spinner)
- Mensaje informativo sobre el tiempo estimado de generacion (2-10 min)

## Archivos a modificar/crear

| Archivo | Accion |
|---------|--------|
| `src/pages/Configuracion.tsx` | Agregar campo HeyGen API Key en tab IA |
| `supabase/functions/generate-training-avatar/index.ts` | Crear Edge Function |
| `src/pages/capacitaciones/CrearCapacitacion.tsx` | Agregar tarjeta Avatar Presentador |
| `src/components/training/TrainingPreviewDialog.tsx` | Mostrar video avatar |
| `src/pages/capacitaciones/AccesoPublico.tsx` | Mostrar video avatar en link publico |
| `src/components/training/AvatarVideoPlayer.tsx` | Crear componente reproductor |

## Nota sobre la API Key

La API Key que proporcionaste (`sk_V2_hgu_...`) se almacenara de forma segura en la base de datos dentro de `system_config` (tabla ya existente), accesible solo desde las Edge Functions del servidor. No se hardcodeara en el codigo fuente.
