# Evaluaciones de desempeño — GH-FO-05-DR

La reestructuración incorpora las tres hojas del formato GH-FO-05-DR, versión 01:

| Formato | Competencias | Criterios | Fórmula del archivo |
| --- | ---: | ---: | --- |
| Estratégicos | 10 | 28 | Suma de valoraciones / 28 / 4 × 100 |
| Tácticos | 8 | 22 | Suma de valoraciones / 22 / 4 × 100 |
| Operativos | 6 | 16 | Suma de valoraciones / 16 / 4 × 100 |

Los criterios, descripciones de competencias y dimensiones proceden del Excel. Se normalizaron espacios; no se sustituyó el contenido por criterios genéricos. Cada criterio tiene inicialmente peso 1. Si se personalizan los pesos, la aplicación utiliza el promedio ponderado de los porcentajes por criterio.

## Uso

1. En **Evaluaciones → Plantillas**, agregar los formatos necesarios desde «Formatos por nivel del cargo».
2. En cada plantilla, configurar los cargos aplicables. La correspondencia la define RR. HH.; no se infiere de nombres de cargos. Una plantilla del Excel sin cargos asignados no aplica a ningún empleado.
3. Crear un ciclo con su plantilla y fechas. Un ciclo corresponde a un formato; para evaluar los tres niveles en un período se crean tres ciclos.
4. Generar las evaluaciones del ciclo en lote o crear una evaluación individual. Ambos caminos validan el cargo del empleado.
5. Aplicar la evaluación: confirmar cargo, campo, jefe inmediato, evaluador y fecha; calificar de 1 a 4; registrar observaciones y aspectos a destacar. Se pueden guardar borradores sin completar todas las respuestas.
6. Finalizar cuando estén completas las valoraciones, datos del encabezado y firmas. Las firmas dibujadas se conservan con la evaluación; no representan una integración con un proveedor de firma certificada.
7. Consultar/exportar el PDF. Una evaluación enviada puede pasar a revisada y luego a aprobada.

## Permisos de roles

En la matriz de acceso, **Evaluaciones → Crear** controla la creación de evaluaciones, ciclos, plantillas y duplicados. Las filas independientes **Marcar como Revisada** y **Marcar como Aprobada** utilizan su propia casilla en la columna **Aprobar**. También debe otorgarse **Ver** en Evaluaciones para acceder al módulo.

El permiso de revisión permite únicamente Enviada → Revisada; el de aprobación permite únicamente Revisada → Aprobada. Ninguno depende de Modificar ni concede acceso para cambiar las respuestas finalizadas. Los permisos se aplican en la lista, en el tablero y en PostgreSQL. Los administradores conservan su acceso y los roles personalizados requieren asignación explícita de los nuevos permisos. La revisión registra usuario y fecha.

La migración `20261018125458_evaluation_workflow_permissions.sql` fue aplicada al proyecto vinculado el 18 de octubre de 2026. Se verificaron el catálogo, la ausencia de asignaciones automáticas a roles personalizados y los tres disparadores de autorización. Las pruebas locales en PostgreSQL comprobaron creación denegada, separación de revisión/aprobación y conservación de respuestas finalizadas en los tres formatos.

## Cálculo y conservación

El resultado no se calcula mientras existan criterios sin respuesta. Al completar todos, se conserva el porcentaje con dos decimales. El archivo presenta rangos enteros (91–100, 75–90, 60–74, 0–59), sin regla para decimales entre ellos. La implementación clasifica usando el porcentaje original redondeado al entero más cercano y muestra esta regla en pantalla y PDF. Ejemplo: 90,5 % corresponde a Sobresaliente.

El cálculo final también se realiza en PostgreSQL. Respuestas, observaciones, resultado, encabezado y firmas se guardan en una transacción. Un error no deja una evaluación parcialmente finalizada ni cierra el formulario.

Las respuestas finalizadas no se editan. Una plantilla usada en ciclos permite actualizar sus cargos, pero para cambiar criterios o escala se debe duplicar y crear una nueva versión. Cambiar cargos no reasigna las evaluaciones existentes. El ciclo conserva su plantilla cuando ya tiene evaluaciones.

## Instalación

Aplicar la migración `supabase/migrations/20261017173633_evaluation_excel_workflow.sql` antes de publicar este frontend. Añade campos y funciones sobre las tablas existentes, conserva las políticas RLS e incorpora validaciones de cargo, empresa, escala y finalización. No instala plantillas automáticamente en todas las empresas: el usuario las agrega desde la interfaz. La clave del formato evita instalar dos veces el mismo formato base por empresa.

La migración `20261017173633` fue aplicada al proyecto Supabase vinculado el 17 de octubre de 2026. Se verificaron las columnas, funciones, permisos y disparadores antes de subir el frontend a `main`.

## Verificación

- Pruebas de cálculo y elegibilidad: `src/lib/evaluationScoring.test.ts`.
- Pruebas del formulario: `src/components/evaluations/ApplyEvaluationDialog.test.tsx`.
- Prueba de migración, transacciones, firmas, aislamiento por empresa y permisos en PostgreSQL local con PGlite: `scratch/evaluation-verification/database-test.mjs`. Usa un esquema de prueba derivado de las migraciones; no reemplaza la prueba integrada en el entorno Supabase de destino.
- Compilación Vite y revisión visual local con datos ficticios.

La comprobación global de TypeScript reporta errores preexistentes fuera del módulo de evaluaciones. Los resultados de las verificaciones locales se guardan en `scratch/evaluation-verification/`.
