# Verificación de Pre-Liquidación — 22 de septiembre de 2026

## Regla aplicada

«Dominical» corresponde al día de descanso obligatorio semanal asignado al empleado. Si el descanso es martes, trabajar el martes se registra como dominical y trabajar el domingo como jornada ordinaria, salvo que sea festivo. Sin asignación se presume domingo. Los festivos conservan su clasificación y no se duplican cuando coinciden con el descanso.

Fundamento: [Ley 2466 de 2025, artículo 14, parágrafos 2 y 3](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=260676). La asignación diferente del domingo presupone el acuerdo escrito entre las partes.

Según la confirmación del usuario, una novedad diaria aprobada reemplaza lo programado para esa fecha. No se suma otra jornada. Las novedades de horas extra y recargos conservan su tratamiento como conceptos adicionales.

## Correcciones verificadas

- Clasificación del descanso semanal, normalización de mayúsculas y tildes, domingo supletorio y coincidencia con festivos.
- Novedades aprobadas dentro del período; inclusión de jornada y ausencias manuales; reemplazo del turno sin doble conteo.
- Ausencias superpuestas contabilizadas una sola vez, con alerta para revisión. Prioridad: incapacidad, vacaciones, permiso.
- Permisos de medio día o por horas como fracciones de la jornada configurada.
- Vacaciones aprobadas, en curso, completadas e interrumpidas: disfrute previo a la interrupción y período de reanudación. Compensación y acumulación no se tratan como ausencia.
- Extras expresamente identificadas como tales y recargos nocturnos reclasificados según la fecha de descanso/festivo.
- Consultas paginadas de turnos, novedades y fuentes adicionales de la vista, con orden estable.
- Cálculo y exportación habilitados solo cuando terminaron todas las consultas; errores visibles y reintento disponible.
- Selección del horario más reciente dentro del ciclo laboral actual.
- Períodos invertidos rechazados; resultados invalidados al cambiar fechas o empresa.
- Vigencia de descuentos; préstamos futuros excluidos y última cuota limitada al saldo.
- Porcentajes sin base monetaria excluidos del importe, con alerta explícita. Un 10 % no se interpreta como $10.

## Evidencia

- Suite completa inicial: 634 pruebas aprobadas en 103 archivos.
- Después del ajuste final para registros ambiguos y de conservar la prueba original del hook: 51 pruebas específicas aprobadas (45 de cálculo/hook y 6 de integración de la vista).
- Integración con React Testing Library: consultas simuladas → cálculo real → tabla real → libro Excel real; incluye demora de la consulta de descanso, errores/reintento, segunda página de más de 1.000 registros, fechas y bloqueo del cierre ante importes pendientes.
- Compilación de producción (`npm run build`) aprobada.
- ESLint de los archivos principales modificados aprobado.
- TypeScript global no aprobado: existen errores en otros módulos y desajustes de los tipos generados de Supabase en los hooks compartidos de novedades y turnos. No se modificaron los tipos generados que ya tenían cambios ajenos a esta tarea.

## Límites y datos pendientes

- El conector de Supabase denegó la lectura de la base. No hubo conciliación con nómina real ni E2E contra producción; las pruebas usan datos controlados y no registran pagos.
- Las opciones `2_dias`, `4_dias` y `7_dias` no identifican por sí solas fechas concretas. Se consultó al usuario cómo obtenerlas. Mientras se define, generan una alerta y no se presume domingo.
- Registros antiguos `dominical_*`/`festivo_*` de horas no distinguen trabajo ordinario con recargo de horas extra. Se dejan pendientes, con alerta, en lugar de convertirlos automáticamente en HEDF/HENF.
- La vista consolida días/horas y deducciones; no calcula salario neto ni liquida monetariamente recargos. No se han validado aquí las tasas de otros módulos.
- Se utiliza el descanso vigente del empleado y los turnos registrados. No se ha incorporado una reconstrucción histórica de cambios de descanso ni un desglose de turnos por hora a través de medianoche.
- El cierre de préstamos no se ejecutó. Esta revisión no certifica su idempotencia o atomicidad.

Las alertas se conservan en el Excel y bloquean el cierre cuando existen préstamos por registrar. Los cambios están en el workspace; no se desplegaron.
