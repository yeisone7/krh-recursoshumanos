# Asistente de Reportes — contrato v2

La pestaña **Análisis de Datos** conserva su posición en Asistente IA y utiliza
`ReportWorkspace`. Pregunta y filtros arriba, resultado central y favoritas/recientes
a la derecha; en móvil se abre un panel. La pestaña de ayuda conserva su implementación.
Los dos espacios mantienen su estado al alternar. Cambiar de empresa o usuario
desmonta el reporte y cancela las solicitudes anteriores.

## Consultas y seguridad

1. `ai-data-assistant` verifica el JWT con `auth.getUser()`.
2. `ai_report_library` entrega solamente el catálogo permitido en la empresa activa.
3. El proveedor configurado selecciona fuentes y propone un `ReportPlan` JSON.
4. `validation.ts` valida campos, operadores, métricas, relaciones, tamaños y fechas.
5. `create_ai_report` vuelve a validar independientemente en PostgreSQL. El compilador
   usa identificadores del catálogo, operadores enumerados y valores citados; no admite
   SQL, expresiones o nombres de tablas arbitrarios.
6. Las vistas `report_data` son `security_invoker` y mantienen el RLS de sus tablas.
   Se agregan comprobaciones de módulo, empresa, centros y acceso al empleado.
7. La ejecución completa se guarda en `report_private.runs`. Tablas y favoritas no
   tienen acceso directo desde los roles del navegador; se usan RPC con propietario
   y empresa verificados.

Las credenciales administrativas se utilizan exclusivamente para leer la configuración
del proveedor de la empresa, después de autorizar al usuario. Todas las lecturas
analíticas y operaciones de biblioteca se realizan con el JWT del usuario.
El RPC antiguo `execute_read_only_query(text)` quedó sin permisos para `anon`,
`authenticated` y `service_role`.

Se requiere el permiso de Asistente IA y su habilitación en `user_preferences`, además
del permiso de cada módulo. Los roles personalizados se evalúan en la empresa activa.
Administradores conservan las excepciones existentes de la aplicación; el superadministrador
conserva su acceso global. Los campos salariales tienen una comprobación adicional.

La huella de acceso incluye permisos, roles personalizados y sus empresas, centros,
empleados accesibles, historia de centros y versión del catálogo. Si cambia, recuperar
el resultado exige una ejecución nueva. Exportar exige además permisos de exportación
de todas las fuentes y campos restringidos utilizados.

## Catálogo y significado de los resultados

`supabase/functions/_shared/reporting/catalog.json` documenta 121 fuentes registradas.
Las migraciones contienen sus vistas y metadatos. `scripts/build-report-catalog.mjs`
regenera un borrador a partir de un inventario del esquema real; el resultado debe
revisarse y desplegarse mediante una migración nueva. No descubre ni autoriza campos
nuevos automáticamente en ejecución.

Incluye empleados y vinculaciones, contratos y prórrogas, selección, jornadas y reloj,
novedades y recibos de nómina, ausencias, prestaciones, formación, cumplimiento,
evaluaciones, disciplinarios, exámenes, dotación, COPASST, PILA/UGPP, alertas,
automatizaciones, auditoría y catálogos de negocio. Solo se registran campos escalares
revisados y metadatos de documentos: no adjuntos, chats, contraseñas, claves, tokens,
firmas ni objetos JSON completos.

Las relaciones entre fuentes realizan `EXISTS`/`NOT EXISTS` por empleado para evitar
multiplicar filas. No se admite una unión arbitraria entre tablas. Cada relación verifica
los permisos de ambos lados. La historia laboral se resuelve con intervalos y,
cuando existe, la vinculación del registro.

Métricas derivadas registradas:

- **Edades y vinculaciones:** `age_years` y `age_band` describen la edad actual;
  `age_at_first_hire` y `first_hire_date` usan la primera vinculación registrada.
  `age_at_hire`, `age_at_exit` e `is_first_hire` permiten distinguir ingresos,
  reingresos y retiros. Las edades son años cumplidos; fechas faltantes o invertidas
  producen NULL, nunca cero. La primera vinculación se consulta mediante la vista
  autorizada: no revela una contratación perteneciente a un centro histórico oculto.
  `tenure_days` y `tenure_years` miden una vinculación hasta su retiro o hasta hoy en
  Bogotá si sigue abierta; no suman períodos separados por retiros.
- **Contratos:** `effective_end_date` considera las prórrogas, además de conservar las
  fechas originales. `days_until_end` mide días calendario desde hoy hasta ese
  vencimiento (negativo si venció); `contract_duration_days` mide el tiempo entre
  inicio y vencimiento, sin incluir ambos extremos como días completos.
- **Reloj:** minutos programados con la misma diferencia de horarios y descuento de
  descanso de `timeClock.scheduledMinutes`; los minutos trabajados provienen del reloj.
- **Ausentismo:** un día calendario por persona, sin duplicar ausencias superpuestas;
  separa meses, usa el centro histórico y respeta interrupciones/reanudaciones de
  vacaciones. Excluye permisos por horas, compensaciones y acumulaciones. No representa
  una tasa ni días liquidables de nómina; esas preguntas requieren definir el denominador
  o acudir a los cálculos correspondientes del módulo.
- **Capacitación:** una obligación por empleado activo, curso y mes. Usa periodos
  configurados o enlaces del centro; reconoce finalizaciones por empleado/documento y
  por curso, nombre o código normalizados, como `useTrainingCompliance`. La plantilla y
  el centro son actuales; no se presentan como una fotografía histórica. La finalización
  puede ser anterior al periodo, conforme al cálculo existente.

Las fuentes de nómina conservan sus valores registrados. No se inventan fórmulas para
recalcular liquidaciones, saldos o indicadores que no estén registrados en el catálogo.
En esos casos el asistente debe pedir precisión, en lugar de generar expresiones SQL.

El planificador utiliza nombres y significado de campos al seleccionar fuentes, y
recibe la definición anterior al refinar. Por defecto, «menos de 25 años al
contratarlos» cuenta personas en su primera contratación registrada, con edad
estrictamente menor a 25, sin imponer estado activo. Un período de contrataciones
se aplica a `start_date` de vinculaciones, nunca a `created_at` del empleado.
Validaciones semánticas rechazan sustituir edad de contratación por edad actual,
incluir el límite de una pregunta «menos de», omitir primera contratación en esa
consulta o contar vinculaciones como personas. La respuesta explica el momento
del cálculo y el tratamiento de fechas faltantes. Las consultas conservan siempre
el alcance de permisos del usuario; no garantizan datos que no estén registrados.

Los filtros de fecha repetidos por el modelo se eliminan únicamente cuando coinciden
con el período de pantalla; una contradicción solicita aclaración. En fuentes de
intervalos se mantiene el criterio de solapamiento del compilador. Los filtros de
sexo emplean los códigos del catálogo (M, F, O).

Los agregados se calculan antes de paginar. La tabla ordena y busca sobre la ejecución
guardada. Los indicadores suman únicamente métricas aditivas; no promedian promedios
ni suman conteos distintos entre grupos. Los gráficos muestran hasta 60 grupos e
informan expresamente ese alcance; tabla y descarga mantienen el resultado completo.

## Biblioteca, fechas y proveedores

Las favoritas guardan pregunta, contexto y filtros explícitos, no una respuesta congelada.
Reejecutarlas crea otro identificador y vuelve a interpretar «este mes» en
`America/Bogota`. Los refinamientos incluyen las preguntas previas y el plan anterior.
Un mes completo se compara con el mes calendario anterior; otros intervalos, con
el intervalo inmediatamente anterior de igual duración. La comparación también puede
resolver el periodo desde los filtros del plan, sin congelarlo en la favorita.

El historial antiguo sigue disponible como consultas de texto que necesitan ejecutarse
de nuevo. Recuperar una ejecución no gasta una nueva consulta al proveedor.

OpenAI, Gemini y Anthropic usan respuestas JSON estructuradas. No hay cambio silencioso
de proveedor ni reutilización de la clave de otra empresa. Los modelos pueden indicarse
en Configuración → IA. Cada petición tiene un tiempo máximo de 40 segundos y, únicamente
ante un error 5xx, un segundo intento. Una respuesta con plan inválido puede corregirse
una vez. Cuota, configuración, espera agotada, ambigüedad y permisos producen mensajes
distintos. El resumen y los indicadores se generan desde resultados verificados sin
depender de otra llamada de red para explicar los datos.

El dictado depende del soporte del navegador. La lectura del resumen siempre requiere
una acción manual; no hay lectura automática.

## Exportaciones y límites operativos

- Resultado completo: máximo **50.000 filas o 16 MiB**. Si se supera, se rechaza con un
  mensaje que solicita acotar el reporte; no se entrega una muestra como si fuera el total.
- Página: hasta 1.000 filas por solicitud. La tabla utiliza 50 y la descarga lotes de 1.000.
- Excel/CSV/PDF recuperan todas las filas de la misma ejecución, con progreso y cancelación.
  Las descargas no repiten consultas sobre tablas que puedan cambiar entre páginas.
- Excel conserva identificaciones como texto y números como números. CSV escapa valores
  susceptibles de interpretarse como fórmulas. PDF incluye contexto, filtros, indicadores,
  gráfico y todas las columnas en bandas horizontales y páginas sucesivas.

Los registros operativos de la función incluyen identificador, acción, duración, proveedor,
fuentes, volumen y código de error. No registran claves, preguntas ni resultados personales.

## Validación realizada el 7 de octubre de 2026

- 18 pruebas automatizadas específicas: validación de planes, fuentes, exportación de
  2.507 filas, cancelación, inyección en CSV, tres proveedores simulados, errores,
  aclaraciones, refinamiento y cambio de empresa.
- `supabase/tests/report_catalog.sql`: listado y agregación para las 121 fuentes.
- `supabase/tests/report_workspace.sql`: 1.507 filas, totales independientes de la página,
  empresa/centro/módulo/campo, RLS real de empleados, exportación denegada, SQL manipulado,
  historial ajeno, favoritas y cambio de permisos.
- `supabase/tests/report_metrics.sql`: prórrogas, centro actual e histórico, ausencias
  superpuestas entre meses, capacitación por documento y nombre normalizado y comparación
  de periodos. Los tres archivos SQL revierten todas sus modificaciones al terminar.
- Pruebas reales completas de **OpenAI y Gemini**: generar, recuperar, guardar favorita
  y reejecutar, con usuario restringido y empresa temporal sin empleados. Las identidades,
  empresas, configuraciones temporales y resultados fueron eliminados al terminar.
- Anthropic: contrato, respuesta inválida, cuota y errores verificados con respuestas
  simuladas; no existe una clave configurada para una comprobación en vivo.
- Navegador: vista de escritorio y móvil de 390 px, panel lateral, favoritas y descargas
  reales de CSV, Excel y PDF con datos de demostración.
- Compilación Vite correcta, comprobación Deno correcta y lint de los archivos nuevos correcto.
- Suite general: **878 de 880 pruebas aprobadas**. Las dos fallidas pertenecen a
  `CortesControl.test.tsx`, que monta un componente con `Link` sin un Router; esos archivos
  no fueron modificados. La comprobación TypeScript global también contiene errores
  existentes fuera de esta implementación.

## Estado del despliegue

En Supabase se aplicaron, en orden:

1. `20261007160714_ai_report_workspace.sql`.
2. Despliegue de `ai-data-assistant` v2.
3. `20261007170137_retire_ai_raw_sql.sql`.
4. `20261007170944_report_relative_comparison.sql`.
5. `20261007171552_report_training_parity.sql`.
6. `20261007172709_report_input_validation.sql` (rechazo de operadores y paginación nulos).

Se aplicaron de manera aislada porque el historial local y remoto contiene diferencias
anteriores a este trabajo. No se aplicaron otras migraciones pendientes.

La interfaz está implementada y compilada en este repositorio. Su publicación en Vercel
requiere reconectar la integración: la consulta de equipos devuelve `UNAUTHORIZED`
con solicitud de reautenticación. No se ha publicado una versión web nueva.

## Ampliación de interpretación y edades

- Migración `20261008042156_reporting_analytical_fields.sql` aplicada; función
  `ai-data-assistant` desplegada después de registrar los nuevos campos.
- 37 pruebas del asistente aprobadas: interpretación, validación, proveedores,
  exportación y formulario. Compilación Vite, comprobación Deno y lint de los
  archivos funcionales modificados correctos. La comprobación TypeScript global
  continúa mostrando errores previos de otros módulos.
- `supabase/tests/reporting_analytical_fields.sql` comprueba cumpleaños, fechas
  faltantes/invertidas, primera contratación, reingresos, conteo distinto, períodos,
  antigüedad, vencimiento con prórrogas y aislamiento por empresa/centro histórico.
  Revierte todos sus datos de prueba. También pasaron `report_workspace.sql` y
  `report_metrics.sql` después de la migración.
- OpenAI: cinco preguntas verificadas contra empleados ficticios con edades conocidas:
  edad al contratar, refinamiento por sexo, edad actual, contrataciones de un mes y
  contratos próximos a vencer; también recuperación, favorita y reejecución.
- Gemini: flujo básico y pregunta de edad al contratar correctos; la cuota del
  proveedor impidió completar el resto. Las identidades y empresas temporales
  fueron eliminadas. No se modificaron empleados reales.
- Revisión de seguridad antes/después: 193 hallazgos preexistentes, sin nuevos.
- La interfaz incluye tarjetas con preguntas de ejemplo sobre edad al contratar,
  edad actual, vencimientos, ausencias, capacitación y nómina.
