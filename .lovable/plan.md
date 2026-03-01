
# Plan: Crear vista de "Aplicar Evaluacion" con calificacion por criterios

## Problema actual
El sistema permite crear plantillas con criterios y rubricas, crear ciclos, y crear evaluaciones generales con campos de texto libre. Sin embargo, **no existe una interfaz para calificar a un empleado criterio por criterio** usando la plantilla asociada al ciclo. La tabla `evaluation_scores` ya existe en la base de datos pero no se usa desde ningun componente.

## Solucion propuesta
Crear un nuevo componente `ApplyEvaluationDialog` que, al abrir una evaluacion existente o crear una nueva, cargue los criterios de la plantilla del ciclo y permita puntuar cada uno con su rubrica descriptiva.

## Flujo del usuario
1. En la tabla de **Evaluaciones**, cada fila tendra un boton "Evaluar" (ademas de Editar/Eliminar)
2. Al hacer clic en "Evaluar", se abre un dialog que muestra:
   - Encabezado con datos del empleado y ciclo
   - Lista de criterios agrupados por categoria, cada uno con:
     - Nombre y descripcion del criterio
     - Selector de nivel (1-4) mostrando la rubrica descriptiva de cada nivel
     - Campo de comentarios opcional por criterio
   - Seccion de preguntas cualitativas (las configuradas en la plantilla)
   - Campos de resumen: fortalezas, areas de mejora, plan de desarrollo
   - Puntaje total calculado automaticamente
   - Calificacion cualitativa derivada de la escala de la plantilla
3. Al guardar, se insertan/actualizan los `evaluation_scores` y se actualiza el `overall_score` y `overall_rating` de la evaluacion

## Archivos a crear/modificar

### 1. Nuevo componente: `src/components/evaluations/ApplyEvaluationDialog.tsx`
- Dialog de pantalla completa o muy amplio (`max-w-4xl`)
- Recibe: `evaluation` (PerformanceEvaluation), template criteria, rating scale, qualitative questions
- Usa `react-hook-form` con campos dinamicos para scores por criterio
- Cada criterio muestra 4 botones/radio para seleccionar nivel, con tooltip o texto describiendo cada nivel
- Calcula puntaje ponderado en tiempo real
- Al guardar llama a `updateEvaluation` con los scores

### 2. Nuevo componente: `src/components/evaluations/CriteriaScoreCard.tsx`
- Componente individual para calificar un criterio
- Muestra nombre, categoria, peso
- 4 opciones de nivel con descripciones de rubrica (colapsables)
- Campo de comentarios

### 3. Modificar: `src/pages/Evaluaciones.tsx`
- Agregar boton "Evaluar" en el dropdown de acciones de cada evaluacion
- Agregar estado para controlar el dialog de aplicacion
- Pasar la plantilla del ciclo al nuevo dialog

### 4. Modificar: `src/hooks/useEvaluations.ts`
- Agregar query para cargar scores existentes de una evaluacion (`evaluation_scores` con join a `evaluation_criteria`)
- Asegurar que `updateEvaluation` persista scores correctamente (ya tiene logica parcial)

### 5. Modificar: `src/components/evaluations/index.ts`
- Exportar los nuevos componentes

## Detalles tecnicos

### Calculo del puntaje
```text
Por cada criterio:
  score_normalizado = (nivel_seleccionado / max_score) * peso

Puntaje total = (suma de score_normalizado / suma de pesos) * 100

Se mapea a la escala de calificacion de la plantilla:
  91-100 -> Sobresaliente
  75-90  -> Bueno
  60-74  -> Aceptable
  0-59   -> Deficiente
```

### Estructura del formulario
```text
+--------------------------------------------------+
| Evaluar: Juan Perez | Ciclo: 2026-Q1             |
+--------------------------------------------------+
| COMPETENCIAS ORGANIZACIONALES                     |
| +----------------------------------------------+ |
| | Trabajo en Equipo          Peso: 2            | |
| |  (1) No Desarrollada  [descripcion...]        | |
| |  (2) En Desarrollo    [descripcion...]        | |
| |  (3) Bueno            [descripcion...]  <--   | |
| |  (4) Ampliamente      [descripcion...]        | |
| | Comentarios: [________________]               | |
| +----------------------------------------------+ |
|                                                  |
| PREGUNTAS CUALITATIVAS                           |
| Que aportes ha hecho...? [textarea]              |
|                                                  |
| RESUMEN                                          |
| Puntaje: 78/100 - Bueno                         |
| Fortalezas: [textarea]                           |
| Areas de mejora: [textarea]                      |
| Plan de desarrollo: [textarea]                   |
|                                                  |
|                    [Cancelar] [Guardar Progreso]  |
|                               [Finalizar]         |
+--------------------------------------------------+
```

### Persistencia
- "Guardar Progreso" guarda scores y mantiene status `in_progress`
- "Finalizar" valida que todos los criterios esten calificados, calcula puntaje final, cambia status a `submitted`
