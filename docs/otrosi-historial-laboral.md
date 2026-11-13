# Otrosí e historial laboral

La ficha del empleado, Empleado 360 y el detalle del contrato permiten registrar
acuerdos sobre cargo, salario, centro principal, tipo de contrato, descanso y
horario habitual. El empleado, contrato y ciclo conservan sus identificadores.

## Uso

1. Abra **Otrosí e historial laboral → Registrar Otrosí**.
2. Seleccione los campos, la fecha de vigencia y el motivo. Revise Antes/Después.
3. Guarde el borrador. Puede generar un Word con la plantilla de la empresa o
   usar un documento elaborado externamente.
4. Adjunte un PDF firmado (máximo 20 MB) y confirme. Para fechas futuras, el
   registro queda programado. No hay una segunda aprobación interna.

Las correcciones de captura son registros distintos, con motivo obligatorio y
sin exigir firma. Para subsanar un registro aplicado, use **Subsanar con nuevo
registro**; el original y sus documentos se conservan. Un programado puede
cancelarse si no tiene acuerdos posteriores dependientes.

La plantilla se configura desde el mismo panel; cada carga crea una versión.
Marcadores disponibles: `{empresa}`, `{nit}`, `{empleado}`, `{documento}`,
`{contrato}`, `{fecha_inicio_contrato}`, `{consecutivo}`, `{vigencia}`, `{motivo}`,
`{firmante_empresa}`, `{firmante_empleado}`. Repetición de cambios:
`{#cambios}{campo}: {anterior} → {nuevo}{/cambios}`.

## Vigencias y cierres

- La migración captura condiciones **observadas**, sin atribuirlas a la fecha
  de ingreso. En retroactivos anteriores sin evidencia, se solicita declarar el
  valor anterior conforme al soporte. Esa procedencia queda identificada.
- La consulta por fecha combina el punto de partida con los acuerdos confirmados.
  No incluye borradores, cancelados ni registros en revisión. Un retroactivo
  incompatible con el valor anterior de un documento posterior se rechaza.
- Los cortes de control afectados se muestran en cada registro. No se modifican
  liquidaciones, asistencias ni novedades cerradas. La configuración operativa
  del horario se versiona desde el primer día abierto cuando existe un corte;
  el historial contractual conserva la fecha real pactada.
- La tarea `employee-amendments-apply` corre cada minuto, con fechas de
  `America/Bogota`. Usa bloqueos por ciclo, aplica cada registro una sola vez y
  marca los fallos como **Requiere revisión**. Permite reintentar después de
  resolver la causa. Una vinculación terminada nunca se reactiva.
- Las prórrogas anteriores a un cambio de condiciones contractuales permanecen
  almacenadas, pero no gobiernan el nuevo vencimiento.

## API y almacenamiento

- `employee_amendments(p_employee_id, p_at_date?)`: contexto, permisos, historial,
  plantilla y condiciones actuales o de una fecha. Omite valores y documentos
  salariales sin permiso de salarios.
- `employee_amendment_command(p_action, p_payload)`: `save`, `generated`,
  `confirm`, `cancel`, `retry`, `template`. El cliente asigna UUID al borrador;
  guardar uno existente requiere la revisión esperada. Confirmar se puede
  reintentar sin duplicar el cambio ni el documento.
- El esquema `amendment_private` contiene registros, eventos, plantillas y
  condiciones iniciales. No concede acceso directo a usuarios autenticados.
  Las dos RPC públicas son invocadoras; las operaciones privilegiadas privadas
  validan usuario activo, empresa, centros y permisos.
- El bucket privado `amendments` no permite reemplazar ni borrar archivos.
  Cambiar un borrador incrementa su revisión e invalida los adjuntos anteriores.
  El PDF confirmado aparece en **Contratos y Otrosí**, protegido contra borrado.
- Los permisos delegables están en los módulos `otrosi` y
  `correcciones_laborales`. Administradores gestionan ambos; RR. HH. tiene
  gestión de Otrosí. Los cambios salariales exigen además ver y editar salarios.

## Validación y puesta en marcha

La implementación incluye la migración
`supabase/migrations/20261113042457_employee_amendments.sql` y pruebas aisladas.
No se debe habilitar el frontend nuevo sin aplicar primero esta migración:
las consultas contractuales incorporan `amendment_effective_on`.

```powershell
# Prueba contra la base local: aplica migración y fixtures en una transacción,
# y termina con ROLLBACK.
node scripts/test-employee-amendments.mjs

# Alternativa en el proyecto vinculado, también íntegramente revertida.
node scripts/test-employee-amendments.mjs --linked

# Si la migración ya está instalada:
node scripts/test-employee-amendments.mjs --linked --installed

npx vitest run src/components/employees/EmployeeAmendments.test.tsx src/lib/amendmentDocumentGenerator.test.ts src/lib/effectiveContractExtensions.test.ts
npm run build
```

Antes de publicar: verificar la migración en el entorno destino, desplegar el
frontend y actualizar `notify-contract-preaviso` con el cambio incluido. Revisar
los permisos de los roles personalizados y cargar la plantilla de cada empresa.
Validar la tarea en `cron.job` y sus ejecuciones en `cron.job_run_details`.
No revertir eliminando el esquema o documentos si ya hay Otrosí registrados.

### Resultado de validación de esta entrega

- Compilación de producción y 59 pruebas Vitest aprobadas.
- Suite SQL de Otrosí aprobada con fixtures revertidos: cambios múltiples,
  soporte obligatorio, revisiones, retroactivos, cortes, programación,
  idempotencia, terminación y permisos.
- Regresiones SQL de reingreso y reingreso directo aprobadas. Comprobación de
  funciones privadas con `plpgsql_check`: sin errores.
- La revisión global de TypeScript tiene fallos existentes ajenos al módulo.
  La suite histórica `payroll_control_cuts.sql` falla en la actualización de
  marcaciones cerradas (`PCC01`); se reprodujo el mismo fallo sin esta migración.
  Los escenarios de cortes específicos del nuevo flujo sí están cubiertos y pasan.
- Producción verificada el 13 de noviembre de 2026: migración
  `20261113042457` instalada y registrada, frontend `487d6f3f` publicado en
  `https://empatiq.portalpetrocasinos.com` y función `notify-contract-preaviso`
  actualizada. El historial remoto anterior de migraciones se conservó intacto.
- Suite SQL ejecutada nuevamente sobre la migración instalada: aprobada.
  Cron `employee-amendments-apply` activo cada minuto, con ejecuciones exitosas.
- Prueba real en navegador sobre producción con empresa y empleado aislados:
  carga de plantilla, borrador sin afectar salario, Word con comparación,
  carga de PDF de prueba, confirmación y aplicación de salario y descanso,
  preservación de contrato/ciclo/antigüedad y descarga autorizada del soporte.
  La eliminación del soporte desde Storage con el usuario fue rechazada.
  No se observaron excepciones de ejecución en el navegador.
- Los usuarios, empresa, empleado, registros y archivos temporales se eliminaron
  al finalizar; no se alteraron las condiciones de empleados reales.
