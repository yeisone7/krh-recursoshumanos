

## Adaptar Plantillas de Evaluacion de Desempeno segun el Excel

### Resumen
Se adaptara el modulo de Evaluaciones de Desempeno para que las plantillas sigan la estructura del formato Excel adjunto (GH-FO-05-DR), permitiendo asociar cada plantilla a un **Cargo** especifico, y que cada criterio tenga **descripciones por nivel de competencia** (4 niveles con rubricas descriptivas). Tambien se agregaran campos de preguntas cualitativas y tabla de calificacion.

### Estructura del Excel analizado
El formato define:
- **Cargo** asociado (ej: "Cocinero 1 / Jefe de Cocina")
- **Competencias** con 4 niveles de rubrica descriptiva:
  - 4: Ampliamente Desarrollada
  - 3: Bueno dentro del Estandar
  - 2: Competencia en Desarrollo
  - 1: Competencia No Desarrollada
- Competencias identificadas: Trabajo en Equipo, Responsabilidad, Iniciativa, Habilidad Analitica, Tolerancia a la Presion, Seguridad Vial, SST, Ambiental, Calidad
- **Preguntas cualitativas**: Aportes, aspectos a mejorar, compromisos
- **Tabla de valores**: Sobresaliente (91-100%), Bueno (75-90%), Aceptable (60-74%), Deficiente (0-59%)

---

### Cambios planificados

#### 1. Migracion de base de datos

**Tabla `evaluation_templates`** - agregar columna:
- `position_id` (UUID, nullable, FK a `positions`) -- para vincular plantilla a un cargo

**Tabla `evaluation_criteria`** - agregar columnas para rubricas descriptivas:
- `level_4_description` (TEXT) -- Descripcion para calificacion 4
- `level_3_description` (TEXT) -- Descripcion para calificacion 3
- `level_2_description` (TEXT) -- Descripcion para calificacion 2
- `level_1_description` (TEXT) -- Descripcion para calificacion 1

**Tabla `evaluation_templates`** - agregar columnas para preguntas cualitativas y escala:
- `qualitative_questions` (JSONB) -- Array de preguntas abiertas configurables
- `rating_scale` (JSONB) -- Escala de calificacion (ej: Sobresaliente 91-100%)

RLS policies se mantendran las existentes ya que las tablas ya tienen politicas por empresa.

#### 2. Actualizar tipos TypeScript (`src/types/evaluation.ts`)

- Agregar `position_id` y relacion `position` a `EvaluationTemplate`
- Agregar `level_1_description` a `level_4_description` en `EvaluationCriteria`
- Agregar `qualitative_questions` y `rating_scale` a `EvaluationTemplate`
- Definir constantes para la escala de calificacion por defecto

#### 3. Actualizar `TemplateFormDialog` (`src/components/evaluations/TemplateFormDialog.tsx`)

- Agregar selector de **Cargo** (SearchableSelect con los cargos de la empresa via `usePositions`)
- Cada criterio ahora tendra 4 campos de texto para las descripciones de cada nivel (expandibles/colapsables)
- Se fijara `max_score = 4` por defecto (escala 1-4 del formato)
- Agregar seccion para configurar preguntas cualitativas
- Agregar seccion para la tabla de valores/escala de calificacion con valores por defecto del Excel

#### 4. Actualizar hook `useEvaluations` (`src/hooks/useEvaluations.ts`)

- Incluir `position_id` en las queries de templates
- Hacer join con `positions` para mostrar el nombre del cargo
- Pasar las nuevas columnas de criterios en create/update

#### 5. Actualizar pagina `Evaluaciones.tsx`

- Mostrar la columna **Cargo** en la tabla de plantillas
- Mostrar el nombre del cargo asociado a cada plantilla

---

### Detalle tecnico de la migracion SQL

```text
ALTER TABLE evaluation_templates
  ADD COLUMN position_id UUID REFERENCES positions(id) ON DELETE SET NULL;

ALTER TABLE evaluation_criteria
  ADD COLUMN level_4_description TEXT,
  ADD COLUMN level_3_description TEXT,
  ADD COLUMN level_2_description TEXT,
  ADD COLUMN level_1_description TEXT;

ALTER TABLE evaluation_templates
  ADD COLUMN qualitative_questions JSONB DEFAULT '["¿Qué aportes ha hecho usted a la empresa, área o campo donde se desempeña?", "¿En qué aspectos opina usted que debe mejorar?", "Teniendo en cuenta los aspectos en donde la calificación no es muy buena, ¿Qué compromisos va a adquirir para mejorar?"]'::jsonb,
  ADD COLUMN rating_scale JSONB DEFAULT '[{"label":"Sobresaliente","min":91,"max":100,"description":"Mantener el compromiso hasta ahora alcanzado"},{"label":"Bueno","min":75,"max":90,"description":"Trabajar en mejora continua"},{"label":"Aceptable","min":60,"max":74,"description":"Requiere capacitación continua"},{"label":"Deficiente","min":0,"max":59,"description":"Requiere cumplimiento inmediato"}]'::jsonb;
```

### Archivos a modificar
1. **Nueva migracion SQL** (via herramienta de migracion)
2. `src/types/evaluation.ts` -- nuevos campos
3. `src/components/evaluations/TemplateFormDialog.tsx` -- formulario rediseñado con cargo, rubricas, preguntas y escala
4. `src/hooks/useEvaluations.ts` -- queries actualizadas
5. `src/pages/Evaluaciones.tsx` -- columna de cargo en tabla de plantillas

