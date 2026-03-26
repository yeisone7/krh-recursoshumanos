

## Plan: Imagen de Bienvenida en Auto-registro + Mensaje de Agradecimiento a No Seleccionados

### Resumen
1. Agregar la imagen de bienvenida al proceso de seleccion al inicio de la pagina de auto-registro del candidato.
2. Crear funcionalidad para enviar un mensaje de agradecimiento (con la segunda imagen) a candidatos no seleccionados.

### Implementacion

**1. Copiar imagenes al proyecto**
- Copiar `IMAGEN_PROCESO_DE_SELECCIÓN_PETROCASINOS.png` a `public/images/`
- Copiar `IMAGEN_DE_AGRADECIMIENTO_PETROCASINOS.png` a `public/images/`

**2. Modificar `src/pages/RegistroPublico.tsx`**
- Cuando el `target_type` es candidato, mostrar la imagen de bienvenida al proceso de seleccion ANTES del formulario (encima del CardHeader actual).
- La imagen se muestra a ancho completo dentro del Card, con bordes redondeados superiores.

**3. Boton "Enviar Agradecimiento" en el detalle del candidato**
- En `src/components/selection/CandidateDetailDialog.tsx`, cuando el candidato tiene status `not_selected`, mostrar un boton "Enviar Agradecimiento".
- Al hacer clic, abre un dialogo de confirmacion que muestra una vista previa de la imagen de agradecimiento.
- Al confirmar, se invoca un edge function que envia un email al candidato con la imagen embebida y un mensaje de agradecimiento.

**4. Edge Function `send-candidate-thanks`**
- Recibe `candidateId` y `companyId`.
- Consulta el email del candidato.
- Envia email via Resend (ya configurado en el proyecto) con:
  - Asunto: "Agradecimiento - Proceso de Seleccion [NombreEmpresa]"
  - Cuerpo HTML con la imagen de agradecimiento embebida y texto complementario.
- Registra en la tabla de candidatos que se envio el agradecimiento (campo `thanks_sent_at`).

**5. Migracion SQL**
- Agregar columna `thanks_sent_at TIMESTAMPTZ` a la tabla `candidates` para evitar envios duplicados.

**6. Componente `ThankYouPreviewDialog.tsx`**
- Dialogo que muestra preview de la imagen y boton de confirmar envio.
- Se deshabilita si el candidato no tiene email o si ya se envio (`thanks_sent_at` no es null).

### Archivos

| Archivo | Accion |
|---|---|
| `public/images/IMAGEN_PROCESO_DE_SELECCION.png` | Copiar imagen de bienvenida |
| `public/images/IMAGEN_AGRADECIMIENTO.png` | Copiar imagen de agradecimiento |
| `src/pages/RegistroPublico.tsx` | Agregar imagen de bienvenida para candidatos |
| `src/components/selection/CandidateDetailDialog.tsx` | Agregar boton "Enviar Agradecimiento" |
| `src/components/selection/ThankYouPreviewDialog.tsx` | Nuevo - preview + confirmacion |
| `supabase/functions/send-candidate-thanks/index.ts` | Nuevo - envio de email |
| Migracion SQL | Agregar `thanks_sent_at` a `candidates` |

