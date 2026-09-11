# Ciclos de aprobación de Requisiciones

Cada empresa puede publicar un ciclo secuencial de aprobación. La configuración está en **Configuración → Requisiciones** y en **Ciclo de Requisiciones** del menú lateral (`/configuracion/requisiciones`).

## Configurar un ciclo

1. Seleccionar la empresa.
2. Agregar, quitar o subir/bajar etapas. Las etapas actuales conservan sus formularios y permisos. Selección es opcional y siempre ocupa el último lugar.
3. Para cada etapa personalizada, indicar un nombre y elegir uno o varios roles activos de esa empresa. Basta una decisión de una persona autorizada. Asignar integrantes a los roles desde Seguridad.
4. Agregar campos de texto corto, texto largo, número, fecha, sí/no o selección única. Marcar los campos obligatorios y definir las opciones de las listas.
5. Revisar la vista previa y pulsar **Publicar ciclo**. Los cambios del editor no tienen efecto hasta publicarse.

El permiso **Configurar ciclo de requisiciones → Actualizar** permite delegar esta gestión. No concede acceso a las demás configuraciones. Los administradores mantienen su acceso. Las personas asignadas a roles de etapas personalizadas pueden entrar al módulo, conservando las restricciones de empresa, centro y confidencialidad.

## Requisiciones e historial

- Una empresa sin ciclo publicado conserva el flujo anterior y la elección de «Autoriza».
- Al enviar un borrador, el servidor fija la versión vigente de su empresa y crea una ejecución por etapa. En ese momento deja de utilizar «Autoriza».
- Las requisiciones enviadas antes de publicar un ciclo siguen con el motor anterior. Las enviadas con una versión configurada conservan esa versión, aunque después se cambien nombres, campos, orden o roles del nuevo ciclo.
- Una aprobación habilita la siguiente etapa. Un rechazo termina el proceso. Los campos obligatorios se exigen al aprobar; los valores `0` y `No` son respuestas válidas.
- Las decisiones guardan responsable, fecha, observaciones y respuestas. No se permite modificar directamente ese historial ni aprobar una etapa que no esté activa.
- Los integrantes de los roles se verifican al decidir. No se puede eliminar, desactivar ni mover de empresa un rol referenciado por un ciclo publicado o una requisición pendiente.
- Las vacantes se habilitan al entrar en Selección. Si se quita Selección, se habilitan al aprobar la última etapa. Quitar RRHH o Jurídico no traslada automáticamente sus datos a otro formulario.

## Integración

Tablas nuevas:

- `requisition_workflow_versions`: definición inmutable por empresa y versión, con identificadores estables para etapas y campos.
- `requisition_workflow_settings`: versión publicada actualmente por empresa.
- `requisition_step_executions`: decisiones y respuestas por requisición/etapa.

`personnel_requisitions` incorpora `workflow_version_id` y `current_approval_step_id`. Las etapas estándar mantienen sus estados y columnas actuales. Las personalizadas utilizan `en_aprobacion`; su nombre visible se obtiene de la versión asignada.

Operaciones públicas:

| RPC | Entrada | Resultado |
| --- | --- | --- |
| `publish_requisition_workflow` | Empresa, etapas, versión esperada | Nueva versión publicada; rechaza ediciones basadas en una versión obsoleta |
| `submit_requisition` | Requisición | Requisición enviada usando la configuración vigente o el flujo anterior |
| `approve_requisition_step` | Requisición, etapa esperada, decisión, observaciones, respuestas, datos estándar y códigos de vacante opcionales | Requisición actualizada; decisión, códigos y transición guardados en una transacción |
| `can_approve_requisition_step` | Requisición y etapa | Autorización del usuario actual para la etapa activa |
| `has_requisition_workflow_assignment` | Empresa | Acceso al módulo por roles asignados a ciclos actuales o pendientes |

La implementación privilegiada está en el esquema no expuesto `requisition_private`. Las tablas públicas tienen RLS y no permiten escrituras directas de usuarios sobre configuraciones o ejecuciones. Las funciones verifican identidad, empresa y permisos; las decisiones bloquean la requisición durante la transacción.

`notify-requisition-approver` obtiene la etapa desde la base de datos, resuelve roles configurados y aplica restricciones de centro y confidencialidad. No acepta el estado enviado por el navegador como fuente del recorrido. Los errores de notificación no deshacen una decisión ya guardada.

El timeline, los indicadores del listado, los filtros y el PDF utilizan la versión asignada. El PDF distribuye etapas y respuestas largas entre páginas.

## Despliegue y comprobaciones

Aplicar primero `20260911005232_configurable_requisition_status.sql` y después `20260911005233_configurable_requisition_workflows.sql`; el nuevo valor del enum necesita una transacción separada. La segunda migración admite instalaciones con y sin el trigger de secuencia anterior. Actualizar después la función `notify-requisition-approver`, incluido su módulo `_shared/requisitionNotificationAccess.ts`, y desplegar la interfaz antes de publicar ciclos por empresa.

No se migra ni reasigna ninguna requisición existente. La activación es por empresa mediante publicación explícita. No eliminar versiones o columnas para desactivar la interfaz: las requisiciones que ya utilizan un ciclo necesitan conservar su motor e historial.

Validación:

```powershell
npx vitest run src/lib/requisitionApprovalFlow.test.ts src/lib/requisitionWorkflow.test.ts src/lib/requisitionPdfGenerator.test.ts src/lib/requisitionNotificationAccess.test.ts src/lib/selectionAlerts.test.ts src/pages/Requisiciones.pagination.test.tsx src/components/config/RequisitionWorkflowConfig.test.tsx src/components/requisitions/CustomRequisitionApprovalDialog.test.tsx
Get-Content -Raw supabase/tests/requisition_configurable_workflow.sql | docker exec -i supabase_db_qmfyecdeiupgscegxbmo psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres
node scripts/test-requisition-workflow-concurrency.mjs
npx deno check --no-lock supabase/functions/notify-requisition-approver/index.ts
npm run build
```

La prueba SQL revierte sus datos al finalizar. La prueba de concurrencia usa exclusivamente un contenedor local, crea datos de prueba con UUID aleatorios y los elimina al terminar. `REQUISITION_TEST_CONTAINER` permite elegir otro contenedor local que ya tenga las migraciones aplicadas.

Fuera de esta versión: adjuntos, aprobación unánime, condiciones entre etapas y edición de los formularios especializados de las etapas estándar.
