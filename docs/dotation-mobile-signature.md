# Firma móvil de recibido de dotación

Desde el detalle de una entrega pendiente, una persona con permiso de actualización puede generar y copiar un enlace. El empleado ingresa su cédula, revisa los artículos, confirma el recibido y dibuja su firma. No requiere una cuenta.

## Comportamiento

- Enlaces firmados con HMAC-SHA256, válidos exactamente 24 horas y asociados a empresa, empleado y entrega. El token va en el fragmento de `/dotacion/firma#token=…`.
- No hay tabla de enlaces, historial, recuperación, revocación individual ni persistencia del enlace en el navegador. El preview conserva el enlace únicamente en memoria. Crear otro no revoca los anteriores.
- Cualquier firma existente impide la firma móvil. La aceptación móvil es inmutable, incluso desde el formulario presencial. Las firmas presenciales anteriores conservan la posibilidad de reemplazo por personal autorizado.
- Se registra la referencia privada de la imagen, `signed_at`, `signature_source` y la versión `dotation-received-v1` del texto: «Confirmo haber recibido los artículos relacionados».
- Las firmas nuevas usan el bucket privado `dotation-signatures`. Las imágenes antiguas siguen funcionando. Preview y exportación obtienen acceso temporal; el PDF no se exporta silenciosamente sin una firma que debería incluir.
- Cinco fallos de identificación por entrega e IP bloquean nuevos intentos durante 15 minutos. Solo se conserva un HMAC de la IP y contadores; la ventana expira y los contadores antiguos se eliminan al procesar nuevas identificaciones.
- El servidor compara la revisión de artículos al aceptar, serializa la aceptación con los cambios en los artículos y rechaza duplicados. La firma presencial también invalida los enlaces pendientes.

## Publicación

Aplicar en orden las migraciones `20261022203629`, `20261022205217` y `20261022205432`. Configurar `DOTATION_SIGNATURE_SECRET` con al menos 32 caracteres aleatorios mediante secretos de Supabase, nunca en variables `VITE_`. Publicar `public-dotation-signature` con `verify_jwt=false`: la generación autentica el JWT internamente y las operaciones públicas verifican HMAC, vencimiento e identidad.

La función utiliza las claves modernas configuradas en `SUPABASE_PUBLISHABLE_KEYS` y `SUPABASE_SECRET_KEYS`. La interfaz se publica después del backend, con las variables de Supabase habituales. La ruta pública debe devolver la aplicación SPA; la configuración existente de Vercel ya permite esto.

No registrar cuerpos de peticiones, tokens ni cédulas en telemetría. No rotar el secreto durante una publicación normal: una rotación invalida todos los enlaces pendientes.

## Pruebas

`supabase/tests/dotation_mobile_signature.sql` valida identidad, permisos por centro, aislamiento, revisión, vencimiento, aceptación única y acceso a las imágenes; todos los datos de prueba se revierten.

Vitest cubre los tokens, la página móvil, generación/copia del enlace, cierre del preview, recepción de firma, aislamiento de la ruta y el lienzo. Las verificaciones de navegador deben cubrir anchos de 360, 390, 768 y 1366 píxeles, firma táctil, exportación PDF y recuperación tras errores de red.

El backend puede desplegarse sin habilitar todavía la interfaz: las columnas son aditivas y las firmas antiguas siguen disponibles.
