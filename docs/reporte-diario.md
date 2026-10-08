# Reporte Diario

Ruta interna: `/nomina/reporte-diario`. Acceso de colaboradores: `/reporte-diario/:token`.

## Operación

Crear una publicación con centro histórico, período de hasta 367 días, supervisor y vencimiento. La interfaz propone 30 días de vigencia. Copiar enlace o descargar el QR; no se envían mensajes automáticamente. Regenerar o revocar invalida las sesiones del enlace anterior. Una publicación vencida sigue disponible internamente para consulta y exportación.

La búsqueda por nombre o documento se aplica en el servidor antes de paginar empleados. Los filtros de fechas y estado permiten revisar los días de cada página. La exportación consolidada incluye toda la publicación; la individual incluye el período del empleado.

El empleado necesita documento, fecha de nacimiento, estado activo y un ciclo laboral activo. El acceso no utiliza ni modifica la sesión administrativa. La fecha usa día, mes y año escribible. La sesión dura hasta 30 minutos y no se conserva en almacenamiento del navegador.

Solo se firman fechas transcurridas con revisión interna aprobada y vigente en Jornadas. Se muestran horarios, minutos de descanso, ausencias sin diagnósticos, horas extra y novedades aprobadas. No se calculan extras nuevas desde la duración del turno. Los registros con conceptos ambiguos o cantidades inválidas deben corregirse antes de firmar. Los bloques de horas extra y novedades conservan su origen.

El empleado marca Desayuno, Almuerzo, Comida, Cena y Transporte por día, selecciona las fechas y confirma expresamente la conformidad. Puede guardar, reemplazar o eliminar su firma reutilizable. Eliminarla para usos futuros no borra evidencias históricas. Cada uso exige consentimiento nuevo. También puede registrar desacuerdos con motivo; Nómina corrige los registros en sus módulos actuales.

El supervisor asignado revisa, selecciona y aprueba con firma o devuelve con motivo. Una devolución requiere nueva firma del empleado. Las publicaciones solapadas comparten decisiones por empresa/empleado/ciclo/centro/fecha y deben compartir supervisor. Reasignar actualiza el conjunto de períodos conectados por solapamiento, con auditoría; conserva los autores de aprobaciones anteriores.

Los cambios en datos revisados o en su versión de aprobación requieren nueva conformidad. El servidor compara la versión al guardar. Ante un cambio concurrente, actualizar y revisar antes de volver a firmar. Las versiones anteriores son inmutables; el PDF histórico se obtiene desde Historial del día. Los días trasladados de centro se conservan para consulta histórica y no mantienen una firma vigente en el reporte anterior.

## Permisos

Módulo `reporte_diario`: `view`, `create`, `update`, `approve`, `export`. Los roles ordinarios no reciben estos permisos automáticamente. La semántica existente de administradores y roles de sistema se conserva. Para usar el módulo, asignar los permisos requeridos y actualizar la sesión. Un supervisor necesita `view` y `approve`, pertenencia a la empresa, usuario habilitado y alcance del centro; el permiso de aprobación por sí solo no sustituye la asignación en la publicación.

La aprobación del reporte no modifica las revisiones internas de Jornadas, la liquidación ni los cortes de control. El administrador conserva acceso a reportes históricos de empleados retirados; el acceso público de esos empleados se bloquea.

## Datos y seguridad

Migraciones: `20261008143532_daily_reports.sql` y `20261008153303_daily_report_filters.sql`. Las tablas están en `daily_report_private`, con RLS y sin acceso directo de clientes. El RPC administrativo público es invoker; llama un controlador privado que valida empresa, permiso, centro y supervisor. `daily_report_public` solo puede ejecutarse con `service_role`, a través de `public-daily-report`. Su configuración `verify_jwt=false` permite las sesiones propias del empleado; el modo administrativo comprueba el JWT de Supabase Auth y vuelve a comprobar permisos en SQL.

Tokens aleatorios de 32 bytes. Las sesiones se guardan mediante hash y se verifican en cada operación. Los tokens compartibles permanecen en la tabla privada para poder recuperar el mismo QR con permiso de creación/administración. Límite de diez identificaciones por identidad y cincuenta por IP cada quince minutos, con mensajes genéricos. Los intentos se conservan siete días y las sesiones vencidas se depuran después de un día. Las IP se representan con HMAC; no se registran documentos o fechas de nacimiento en logs del gateway.

Las firmas PNG se validan en el servidor (dimensiones, tamaño, decodificación y trazo no vacío) y se almacenan en el bucket privado `daily-report-signatures`. El navegador no tiene políticas de escritura/lectura directa. El gateway entrega URLs de lectura de 120 segundos únicamente para firmas autorizadas por los RPC. No se permiten rutas de almacenamiento proporcionadas por el cliente. La eliminación de firma reutilizable quita la preferencia, no elimina objetos utilizados como evidencia.

Las operaciones tienen identificador idempotente y guardan copia del contenido, servicios, actor, firmas y fechas. Comparten el bloqueo transaccional de revisión de Nómina antes de adquirir bloqueos de filas; las tablas fuente incorporan el mismo orden. Este bloqueo global ya existe en Jornadas: aumenta la consistencia y puede limitar concurrencia; vigilar tiempos de espera antes de aumentar volumen de escrituras.

## PDF y validación

PDF horizontal con encabezado de empresa, formato configurable (`GH FO 121`, `01`), datos del empleado, filas diarias, recargos RN/RNF en ambos bloques, servicios, firmas y estados. Las aprobaciones del supervisor indican expresamente las fechas cubiertas. Los informes incompletos se identifican como parciales. No se colocan firmas anteriores sobre datos modificados. Si una firma no puede recuperarse, se interrumpe la exportación para evitar entregar un informe que parezca firmado sin su evidencia.

Comprobaciones:

- `node scripts/test-daily-reports.mjs`: aplica migración y fixtures sintéticas en una única transacción revertida sobre el proyecto vinculado esperado. `--installed` verifica después de publicar, también con rollback.
- `npx vitest run src/lib/dailyReports.test.ts src/components/daily-reports/DailyReportReview.test.tsx src/pages/PublicDailyReport.test.tsx src/pages/ReporteDiario.test.tsx`: fecha, clasificación, consentimiento, servicios, lectura e identificación pública.
- `npx deno check --config supabase/functions/public-daily-report/deno.json supabase/functions/public-daily-report/index.ts`: gateway.
- `node scripts/preview-daily-reports.mjs`: pantallas reales con datos sintéticos en `http://127.0.0.1:5208/`; `?employee` abre el acceso del empleado. No escribe en la base de datos.
- `npm run build`: frontend. El chequeo TypeScript global tiene incidencias preexistentes fuera de este módulo; no confundirlas con fallos de las pruebas del módulo.

Publicar la migración y el gateway antes del frontend. No usar un `db push` global si existen migraciones remotas ajenas a esta entrega. Verificar permisos/asesores después de instalar. Para deshabilitar, revocar publicaciones y permisos sin eliminar el historial.

## Estado de esta entrega · 8 de octubre de 2026

Ambas migraciones y la función `public-daily-report` se instalaron en el proyecto vinculado. Se verificaron las pruebas SQL con rollback después de instalar, 24 pruebas de frontend e integración existente, compilación de producción, validación Deno del gateway, pantallas móvil/escritorio y PDF de cuatro páginas con firmas sintéticas. El asesor de seguridad mantuvo las 193 alertas preexistentes sin agregar alertas. El servicio desplegado rechazó enlace inválido, sesión ausente, registro directo de firmas y PNG inválido con respuestas sin caché. No se otorgaron permisos ni se crearon publicaciones para empleados reales.

El frontend está implementado y compilado en el repositorio local. No se publicó: el conector Vercel devuelve `UNAUTHORIZED` y solicita reautenticación; no hay CLI o sesión local de Vercel configurada. Reconectar Vercel antes de publicar los archivos de este módulo, preservando los cambios ajenos presentes en el workspace.
