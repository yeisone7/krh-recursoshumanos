# Consulta Dinámica de Nómina

Acceso: **Nómina → Consulta Dinámica**, ruta `/nomina/consulta-dinamica`.
Utiliza los permisos `view` y `export` de `analitica_nomina`, la sesión del usuario,
la empresa seleccionada y las políticas RLS existentes.

## Uso

1. Seleccionar Desde/Hasta y pulsar **Consultar**. El período inicial es el mes
   actual de Colombia. Se incluyen las vinculaciones que cruzan el período,
   también de empleados actualmente retirados.
2. Filtrar por empleado/documento, centro, área, cargo, estado actual, modalidad,
   turno, origen, concepto y aprobación. Concepto y aprobación deben coincidir
   en el mismo registro de novedad; los demás datos del día se conservan.
3. Elegir **Detalle**, **Resumen** o **Pivote**. En Detalle se pueden seleccionar
   y ordenar las columnas. Resumen permite elegir dimensiones y métricas;
   Pivote permite elegir filas, columnas y una métrica.
4. Exportar Excel/CSV. Se descargan todos los resultados filtrados, con el orden
   seleccionado, sin depender de la página del grid. **Todos los campos** exporta
   el detalle completo. Excel añade filtros y definiciones en una segunda hoja.

## Interpretación

- Cada fila del detalle corresponde a empleado, vinculación y fecha. Solo se
  generan días dentro de los períodos registrados de vinculación. Sin ciclos,
  se usan exclusivamente fechas de ingreso/retiro de información laboral legada.
- Los datos laborales se resuelven por ciclo e intervalo de vigencia; gana el
  inicio más reciente y, si hay empate, el identificador menor. No se reemplaza
  información histórica faltante por datos actuales. El estado del empleado sí
  es el estado actual y se identifica como tal.
- La consulta usa la evidencia almacenada: no puede reconstruir versiones de
  salarios o catálogos que hayan sido sobrescritas sin conservar historial.
- Los horarios administrativos se expanden según sus días de semana. Una
  asignación explícita tiene prioridad sobre el horario administrativo. El ciclo
  de rotación se informa; no se inventan asignaciones de turno aún no generadas.
- Horas programadas = duración del turno/horario menos descanso; se contempla
  el cruce de medianoche. Descansos, suspensiones y días no trabajados tienen
  cero horas programadas. Estas cantidades no acreditan asistencia.
- Los días y horas efectivos siguen las reglas de Pre-Liquidación para registros
  equivalentes. Una novedad diaria aprobada reemplaza programación y ausencias.
  Sin corrección, la prioridad es incapacidad, vacaciones y permiso; un permiso
  parcial deja la fracción restante de programación. El divisor usa las horas
  diarias de configuración laboral; si no hay configuración, usa 8 horas.
- Las incapacidades no tienen aprobación de nómina propia: se tratan como
  registradas/aprobadas, igual que Pre-Liquidación. Vacaciones y permisos respetan
  sus estados e interrupciones. Pendientes y rechazadas permanecen separados.
- Horas declaradas por estado incluyen novedades, extras y ausencias: pueden
  superponerse y no equivalen a horas trabajadas. Los recargos no se suman a
  horas extra como tiempo adicional. Los conceptos dominicales/festivos ambiguos
  se conservan para consulta y se excluyen de métricas efectivas con advertencia.
- Los duplicados y solapamientos generan advertencias. Empleados únicos se
  cuentan en cada agrupación y en el total; no se suman los conteos de celdas.

## Acceso y validación

Las lecturas están paginadas y acotadas por empresa, usando lotes de empleados.
Los centros autorizados se resuelven según el alcance existente de la app;
los registros diarios de otros centros se excluyen. Un usuario restringido a
centros no recibe días cuyo centro histórico no se pueda resolver.
Cambiar empresa, usuario o alcance limpia la consulta. Una fuente fallida,
una carga en curso o un cambio de período pendiente bloquean las exportaciones.

Pruebas: `payrollDynamicQuery.test.ts`, `payrollDynamicQueryExport.test.ts`,
`usePayrollDynamicQuery.test.tsx` y `ConsultaDinamicaNomina.test.tsx`.
Las pruebas de navegador usan datos sintéticos; la verificación completa de
RLS sobre datos reales requiere una sesión autenticada con los roles previstos.
