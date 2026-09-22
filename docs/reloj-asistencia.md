# Reloj de Asistencia

El módulo registra asistencia; no escribe novedades, horas extras, descuentos ni preliquidaciones de nómina.

## Activación

1. En **Puntos y QR**, crear un punto del centro con coordenadas, radio y política de pausas. Cada punto ofrece enlace fijo, PNG, cartel PDF y pantalla dinámica.
2. En **Accesos**, generar individualmente los PIN temporales. Vencen en 48 horas y se muestran una sola vez. Restablecer un PIN invalida el anterior y sus sesiones.
3. El empleado escanea, ingresa cédula y PIN, cambia su PIN temporal y autoriza la ubicación. La confirmación incluye la hora del servidor. La sesión se consume al marcar.
4. Activar **Seguimiento por centro** desde la fecha real de inicio. Comenzar con un centro; el proceso se ejecuta cada cinco minutos. Ningún centro se activa automáticamente con la migración.
5. Revisar **Hoy**, **Marcaciones** e **Incidencias**. Una posible ausencia es una señal para revisar, no un descuento.

La pantalla QR requiere un usuario con permiso de registro. Configurar puntos, enlaces, seguimiento y PIN requiere permiso de configuración. Aprobar correcciones requiere aprobación y acceso al empleado; se prohíbe autoaprobar. El empleado puede consultar sus últimos 30 días y solicitar correcciones desde **Mi asistencia**.

## Publicación

Aplicar las migraciones de reloj existentes (20260908205248, 20260908210000, 20260908213000) si faltan, y después `20260922034503_restructure_time_clock.sql` y `20260922041628_harden_time_clock_internal_functions.sql`. Publicar la función `public-time-clock` antes de la interfaz. Su JWT de plataforma está desactivado porque utiliza autenticación propia con PIN y sesiones breves; la RPC subyacente solo es ejecutable por `service_role`.

Los hashes de credenciales, sesiones y claves se guardan en un esquema privado sin acceso a los clientes. El enlace fijo se deriva de una clave privada y una versión revocable. Nunca copiar PIN, sesiones ni claves de servicio a registros o incidencias de soporte.

Las pruebas SQL en `supabase/tests/time_clock_integration.sql` deben ejecutarse **exclusivamente dentro de una transacción que termine en ROLLBACK**, después de las migraciones. Usan un administrador y un empleado activo existentes como referencias; todos los puntos, PIN y eventos de prueba se revierten. Las pruebas requieren un esquema de reloj vacío; usar una base de prueba tras la puesta en marcha.

## Operación

- Verificar en `cron.job` que `time-clock-reconcile` esté activo y en `cron.job_run_details` que finalice sin errores. No contiene secretos en su comando.
- Ante fallas de GPS o conectividad, registrar mediante **Marcación supervisada**, con motivo obligatorio. No se confirma ni conserva una marcación offline.
- Una jornada nocturna se identifica por la fecha de inicio. Al corregir una salida, conservar esa jornada aunque la hora corresponda al día siguiente.
- Las correcciones conservan las evidencias originales. El cálculo toma solo la última versión y descuenta una sola vez las pausas.
- Desactivar el enlace bloquea sus sesiones. Regenerarlo requiere reemplazar los carteles anteriores. Desactivar el punto bloquea ambos tipos de QR.
- Para detener un piloto, pausar el seguimiento y desactivar sus puntos o enlaces. Conservar las tablas y el historial; no eliminar evidencias para revertir la interfaz.
