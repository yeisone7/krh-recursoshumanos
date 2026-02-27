

## Plan: Redesign Public Training Access Link Flow

### Problems Identified

1. **Completion insert error**: The `training_completions` insert likely fails because the page runs as `anon` user, and some required fields may be missing or the `quiz_score` field doesn't exist in the table. The insert also includes `completed_at` as a string which should use the default.
2. **No cedula validation against employees**: Currently accepts any name/cedula without verification.
3. **UI doesn't match reference images**: Current design is basic cards; reference shows branded header, structured layout with company info, media gallery, radio-style quiz, retry mechanism, detailed signature panel, and completion summary.
4. **Quiz allows proceeding to signature even if failed**: No 80% pass enforcement.

### Database Migration

Add `quiz_score` column to `training_completions` and create an RLS policy allowing anon to SELECT employees by `document_number` (limited to just checking existence):

```sql
-- Add quiz_score to training_completions
ALTER TABLE public.training_completions ADD COLUMN quiz_score integer;

-- Allow anon to verify employee existence by document_number
CREATE POLICY "Anon can verify employee by cedula"
  ON public.employees_v2
  FOR SELECT
  TO anon
  USING (true);
-- Note: The query will only select id, first_name, last_name filtered by document_number and company_id
```

Actually, exposing all employees to anon is risky. Instead, create a database function callable by anon that returns only boolean + name for a given cedula + company_id:

```sql
CREATE OR REPLACE FUNCTION public.verify_employee_cedula(p_cedula text, p_company_id uuid)
RETURNS TABLE(employee_id uuid, employee_name text) 
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, first_name || ' ' || last_name 
  FROM public.employees_v2 
  WHERE document_number = p_cedula AND company_id = p_company_id AND status = 'Activo'
  LIMIT 1;
$$;
```

### File Changes

#### 1. `src/pages/capacitaciones/AccesoPublico.tsx` — Full Redesign

Matching all reference images in order:

- **Header**: Branded bar with Petrocasinos icon + company name + "CAPACITACION" subtitle (dark green bg, white text)
- **Identify step**: Company logo at top, course info card (name, category, duration), Name + Cedula fields (both required), "Continuar a la Capacitacion" button. On cedula blur, call `verify_employee_cedula` RPC — if not found, show error and block continue.
- **Content step**: Course title, metadata (category, duration, center name), evaluation required alert (amber banner), sections for Introduccion, Objetivos, Contenido (markdown), Puntos Clave. Add **Media gallery** section showing `training_media` images with carousel + thumbnails + audio player. CTA button: "He leido y entendido - Realizar Evaluacion" or "Continuar a Firma".
- **Quiz step**: Header bar stays with course name. Card with "Evaluacion de Conocimientos / Pregunta X de N", progress bar, radio-style options (circle radio, not letter badges), "Volver al Contenido" + "Siguiente" buttons. On failure (<80%): show red icon, "Evaluacion No Aprobada", score, required minimum 80%, list of questions with correct answers, "Volver al Contenido" + "Reintentar Evaluacion" buttons. On pass: proceed to signature.
- **Signature step**: Card with "Firma Digital / Confirma tu participacion", "Firma de Confirmacion" heading, summary (Nombre, Cedula, Fecha), signature canvas, Limpiar/Cancelar/Confirmar Firma buttons, legal notice text.
- **Done step**: Green checkmark, "Capacitacion Completada!", summary card (Capacitacion, Nombre, Cedula, Fecha), "Puedes cerrar esta ventana" text.

#### 2. `src/components/training/EvaluationQuiz.tsx` — Redesign

- Change to radio-style options (circle indicators instead of letter badges)
- Don't show instant feedback per question — just select and move to next
- Add "Volver al Contenido" button via `onGoBack` callback prop
- On finish: if score < 80%, show failure screen with question review + "Reintentar Evaluacion" button (resets quiz)
- If score >= 80%, call `onComplete(true, score)`
- Remove `requirePerfect` prop, use 80% threshold always

#### 3. `src/components/training/SignatureCanvas.tsx` — Minor Update

- Add "Cancelar" button
- Update text to match reference: "Firma aqui con el mouse o dedo"
- Add `onCancel` callback prop

### Implementation Summary

| File | Action |
|------|--------|
| Migration SQL | Add `quiz_score` column + `verify_employee_cedula` function |
| `AccesoPublico.tsx` | Full rewrite to match 7 reference screens |
| `EvaluationQuiz.tsx` | Redesign: radio options, no instant feedback, retry on fail, 80% threshold |
| `SignatureCanvas.tsx` | Add cancel button + updated placeholder text |

