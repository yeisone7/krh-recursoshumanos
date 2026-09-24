# Pestañas internas

En computador (ancho desde 768 px), el menú abre o activa una pestaña por pantalla. Las fichas 360 tienen una pestaña por empleado. Los filtros de URL pertenecen a la pestaña y no crean duplicados. Se admiten diez pestañas; al llegar al límite se solicita cerrar alguna.

Las pantallas permanecen montadas hasta que se cierran. Conservan estado React, campos sin guardar y desplazamiento. La sesión de autenticación y la caché de React Query son compartidas. Los diálogos y paneles laterales ofrecen **Volver a pestañas**; **Continuar formulario** los recupera. Sus formularios permanecen en un portal estable mientras la capa modal se desmonta, liberando foco, teclado y bloqueo del cuerpo. Los menús y confirmaciones transitorios se ocultan con la pantalla propietaria.

## Navegación y restauración

- La dirección representa la pestaña activa. Los enlaces del menú sin parámetros recuperan sus filtros; enlaces con parámetros y Atrás/Adelante aplican el destino explícito.
- Cerrar una pestaña con cambios o reemplazar su registro requiere confirmar el descarte. Cerrar la activa selecciona la anterior; cerrar la última abre Inicio.
- `sessionStorage`, con clave versionada por usuario y empresa, conserva únicamente rutas, orden y selección. No se serializan datos de formularios, archivos ni credenciales. Una recarga pierde los borradores y solicita la advertencia nativa si hay cambios.
- Una dirección explícita prevalece sobre la selección guardada. Al abrir `/`, se recupera la última selección de esa sesión. Las rutas públicas, ingreso, portal y reloj dedicado quedan fuera del espacio de pestañas.
- Los permisos se verifican al restaurar y en cada cambio. Requisiciones conserva su acceso especial por asignación al flujo. Las pestañas revocadas se desmontan; no se reutilizan datos de otro usuario o empresa.
- Cambiar empresa o cerrar sesión pide confirmar cambios pendientes. El cierre obligatorio por inactividad no puede ser bloqueado por un borrador.
- El celular conserva navegación de una sola pantalla. Cambiar el tamaño de la ventana no desmonta el trabajo actual; las pestañas anteriores vuelven a estar disponibles al regresar a escritorio.

## Integración de nuevas pantallas

La definición compartida está en `src/routes/workspaceRoutes.tsx`. Cada entrada contiene ruta, título, permisos y componente. El identificador de pestaña es la ruta concreta normalizada; las búsquedas no forman parte de la identidad.

Los formularios que usan `Form` de `components/ui/form` registran automáticamente `isDirty` e `isSubmitting`. Deben llamar `reset(datosGuardados)` después de guardar si permanecen abiertos. Los diálogos con estado local tienen protección conservadora para cambios de controles; se libera al cerrar el diálogo.

Para otros editores, usar `useWorkspaceDirty(hasUnsavedChanges)` con su comparación entre borrador y datos guardados. Como alternativa, `useWorkspaceEditor()` aporta `captureProps` para controles comunes y `markChanged`/`markSaved` para acciones personalizadas. Llamar `markSaved` únicamente después de guardar satisfactoriamente; registrar también estados de envío cuando cerrar la pantalla pueda interrumpir trabajo. Los controles propios que no emiten eventos de entrada deben registrar sus cambios explícitamente.

Usar `useWorkspaceActive()` para suspender atajos globales, reproducción, marcado de lectura u otros efectos ligados a visibilidad. El navegador de una pantalla inactiva o desmontada ignora sus intentos de redirección. Las acciones globales deben permanecer en el layout, no repetirse en cada pestaña.

Al guardar por primera vez un editor y asignarle un ID mediante `navigate(..., { replace: true })`, puede usarse `state: { workspacePreserveDraft: true }` exclusivamente para actualizar su propia URL sin reemplazar el formulario. No usar esta marca para cambiar a otro registro.

## Verificación

`npx vitest run src/components/workspace/WorkspaceApp.test.tsx` cubre conservación de formularios y archivos, filtros y scroll, cierre y límite, permisos, restauración, aislamiento de empresas, teclado, Atrás/Adelante, cancelación de navegación a rutas públicas y cambios de tamaño.
