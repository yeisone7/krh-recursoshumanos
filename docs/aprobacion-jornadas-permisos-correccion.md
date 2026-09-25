# Aprobación de jornadas y permisos de corrección

## Operación

En Jornadas, cada día programado muestra `✓` (aprobado), `×` (rechazado), `P` (pendiente) o `H` (sin revisión histórica). **Revisar y aprobar jornadas** permite filtrar empleados, fechas y estados, seleccionar varios días y aprobar o rechazar. El rechazo exige motivo. Se conserva una copia de la programación, incluidos horarios administrativos y descansos. No se aprueban celdas sin programación. El usuario puede aprobar su propio trabajo si su rol lo permite.

Modificar una jornada revisada deja pendiente solamente los días cuya programación cambió. Las revisiones anteriores permanecen en el historial. Una novedad corregida vuelve a pendiente y pierde los datos de su aprobación anterior.

Los niveles 1 y 2 siguen permitiendo cerrar con pendientes. El diálogo de cierre muestra cuántas jornadas están pendientes, rechazadas o sin revisión histórica hasta la fecha elegida.

En **Cortes de control → Permisos de corrección** (`/cortes-control/permisos`) se solicita una excepción para un empleado, el usuario solicitante, un centro histórico y fechas inclusivas. Se eligen las acciones de Jornadas y/o Novedades: crear, modificar, eliminar y aprobar/rechazar. El plazo para usar el permiso es independiente del rango de días a corregir. La hora se captura y muestra en Colombia (`America/Bogota`); se guarda como instante UTC.

Otra persona autoriza o rechaza la solicitud. Puede reducir fechas, acciones o vencimiento; ampliarlos exige una nueva solicitud. El solicitante puede cancelar una solicitud pendiente y finalizar anticipadamente su permiso. Un responsable con permiso puede revocarlo. Cancelar se registra como acción `cancel` y estado finalizado, conservando el motivo. Solicitados y activos vencidos se muestran como Vencido sin depender de un cron.

Al guardar en fechas cerradas se muestran únicamente los tickets que cubren **todo el lote** y sus acciones. Incluso con uno solo, se confirma el ticket y su vencimiento; con varios se exige elegir. La edición la realiza el solicitante. La aprobación la puede realizar cualquier responsable con el permiso normal y acceso al centro, durante la vigencia del ticket y si incluye aprobar/rechazar.

Al vencer, revocar o finalizar no se revierten los cambios guardados. Los pendientes necesitan otro ticket para editarse o aprobarse mientras el corte siga activo. El ticket no reabre ninguno de los dos niveles.

Los lotes admiten hasta 2000 operaciones y se guardan completos o se rechazan completos. La solicitud admite un rango de hasta 367 días y un único centro; rangos que cruzan un traslado requieren solicitudes separadas. Para corregir varios empleados en fechas cerradas, separar las operaciones por empleado/ticket. No se modifican catálogos compartidos ni configuraciones generales con un ticket; las excepciones administrativas son asignaciones diarias.

## Roles

- `jornadas / approve`: revisar la programación.
- `correction_tickets / view`: consultar tickets autorizados por centro.
- `correction_tickets / create`: solicitar, cancelar solicitud propia y finalizar permiso propio.
- `correction_tickets / approve`: autorizar o rechazar solicitudes ajenas.
- `correction_tickets / update`: revocar permisos activos.
- `correction_tickets / export`: consultar/exportar la auditoría global de correcciones, respetando centros.

El ticket no reemplaza los permisos normales de Jornadas/Novedades. Los roles ordinarios no reciben permisos nuevos automáticamente. Se conserva la semántica de acceso total ya existente. Tras asignar permisos, actualizar la sesión. Los participantes pueden consultar el historial de sus tickets; Jornadas permite consultar el historial del día. Auditoría incorpora un apartado de correcciones con filtros por empleado, usuario, módulo, fechas y ID del ticket, y exportación a Excel.

## Datos, seguridad y compatibilidad

Migración: `20260925030834_schedule_reviews_correction_tickets.sql`, posterior a las migraciones de cortes del 23 de septiembre. Crea `payroll_correction_tickets`, `schedule_day_reviews` y `payroll_correction_events`, con RLS y solo lectura directa para clientes autorizados. No inventa aprobaciones para datos existentes.

RPC: `payroll_ticket_request`, `payroll_ticket_transition`, `payroll_schedule_days`, `payroll_schedule_cut_summary` y `payroll_correction_write`. Esta última tiene modo de previsualización y modo de escritura; comprueba nuevamente permisos, alcance, versión y vencimiento al guardar. Un contexto privado de transacción autoriza exclusivamente el registro, tabla, acción y ticket comprobados. El cliente no puede escribir ese contexto ni falsificar decisiones o auditoría.

Las correcciones y su evento se guardan juntos; si falla el evento o vence el ticket durante el lote, se revierte todo. Se comprueban los documentos anterior y nuevo, así como empresa, empleado, centro histórico y fechas. Cada evento conserva autor, hora, antes/después, ticket y cortes activos. Las funciones de lectura de programación nunca devuelven días de centros no autorizados.

Un bloqueo transaccional común serializa revisiones, cambios de programación y transiciones de tickets. Los RPC existentes que toman bloqueos por centro adquieren primero este bloqueo para mantener el orden. Es deliberadamente global en esta primera versión: prioriza consistencia entre catálogos compartidos y decisiones, y puede limitar la concurrencia de escrituras de nómina entre empresas. Las lecturas no toman ese bloqueo. Si se observa contención, particionar manteniendo pruebas de orden de bloqueo y concurrencia.

Publicar backend y frontend de forma coordinada: el frontend nuevo utiliza los RPC nuevos, y el backend exige que las decisiones de Novedades pasen por el RPC. Los clientes anteriores recibirán un mensaje de actualización al intentar aprobar directamente.

### Estado de publicación (25 de septiembre de 2026 UTC)

- Migración `20260925030834` instalada en `qmfyecdeiupgscegxbmo`, con el SQL y su registro en `supabase_migrations.schema_migrations` guardados en una única transacción. Se conservó el historial remoto anterior; no se ejecutó una reparación ni una sincronización masiva de migraciones.
- Verificadas las tres tablas nuevas con RLS activado. Pasaron `--linked --installed` y `--linked --installed --cuts-regression`, usando fixtures revertidas sin conservar datos de prueba.
- Frontend compilado. La entrega del código se realiza mediante la rama `main` de GitHub, por indicación del usuario. La publicación en el alojamiento y su dominio debe comprobarse por separado; no se ha verificado un despliegue de producción desde esta sesión.
- El asesor de seguridad del conector Supabase denegó acceso. La verificación SQL confirmó RLS y las pruebas de permisos; no sustituye una ejecución completa del asesor.

La entrega no cambia la liquidación de nómina ni amplía excepciones a asistencia, préstamos, descuentos o solicitudes de ausencia. Para deshabilitar la función, revocar permisos activos y permisos del rol; conservar el historial. No retirar los RPC mientras el frontend publicado los utilice.

## Verificación

- `node scripts/test-payroll-corrections.mjs --linked`: instala la migración y ejecuta fixtures ficticias **dentro de una única transacción revertida**. Solo acepta el proyecto vinculado `qmfyecdeiupgscegxbmo`. Cubre revisiones individuales/masivas, horarios administrativos, invalidación, autor distinto al solicitante, aprobación propia permitida, autorización reducida, ambos niveles y Nivel 1 solo, alcance, permisos retirados, vencimiento antes/durante el guardado, revocación/finalización, versiones obsoletas, auditoría atómica y lotes.
- Añadir `--installed` únicamente después de instalar esta migración para verificar las funciones publicadas con fixtures revertidas.
- `node scripts/test-payroll-corrections.mjs --linked --cuts-regression`: verifica la suite anterior de cortes sobre la migración nueva, también revirtiendo toda la transacción. Pasó.
- Pruebas Vitest nuevas de selección/confirmación/cancelación de tickets, manejo de errores y vencimiento, hora colombiana, aprobación/rechazo por selección y roles de consulta. Pasaron junto con las pruebas existentes seleccionadas de calendario y cortes.
- Compilación Vite: pasó. Lint de los archivos nuevos: sin errores. El chequeo TypeScript global conserva errores preexistentes en tipos generados y módulos ajenos; no reportó errores en los componentes y biblioteca nuevos.
- `node scripts/preview-payroll-corrections.mjs`: interfaz real con datos simulados en `http://127.0.0.1:5201`; `?calendar` abre la revisión. Se verificó autorización, ticket obligatorio, aprobación guardada, estados y ausencia de errores de consola. No equivale a una sesión real de Supabase Auth.
- `node scripts/test-payroll-corrections-concurrency.mjs`: prueba dos conexiones en el contenedor **local** `supabase_db_qmfyecdeiupgscegxbmo`, con la migración instalada. Usa fixtures propias verificadas como inexistentes y las elimina al finalizar. Cubre cambio concurrente frente a aprobación, revocación frente a escritura y vencimiento esperando el bloqueo. **No se pudo ejecutar aquí: Docker agotó el tiempo de respuesta**, también al volver a comprobarlo durante la publicación. Sigue pendiente ejecutarla en un entorno local con PostgreSQL disponible.
