

## Plan: Auto-llenado por Documento y Alertas de Verificación de Candidatos

### Objetivo
1. **Auto-llenado en Registro Público**: Cuando un candidato ingrese su numero de documento en el formulario de auto-registro, buscar si ya existe como candidato previo en la misma vacante/empresa y pre-llenar los campos con su información existente.
2. **Alertas de verificación al iniciar proceso**: Cuando se agrega un candidato (modal Nuevo Candidato o detalle), mostrar alertas si la persona:
   - Estuvo vinculada como empleado en la empresa
   - Tuvo procesos disciplinarios
   - Participó en procesos de selección anteriores

---

### Paso 1: Backend - Crear RPC de verificación de antecedentes

Crear una función RPC `check_candidate_background` que reciba `document_number`, `document_type` y `company_id`, y retorne un JSON con:
- **was_employee**: si existe en `employees_v2` (activo o inactivo), con nombre, fechas de vinculación y estado
- **had_disciplinary**: si tiene procesos en `disciplinary_processes` vinculados por `employee_id`
- **previous_candidacies**: si existe en `candidates` para otras vacantes de la misma empresa, con estado y vacante

Migración SQL con la función `SECURITY DEFINER`.

### Paso 2: Auto-llenado en Registro Público (`RegistroPublico.tsx`)

- Agregar un efecto `onBlur` en el campo `documentNumber` del formulario de candidato
- Al perder el foco, llamar a `supabase.rpc('check_candidate_background')` pasando el documento y company_id del token
- Si encuentra candidaturas previas, pre-llenar los campos del formulario con la información más reciente (nombre, email, teléfono, dirección, etc.)
- Mostrar un banner informativo: "Se encontró información previa asociada a este documento. Los campos han sido pre-llenados."

### Paso 3: Auto-llenado en Modal Nuevo Candidato (`CandidateFormDialog.tsx`)

- Agregar lógica similar con `onBlur` en el campo `documentNumber`
- Pre-llenar campos del formulario con datos de candidatura previa
- Mostrar alertas visuales tipo banner dentro del modal:
  - **Rojo** si tuvo proceso disciplinario: "Esta persona tuvo X proceso(s) disciplinario(s) como empleado"
  - **Amarillo** si estuvo vinculada: "Esta persona estuvo vinculada como empleado (activo/inactivo)"
  - **Azul** si participó en procesos anteriores: "Esta persona participó en X proceso(s) de selección previo(s)"

### Paso 4: Alertas en Detalle del Candidato (`CandidateDetailDialog.tsx`)

- Al abrir el detalle de un candidato, ejecutar automáticamente la verificación de antecedentes
- Mostrar un panel de alertas en la parte superior del diálogo con los hallazgos
- Cada alerta con icono, color y descripción clara

---

### Archivos a modificar/crear

| Archivo | Cambio |
|---------|--------|
| **Migración SQL** | Crear RPC `check_candidate_background` |
| `src/hooks/useCandidateBackground.ts` | Hook reutilizable para la verificación |
| `src/pages/RegistroPublico.tsx` | Auto-llenado por documento en auto-registro |
| `src/components/vacancies/CandidateFormDialog.tsx` | Auto-llenado + alertas en modal nuevo candidato |
| `src/components/selection/CandidateDetailDialog.tsx` | Panel de alertas de antecedentes |
| `src/components/selection/CandidateBackgroundAlerts.tsx` | Componente visual de alertas reutilizable |

