# Vistas previas de enlaces

Los enlaces generados por la aplicación añaden `company=<uuid>` como contexto de
presentación. Este parámetro no autoriza el acceso ni cambia la empresa del token.
Los tokens, rutas y fragmentos originales se conservan; la firma de dotación
mantiene su token exclusivamente en el fragmento.

Vercel sirve el HTML compilado de la aplicación mediante `api/link-preview.ts`.
Antes de enviarlo añade Open Graph y Twitter Cards, incluso para clientes que no
ejecutan JavaScript. Los archivos estáticos y las funciones existentes se sirven
desde el sistema de archivos de Vercel antes de la regla de respaldo. La ruta `/`
se resuelve explícitamente antes del sistema de archivos para que `index.html`
no oculte la marca de los enlaces de inicio. Por eso se utiliza `routes`, con una
fase `filesystem`, en lugar de las reglas `rewrites` habituales.

`server/link-preview/modules.ts` es el catálogo de títulos y descripciones fijos.
Las rutas de cada módulo incluyen sus subrutas. Las pruebas comprueban la cobertura
de las rutas declaradas. No se consultan empleados, documentos ni tokens para
generar una vista previa. No se refleja la URL de acceso en el HTML ni en la URL de
la imagen, evitando publicar tokens o identificadores personales en los metadatos.

`api/link-preview-image.ts` genera un PNG de 1200 × 630 con el logo de la empresa,
el título del módulo y su descripción. La consulta pública de marca selecciona
únicamente `name`, `logo_url` y `horizontal_logo_url` de `companies`. Prefiere el
logo horizontal y admite imágenes públicas del bucket `company_logos` del mismo
proyecto, sin redirecciones a otros servidores. No utiliza claves de servicio.

Las variables existentes `VITE_SUPABASE_URL` y
`VITE_SUPABASE_PUBLISHABLE_API_KEY` (o su nombre anterior) deben estar disponibles
en las funciones de Vercel. `PUBLIC_APP_URL` permite sustituir el dominio público
predeterminado `https://empatiq.portalpetrocasinos.com`.

El HTML no se almacena en caché. Las imágenes con marca válida se cachean durante
cinco minutos por empresa y módulo. Si falta la empresa, su logo o la consulta
falla, se utiliza una presentación neutra, nunca el logo de otra empresa. Los
enlaces antiguos sin `company` mantienen su acceso y muestran la vista neutra;
volver a copiarlos desde la app añade la empresa. WhatsApp y otras plataformas
pueden conservar su propia caché de vistas previas de enlaces ya compartidos.

Validación: `npm run test -- src/lib/shareLink.test.ts src/lib/linkPreview.test.ts`
y `npm run build`. Para verificar el servicio completo y producir ejemplos de las
miniaturas: `node scripts/verify-link-previews.mjs` después de compilar.
