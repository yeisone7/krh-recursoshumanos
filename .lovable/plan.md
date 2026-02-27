

## Diagnóstico

Tu sospecha es correcta. Las 3 Edge Functions principales de generación de capacitaciones (`generate-training`, `generate-training-media`, `generate-training-video`) **ignoran completamente** las API keys que configuraste en Configuracion → IA. Siempre usan el Gateway de Lovable AI con `LOVABLE_API_KEY`, sin importar qué modelo o proveedor selecciones.

Solo `generate-training-audio` lee correctamente la configuración de `system_config` para usar tu API key de OpenAI.

El error "non-2xx status code" que ves es probablemente un error 402 (créditos insuficientes de Lovable AI) o 429 (rate limit), que confirma que tus API keys propias no se están usando.

## Plan: Conectar las 3 Edge Functions a la configuración de IA

### Cambios en cada Edge Function

Para `generate-training`, `generate-training-media` y `generate-training-video`:

1. **Agregar función `getAIConfig`** (como ya existe en `generate-training-audio`) que lee `ai_config` de `system_config` usando `companyId`.

2. **Implementar lógica de ruteo de proveedor**:
   - Si `ai_config.model === 'gemini'` y existe `gemini_api_key` → usar la API directa de Google (`https://generativelanguage.googleapis.com/...`)
   - Si `ai_config.model === 'openai'` y existe `openai_api_key` → usar la API directa de OpenAI
   - Si no hay API key configurada → fallback al Gateway de Lovable AI (comportamiento actual)

3. **Mapear modelos correctos** según proveedor:
   - Para contenido texto: Gemini directo usa `gemini-2.0-flash`, OpenAI usa `gpt-4o`
   - Para imágenes: Gemini directo usa `gemini-2.0-flash-exp-image-generation`
   - Mantener los modelos del Gateway de Lovable como fallback

### Cambios por función

**`generate-training/index.ts`** (contenido texto):
- Leer `companyId` del body (ya se envía desde el cliente)
- Agregar `getAIConfig(companyId)`
- Si hay `gemini_api_key`: llamar a `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` con la key
- Si hay `openai_api_key`: llamar a `https://api.openai.com/v1/chat/completions` con la key
- Si no hay keys: usar Gateway de Lovable (actual)

**`generate-training-media/index.ts`** (imágenes, mapas, infografías):
- Agregar `companyId` al body desde el cliente (verificar que se envía)
- Agregar `getAIConfig(companyId)`
- Si hay `gemini_api_key`: usar la API directa de Gemini para generación de imágenes
- Fallback al Gateway de Lovable

**`generate-training-video/index.ts`** (storyboard):
- Agregar `getAIConfig(companyId)`
- Rutear tanto la generación de guion como las imágenes según la configuración

### Mejora en mensajes de error

- Cuando el Gateway de Lovable retorne 402/429, mostrar un mensaje indicando que puede configurar sus propias API keys en Configuración → IA para evitar depender de los créditos de Lovable.

