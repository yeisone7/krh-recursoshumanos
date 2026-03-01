
## Permitir que una plantilla aplique a multiples cargos

### Problema actual
Actualmente cada plantilla tiene un solo `position_id`, lo que obliga a duplicar plantillas identicas cuando varios cargos comparten la misma evaluacion.

### Solucion
Crear una tabla intermedia (many-to-many) entre plantillas y cargos, reemplazando la columna `position_id` actual.

---

### Cambios planificados

#### 1. Migracion de base de datos

- **Crear tabla `evaluation_template_positions`** con columnas:
  - `id` UUID (PK)
  - `template_id` UUID (FK a `evaluation_templates`, ON DELETE CASCADE)
  - `position_id` UUID (FK a `positions`, ON DELETE CASCADE)
  - `created_at` TIMESTAMPTZ
  - Constraint UNIQUE en (template_id, position_id)
- **Migrar datos existentes**: copiar registros donde `position_id` no sea null a la nueva tabla
- **Eliminar columna** `position_id` de `evaluation_templates`
- **RLS**: Politica de lectura/escritura basada en `is_company_member` a traves del template

#### 2. Actualizar tipos (`src/types/evaluation.ts`)

- Reemplazar `position_id?: string` y `position?: { id; name }` por `positions?: { id: string; name: string }[]` en `EvaluationTemplate`

#### 3. Actualizar hook (`src/hooks/useEvaluations.ts`)

- En la query de templates, hacer join con la nueva tabla y luego con `positions`
- En `createTemplate` y `updateTemplate`: despues de crear/actualizar el template, insertar los registros en `evaluation_template_positions` (borrando los anteriores en update)
- En `duplicateTemplate`: copiar tambien las asociaciones de cargos

#### 4. Actualizar formulario (`src/components/evaluations/TemplateFormDialog.tsx`)

- Cambiar el campo `position_id` (selector unico) por un selector multiple de cargos
- Actualizar el schema de Zod: `position_ids: z.array(z.string()).optional()` en lugar de `position_id`
- Cuando se edita, precargar los cargos asociados

#### 5. Actualizar tarjetas en `Evaluaciones.tsx`

- En la tarjeta de plantilla, mostrar multiples badges con los nombres de cargos asociados (o "Todos los cargos" si no tiene ninguno)
- En duplicar, copiar el array de `position_ids`

---

### Detalle tecnico de la migracion SQL

```text
-- Tabla intermedia
CREATE TABLE evaluation_template_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES evaluation_templates(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, position_id)
);

-- Migrar datos existentes
INSERT INTO evaluation_template_positions (template_id, position_id)
SELECT id, position_id FROM evaluation_templates WHERE position_id IS NOT NULL;

-- Eliminar columna vieja
ALTER TABLE evaluation_templates DROP COLUMN position_id;

-- RLS
ALTER TABLE evaluation_template_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage template positions for their company"
ON evaluation_template_positions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM evaluation_templates et
    WHERE et.id = template_id
    AND et.company_id IN (SELECT get_user_company_ids())
  )
);
```

### Archivos a modificar
1. **Nueva migracion SQL** (tabla intermedia + migrar datos + drop columna)
2. `src/types/evaluation.ts` -- positions como array
3. `src/hooks/useEvaluations.ts` -- queries y mutaciones actualizadas
4. `src/components/evaluations/TemplateFormDialog.tsx` -- selector multiple de cargos
5. `src/pages/Evaluaciones.tsx` -- mostrar multiples cargos en tarjetas y duplicacion
