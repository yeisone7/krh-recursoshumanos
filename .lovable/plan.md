

## Plan: Agregar watermark del logo a imágenes generadas con IA

### Enfoque
Aplicar el logo como marca de agua en la esquina inferior derecha de las imágenes generadas, usando Canvas API en el navegador (cliente). Esto es mas confiable que intentar manipular imágenes en el servidor (Deno no tiene Canvas nativo).

### Cambios

1. **Copiar el logo subido a `public/images/petrocasinos-watermark.png`** para que esté disponible como asset estático.

2. **Crear `src/lib/watermark.ts`** - Utilidad que:
   - Carga la imagen generada (base64 o URL) y el logo en un Canvas
   - Dibuja el logo en la esquina inferior derecha con tamaño proporcional (~15% del ancho) y opacidad ~0.7
   - Retorna un `Blob` PNG listo para subir

3. **Modificar `supabase/functions/generate-training-media/index.ts`**:
   - Agregar parámetro `skipUpload` al body
   - Cuando `skipUpload === true`, retornar solo el base64 sin subir a storage (el cliente hará la subida después de aplicar el watermark)

4. **Modificar `handleGenerateMedia` en `CrearCapacitacion.tsx`**:
   - Pasar `skipUpload: true` al invocar la función
   - Recibir el base64, aplicar watermark con la utilidad
   - Subir el blob resultante a `training-media` bucket via Supabase Storage SDK
   - Guardar el registro en `training_media` con la URL pública

5. **Modificar `handleGenerateMedia` en `TrainingPreviewDialog.tsx`**:
   - Misma lógica que el punto anterior

### Detalles técnicos

La utilidad de watermark usa Canvas 2D nativo del navegador:
```typescript
// Pseudocódigo
const canvas = document.createElement('canvas');
ctx.drawImage(generatedImage, 0, 0);
ctx.globalAlpha = 0.7;
ctx.drawImage(logo, canvas.width - logoWidth - padding, canvas.height - logoHeight - padding, logoWidth, logoHeight);
canvas.toBlob(callback, 'image/png');
```

No requiere dependencias adicionales. El logo se escala proporcionalmente al tamaño de la imagen generada.

