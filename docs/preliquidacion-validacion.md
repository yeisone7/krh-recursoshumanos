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
- Esta limitación de la revisión inicial quedó superada por el histórico de jornadas y el desglose horario descrito en la verificación del 28 de octubre de 2026.
- El cierre de préstamos no se ejecutó. Esta revisión no certifica su idempotencia o atomicidad.

Las alertas se conservan en el Excel y bloquean el cierre cuando existen préstamos por registrar. Los cambios están en el workspace; no se desplegaron.


## Verificación del motor horario — 28 de octubre de 2026

Estado: **DONE_WITH_CONCERNS**. Motor y E2E verificados localmente; la suite general y TypeScript tienen fallos ajenos a estos cambios. No se desplegó ni se escribieron datos en producción.

### Causa y regla de cálculo

El motor anterior contabilizaba el día, pero no descomponía el horario del Turno Día. Las extras y los recargos dependían exclusivamente de registros adicionales. Una prueba ejecutada contra el código anterior confirmó que Jornada de 7 horas + Turno Día de 08:00 a 18:00 producía incorrectamente 0 HEDO.

Ahora se obtiene la duración ordinaria de la Jornada vigente del empleado (`employee_schedule.shift_types`): intervalo entre inicio y fin menos `break_duration_minutes`. El Turno Día (`employee_shift_assignments.shifts`) aporta inicio, fin, cruce de medianoche y pausa. No se utiliza el horario de la Jornada como horario trabajado; se utiliza su duración neta como límite ordinario.

El intervalo se divide por cambio de fecha, inicio/fin de la franja nocturna y agotamiento de las horas ordinarias. Cada hora excedente se clasifica en HEDO, HENO, HEDF o HENF. RN y RNF se aplican únicamente a horas ordinarias nocturnas; una misma hora no se suma también como extra.

Se respeta la franja nocturna configurada por la empresa. Sin configuración se usa 19:00–06:00 desde el 25 de diciembre de 2025 y 21:00–06:00 antes de esa fecha. Referencia para la regla supletoria: [Ley 2466 de 2025, artículo 10](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=260676). Esto no verifica que las configuraciones existentes de cada empresa estén actualizadas.

### Consistencia y decisiones

- Cambios de Jornada y descanso se consultan por vigencia y ciclo laboral.
- Las pausas del Turno Día se distribuyen proporcionalmente por todo el intervalo, por decisión del usuario. Si el turno atraviesa franjas diferentes, se emite alerta para revisar la ubicación real del descanso.
- Un turno inferior a la duración ordinaria produce una fracción de Jornada; uno superior produce una Jornada y extras separadas.
- La tabla en modo horas acumula las horas por concepto y por fecha usando la Jornada individual, incluso si cambia durante el período. No multiplica todo por las horas generales de la empresa. El Excel conserva días y extras/recargos en horas, con unidades explícitas.
- Los días se atribuyen a la fecha de inicio de la asignación. Las extras y los recargos se atribuyen a la fecha civil de cada tramo. Por ello, un turno iniciado antes del período puede aportar horas sin sumar otra Jornada al período.
- Se consulta también el día anterior, incluyendo Jornada histórica, correcciones, incapacidades, vacaciones y permisos, para calcular correctamente el arrastre de medianoche.
- Descanso, no trabajado, suspensión, ausencias completas y correcciones diarias no generan horas automáticas de trabajo.
- Un permiso parcial sin hora de inicio/fin conserva las fracciones del día, pero deja las horas automáticas pendientes con alerta: su ubicación no puede deducirse.
- Cuando coinciden horas derivadas y registros aprobados para el mismo empleado, fecha civil y concepto, prevalece la suma de registros aprobados para ese concepto, con alerta de conciliación. No se suman de nuevo las automáticas. Los registros explícitos entre sí conservan su suma.
- Turnos duplicados o solapados se dejan pendientes con alerta. Horarios inválidos, descansos negativos/excesivos y banderas de medianoche contradictorias no generan extras/recargos inventados.
- Las alertas siguen exportándose y bloqueando el cierre del período.

### E2E reproducible

Ejecutar desde el repositorio:

```powershell
node scripts/test-preliquidation-e2e.mjs
```

El script usa Chromium, una instancia temporal de Vite, la página real, los hooks reales, el cliente HTTP de Supabase, el motor, la tabla y el archivo Excel descargado. La identidad y las respuestas HTTP se simulan con datos controlados. No valida autenticación, RLS ni persistencia contra una base real. Usa Playwright instalado o la instalación local de gstack; admite `PLAYWRIGHT_MODULE` para especificar otra ubicación.

Se configuraron 8 horas generales por empresa y una Jornada individual de 7 horas. La tabla debe mostrar 7 horas ordinarias, no 8.

| Caso | Turno Día | Resultado esperado y obtenido |
|---|---|---|
| Diurno | 08:00–18:00 | 1 Jornada; 3 HEDO |
| Mixto | 14:00–23:00 | 1 Jornada; 2 RN; 2 HENO |
| Festivo simulado | 08:00–18:00 | 1 festivo trabajado; 3 HEDF |
| Medianoche hacia festivo simulado | 20:00–06:00 | 1 Jornada; 4 RN; 3 RNF; 3 HENF |
| Pausa proporcional | 14:00–00:00, pausa 60 min | 1 Jornada; 2,5 RN; 2 HENO; alerta de pausa |
| Conciliación | 08:00–18:00 + registro aprobado de 3 HEDO | 3 HEDO; alerta de conciliación |
| Parcial | 08:00–11:30 | 0,5 Jornada; sin extras |
| Descanso | Turno marcado como descanso | 1 descanso remunerado; sin extras ni recargos |

Los festivos de la E2E son artificiales y no representan el calendario festivo real de octubre. Se verifican los seis conceptos horarios en el Excel, incluidos los valores cero. También se repite el cálculo para un período de un día: debe conservar el arrastre nocturno del turno anterior sin volver a sumar la Jornada.

Evidencias locales generadas: `outputs/preliquidacion-e2e/result.json`, `results.png` y `pre-liquidacion_2026-10-27_2026-10-28.xlsx`. El JSON conserva consultas y filas exportadas. La captura incluye alertas de días sin programación que se dejan deliberadamente vacíos en los datos de prueba.

### Verificaciones finales y límites

- **99 pruebas específicas aprobadas**: 88 del hook/motor, 6 de la vista, 4 de tabla y 1 de exportación. La matriz interna de conservación de horas cubre 40 combinaciones de horarios y pausas.
- **E2E aprobada: 8 escenarios**, sin errores de JavaScript ni escrituras a producción.
- **Regresión probada**: el caso 7h + 08:00–18:00 falla contra el motor anterior (0 HEDO) y pasa con el actual (3 HEDO).
- **Suite completa: 1124 aprobadas y 5 fallidas**, en 176 archivos. Las mismas cinco fallan con las fuentes de preliquidación anteriores: dos en `CortesControl.test.tsx` por falta de contexto Router; dos en `dotationSizes.test.ts` por expectativas de tallas; una en `hooks-company-filter.test.ts` por `useIncapacityLegalFollowUp.ts`.
- Compilación de producción aprobada. ESLint de los archivos de código modificados aprobado.
- TypeScript global no aprobado: presenta errores en otros módulos; no reporta errores en los archivos modificados para esta tarea.
- Esta vista consolida cantidades y deducciones. No liquida importes salariales de extras/recargos ni salario neto. Esta revisión tampoco certifica máximos semanales, excepciones contractuales especiales o el calendario/configuración real de cada empresa.

### Comprobación adicional del módulo de Novedades

Se trazó el flujo real `usePayrollNovelties` → consulta de `payroll_novelties` por empresa/período → `PreLiquidacion` → motor → tabla → Excel. Las horas guardadas por el formulario están en `hours`; los conceptos personalizados conservan `quantity` y `quantity_unit`.

La E2E se amplió de 8 a **11 escenarios** y pasó con datos HTTP controlados. Los tres nuevos casos verifican:

- Dos novedades HEDO aprobadas de 2 y 1,5 horas, sin turno asignado: **3,5 HEDO**. Otras novedades de 10 horas pendiente y 20 horas rechazada se excluyen.
- Turno que deriva 3 HEDO y novedad aprobada de 1 HEDO en la misma fecha: **1 HEDO**, con alerta. La cantidad aprobada sustituye la automática para ese concepto/fecha; no se suma a ella.
- Novedades aprobadas en festivo simulado: 1,5 HEDO, 2 HENO y 0,5 RN se reclasifican a **1,5 HEDF, 2 HENF y 0,5 RNF**, respectivamente.

Los resultados se verificaron en el Excel descargado. También pasaron **96 pruebas** del motor, la vista y el formulario de Novedades. No se modificó el motor durante esta comprobación.

**Límite identificado:** las horas de una novedad se toman de su cantidad y concepto registrados, y se reclasifican por su fecha de descanso/festivo. Sus campos `start_time` y `end_time` no se transmiten al motor; por tanto, el desglose automático por cambio diurno/nocturno o por medianoche implementado para el Turno Día no se aplica a esos horarios de Novedades. Esta verificación no prueba que una novedad horaria con concepto incorrecto o que cruce medianoche se corrija automáticamente.

### Nombres completos, documento y horas en Excel

La preliquidación ahora transmite y muestra primer nombre, segundo nombre, primer apellido y segundo apellido, omitiendo partes vacías. Las tarjetas móviles permiten que el nombre se distribuya en varias líneas.

La exportación usa `dayConceptHours` para Jornada, Descanso Obligatorio Trabajado, Festivo Trabajado, Descanso Remunerado, No trabajado y Suspensión. Las cabeceras indican `(hrs)`. Así, una Jornada individual de 7 horas se exporta como 7 y dos Jornadas de 7 y 8 horas se exportan como 15, independientemente de las horas generales de la empresa. Incapacidad, Vacaciones, Permisos y Total Días conservan las unidades indicadas en sus cabeceras; los conceptos personalizados conservan su unidad propia.

La columna Documento se escribe explícitamente como texto (`t: 's'`, formato `@`), con ancho suficiente para documentos largos. Se verifica que `001234567890123456` conserve sus ceros y dígitos después de serializar y volver a leer el XLSX. Esto no crea documentos ausentes en los datos de origen.

Verificación: **102 pruebas específicas aprobadas**, incluidos nombres completos en el grid y lectura de los bytes reales del XLSX; **11 escenarios E2E aprobados** con comprobación del archivo descargado. Compilación de producción y ESLint aprobados. No se alteraron las reglas del cálculo de horas en este ajuste.
