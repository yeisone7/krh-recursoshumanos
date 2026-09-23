# Cortes de control de NÓMINA

La ruta `/cortes-control`, dentro de NÓMINA, aplica una fecha compartida por centro a Jornadas, Novedades, Reloj de Asistencia, Préstamos y Descuentos. No crea cierres de preliquidación, PILA ni configuración laboral.

## Uso y permisos

En Roles y permisos, habilitar **Cortes de control → Ver** y las acciones del nivel correspondiente: **Crear = Aplicar**, **Modificar = Modificar fecha**, **Aprobar = Reabrir**. Los siete permisos usan los códigos `cortes_control`, `cortes_control_nivel_uno` y `cortes_control_nivel_dos`. Los roles con acceso total conservan ese acceso; no se agregan permisos a otros roles automáticamente. Renovar la sesión o recargar la aplicación para actualizar el catálogo.

Hay un corte activo por centro y nivel. La mayor fecha bloquea hasta ese día inclusive. El Superior establece el mínimo permitido del Operativo. Reabrir uno no cambia el otro. Si el Operativo está por debajo del Superior, debe avanzarse hasta esa fecha antes de reabrirlo. Todas las acciones exigen motivo y conservan autor, fecha anterior/nueva y hora; no se borran cortes ni eventos desde el cliente.

La pantalla **Revisar centros de registros históricos** completa centros únicamente cuando existe evidencia laboral por fecha/ciclo. Si quedan registros sin centro, informa las tablas y cantidades; se debe corregir la información laboral histórica de los empleados y volver a revisar. No se permite aplicar cortes con registros ambiguos o sin centro. Un traslado posterior no reasigna el centro guardado de documentos existentes.

## Casos operativos

- **Jornadas:** una nueva configuración se aplica desde la fecha elegida; la anterior termina el día previo. El calendario, generadores y reloj seleccionan la vigencia de cada fecha. Los catálogos referenciados por períodos cerrados no se pueden alterar: crear un nuevo horario/turno/ciclo para condiciones futuras.
- **Novedades:** se comprueban creación, edición, eliminación y aprobación/rechazo. Cambiar la fecha o empleado también valida el registro original. Un lote con una fecha cerrada se rechaza por completo e identifica el registro que lo impide.
- **Asistencia:** la fecha es la de inicio de jornada, incluso en salidas nocturnas. Se permite cerrar con pendientes; terminarlas o corregirlas requiere reapertura. El reconciliador automático omite días cerrados y continúa con los abiertos. La actualización manual de ausencias informa el bloqueo. El reloj público muestra `PAYROLL_CUT_CLOSED` sin exponer el motivo administrativo.
- **Préstamos:** un abono posterior al corte sigue permitido aunque el préstamo sea anterior. La RPC guarda pago y saldo juntos, valida el saldo bajo bloqueo y admite un identificador idempotente para reintentos. Refinanciar un préstamo cerrado requiere reapertura; historial y condiciones se guardan juntos. Durante el despliegue se conserva el ingreso antiguo de pagos únicamente en centros sin cortes; con un corte activo es obligatorio usar la RPC atómica.
- **Descuentos:** en Editar, indicar **Nueva vigencia desde** para cambiar condiciones o estado hacia adelante. La anterior conserva sus valores y termina el día previo. Si una consulta de preliquidación cruza dos versiones del mismo descuento, se advierte que debe calcularse por tramos y no se suman ambas versiones completas. No se introduce una regla de prorrateo financiero.

Los avisos de los cinco módulos indican centro, nivel, fecha y motivo. El servidor es la autoridad de bloqueo, incluso cuando el aviso de una sesión todavía no se ha actualizado. Conocer o administrar un corte no permite saltarlo.

## Datos e interfaces

Tablas: `payroll_control_cuts`, `payroll_control_cut_events`; centros históricos añadidos a asignaciones, configuraciones, novedades, préstamos y descuentos. Descuentos conserva `previous_version_id`.

RPC: `payroll_cut_centers`, `payroll_cut_status`, `payroll_cut_resolve_centers`, `payroll_cut_change`, `payroll_register_loan_payment`, `payroll_refinance_loan`, `payroll_version_deduction`, `payroll_set_time_config`. El esquema privado contiene validadores, bloqueos transaccionales y autorizaciones internas de escritura. No hay una excepción de corte controlable mediante parámetros o variables de sesión del cliente.

Migraciones instaladas en `qmfyecdeiupgscegxbmo`: `20260923180831_payroll_control_cuts` y `20260923184325_payroll_cut_explicit_attendance_refresh`. Se publicó `public-time-clock` con su autenticación existente de PIN. La instalación inicia sin cortes activos. El frontend se compila desde este repositorio; su publicación en el hosting es un paso separado.

## Verificación

- `node scripts/test-payroll-control-cuts.mjs --linked --installed`: SQL real, identidades y datos ficticios dentro de una transacción revertida. Cubre límites, jerarquía, permisos, revocación, aislamiento por centro/empresa, lotes, horarios referenciados, nuevas vigencias, abonos, idempotencia, asistencia nocturna, actualización explícita/automática y fallas de auditoría o actualización del saldo.
- `node scripts/test-payroll-control-cuts.mjs`: verifica las migraciones y pruebas en una base local que aún no las tenga. `--linked` sin `--installed` solo corresponde a una base vinculada sin estas migraciones; todo se revierte.
- `node scripts/test-payroll-cut-concurrency.mjs`: solo contenedor local `supabase_db_qmfyecdeiupgscegxbmo`, con la migración base instalada. Verifica dos conexiones simultáneas y elimina únicamente sus fixtures propios. Actualiza las funciones de prueba del esquema local.
- Pruebas Vitest de cortes, selección de vigencias, calendario/cálculo y reloj. La selección ejecutada de cinco archivos pasó 61 casos; el build de Vite pasó.
- `node scripts/preview-payroll-control-cuts.mjs`: fixture visual aislada en `127.0.0.1:5199`, con la página y estilos reales y datos simulados. `?level1` y `?view` comprueban las acciones visibles. Se verificaron tabla, edición e historial en navegador. Esto no sustituye una prueba con Supabase Auth de un usuario real.
- Lint de los archivos nuevos: correcto. La revisión global de TypeScript conserva errores preexistentes en otros módulos; no se detectaron errores en los nuevos archivos de cortes. El asesor de seguridad de Supabase no reportó errores tras instalar la migración base.

Reversión operativa: reabrir los cortes con permisos y motivo. Conservar tablas e historial. No retirar las RPC mientras haya clientes usando pagos o vigencias nuevas.
