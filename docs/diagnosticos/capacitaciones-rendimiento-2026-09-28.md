# Capacitaciones: diagnóstico y corrección de rendimiento

Fecha: 28 de septiembre de 2026.

## Resultado y estado

La demora tenía causas en la base de datos y en el navegador. La optimización de Supabase ya está aplicada y registrada como migración `20260928210055_optimize_training_report_reads`. Las mejoras del frontend se incluyen en esta entrega a `main`; el estado de publicación se verifica en el despliegue de Vercel asociado al commit.

No se eliminaron ni modificaron capacitaciones, evidencias, firmas o empleados. La migración únicamente crea un índice y cambia la forma de evaluar tres políticas de lectura, conservando sus reglas de acceso. Al finalizar había 8.003 evidencias, 33 cursos y 704 enlaces; hubo nuevas evidencias durante la investigación.

## Evidencia del backend

Se utilizó Supabase CLI con consultas de diagnóstico y `EXPLAIN (ANALYZE, BUFFERS)` bajo el rol `authenticated`, simulando un usuario existente con permisos de capacitación, sin obtener ni cambiar sus credenciales.

La consulta de Cumplimiento devuelve una página de 1.000 registros con desplazamiento 6.000, curso relacionado y orden `completed_at DESC, id ASC`. Se midió la misma consulta y el mismo usuario:

| Medición | Antes | Después aplicado |
| --- | ---: | ---: |
| Tiempo de ejecución SQL | 4.283,371 ms | 37,892 ms |
| Filas devueltas | 1.000 | 1.000 |
| Bloques encontrados en caché | 137.639 | 3.160 |

Es una medición puntual del servidor, no el tiempo total de carga de la pantalla. Una prueba previa con reversión automática dio 82,623 ms. Las estadísticas históricas de `pg_stat_statements` mostraban 4.254 ms de promedio para la consulta actual de Cumplimiento y hasta aproximadamente 8 segundos en consultas de ambas vistas. No había consultas esperando bloqueos cuando se inspeccionó `pg_stat_activity`.

Causa: las políticas llamaban funciones de permisos y pertenencia a empresa por cada evidencia examinada. Además, no existía un índice por empresa y fecha para estas lecturas paginadas. La nueva expresión evalúa los permisos independientes de la fila una vez por consulta y consulta el conjunto de empresas autorizadas. Conserva el acceso de superadministradores, administradores/RRHH y los mismos módulos autorizados. No cambia las políticas de escritura, el acceso anónimo ni las restricciones de centros.

La modificación sigue las [recomendaciones de rendimiento de RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) y sus [recomendaciones de índices](https://supabase.com/docs/guides/database/query-optimization).

## Cambios del frontend

- Cumplimiento reconstruía la matriz completa al escribir cada letra. Ahora memoriza el resultado y usa índices por curso/empleado/documento, manteniendo la coincidencia por nombre/código de cursos históricos y el registro más reciente.
- Las búsquedas usan actualizaciones diferidas y la tabla de Cumplimiento memoriza su contenido para que escribir no vuelva a dibujar todos los registros.
- Ambas tablas muestran páginas de 50 registros; las búsquedas y exportaciones siguen usando todos los datos cargados. En Evidencias, seleccionar la casilla del encabezado selecciona la página visible.
- El árbol de Evidencias prepara fechas únicamente para las hojas visibles y ofrece «Mostrar más» en grupos grandes.
- Evidencias descargaba los campos del curso, incluido `content`, repetidos por cada evidencia. Ahora obtiene cada curso una vez y comparte sus datos, conservando los campos necesarios para PDF/Word. Para las 8.003 evidencias de todas las empresas, el contenido repetido sumaba 45.721.465 bytes frente a 159.518 bytes de cursos únicos. Son tamaños SQL sin compresión, no una medición de transferencia de red.

## Verificación

- 15 comparaciones antes/después de los identificadores visibles: cinco perfiles (superadministrador, usuarios con acceso de capacitación, usuario de otra empresa y usuario sin asignaciones) sobre evidencias, cursos y enlaces. Todas coinciden. Se realizaron dentro de la transacción de aplicación, con excepción y reversión si cambiaba la visibilidad.
- Migración registrada e índice presentes en Supabase.
- Comparación de asesores de seguridad/rendimiento: 803 avisos antes y después, sin avisos nuevos. Los avisos existentes quedan fuera de este arreglo.
- 22 pruebas del módulo aprobadas: coincidencia histórica, restricciones de centros/empresa, duplicados, paginación superior a 1.000 evidencias, estabilidad de la matriz al volver a renderizar, carga única de cursos, errores de carga, búsqueda y exportación completas con tabla paginada.
- Fixture sintético de 8.000 evidencias, 1.300 empleados y 17 cursos: 18,4 ms con índice frente a 176,6 ms para las búsquedas previas por empleado. Esta comparación no incluye el coste adicional del algoritmo anterior al recorrer centros y normalizar todos los cursos repetidamente.
- Compilación de producción aprobada; ESLint de las vistas y pruebas modificadas aprobado; `git diff --check` aprobado.
- Suite general ejecutada: 735 pruebas aprobadas y 2 fallidas en `src/pages/CortesControl.test.tsx`, por falta de contexto de React Router en esas pruebas. Ese módulo no fue modificado.
- La comprobación global de TypeScript presenta errores en código existente (incluidos tipos generados incompletos de certificados de capacitación), fuera de las líneas modificadas. No se declara una comprobación global de tipos exitosa.

Durante el diagnóstico no se validó una sesión real de usuario en navegador. La verificación de interfaz fue mediante pruebas de componentes. Para comprobar que el frontend publicado incluye la mejora, el `buildId` de `/app-version.json` debe coincidir con el commit de esta entrega o uno posterior que lo contenga.
