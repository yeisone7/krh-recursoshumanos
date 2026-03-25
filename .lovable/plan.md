

## Plan: Examen de Ingreso desde Selección con Aprobación Requerida para Contratar

### Resumen
Cuando un candidato está en estado "seleccionado", en lugar de contratar directamente, el flujo será:
1. **Registrar examen de ingreso** desde Selección (trayendo exámenes del profesiograma según centro de operación y cargo de la vacante)
2. El examen se guarda en la tabla `medical_exams` existente para trazabilidad
3. **Solo se puede contratar si el examen está aprobado** (resultado = "apto" o "apto_restricciones")

### Cambios

#### 1. Nuevo componente: `CandidateEntryExamDialog.tsx`
Diálogo modal para registrar el examen de ingreso del candidato, similar a `ExamTransactionFormDialog` pero simplificado:
- Pre-llena el candidato (no editable)
- Usa el profesiograma del centro de operación + cargo de la vacante para traer los exámenes requeridos
- Campos: fecha examen, proveedor/IPS, médico, concepto médico, resultado (Apto/Apto con restricciones/No Apto/Pendiente), restricciones, observaciones
- Lista de exámenes del profesiograma con checkboxes
- Guarda en `medical_exams` con `exam_type = 'ingreso'` y referencia al `candidate_id` (nuevo campo o vía el `employee_id` que se crea temporalmente)

**Enfoque**: Dado que `medical_exams` requiere `employee_id` y el candidato aún no es empleado, se guardará el examen vinculado al `candidate_id` en la tabla `selection_steps` con tipo `examenes_medicos` y adicionalmente se creará un registro en `medical_exams` al momento de contratar (ya existente). El concepto médico y resultado se almacenarán en `selection_steps`.

#### 2. Modificar `SelectionStepFormDialog.tsx`
Para la etapa `examenes_medicos`:
- Agregar campos adicionales: proveedor/IPS, nombre del médico, concepto médico detallado
- Cargar automáticamente los exámenes del profesiograma basado en el centro de operación y cargo de la vacante
- Mostrar lista de exámenes requeridos como checklist informativo
- El campo `result` ya existe y mapea a Apto/No Apto

#### 3. Modificar `CandidateDetailDialog.tsx`
- Cambiar la lógica del botón "Contratar": solo habilitarlo si existe una etapa `examenes_medicos` con estado `passed` (Apto)
- Si no hay examen aprobado, mostrar tooltip/mensaje: "Se requiere examen médico de ingreso aprobado para contratar"
- Agregar acceso rápido para registrar el examen desde el footer cuando el candidato está `selected`

#### 4. Modificar `VacancyDetailDialog.tsx`
- Misma lógica de validación del examen antes de contratar

#### 5. Modificar `useCandidates.ts` (useConvertToEmployee)
- Al contratar, tomar los datos del examen médico registrado en `selection_steps` y copiarlos a `medical_exams` con datos completos (proveedor, médico, concepto)
- Eliminar la creación automática de examen "pendiente" actual, ya que ahora el examen se registra antes

#### 6. Migración SQL (opcional)
- Agregar columnas a `selection_steps`: `provider`, `doctor_name`, `medical_concept` para almacenar los datos del examen médico durante selección
- Alternativa: usar el campo `notes` en formato JSON (menos limpio pero sin migración)

### Archivos a crear/modificar

| Archivo | Cambio |
|---------|--------|
| **Migración SQL** | Agregar `provider`, `doctor_name`, `medical_concept` a `selection_steps` |
| `src/components/selection/SelectionStepFormDialog.tsx` | Campos adicionales para etapa médica + carga de profesiograma |
| `src/components/selection/CandidateDetailDialog.tsx` | Validación de examen aprobado para contratar |
| `src/components/vacancies/VacancyDetailDialog.tsx` | Misma validación |
| `src/hooks/useCandidates.ts` | Copiar datos del examen médico a `medical_exams` al contratar |
| `src/hooks/useExamProfesiograma.ts` | Nuevo hook para buscar profesiograma por centro+cargo (sin employee) |

