-- =====================================================
-- MÓDULO DE PROCESOS DISCIPLINARIOS
-- =====================================================

-- Enum para tipos de falta
CREATE TYPE public.fault_type AS ENUM ('leve', 'grave', 'gravisima');

-- Enum para estados del proceso disciplinario
CREATE TYPE public.disciplinary_status AS ENUM (
  'apertura',           -- Inicio del proceso
  'investigacion',      -- En investigación
  'citacion_descargos', -- Citación a descargos
  'descargos',          -- Esperando descargos del empleado
  'analisis',           -- Análisis de pruebas y descargos
  'decision',           -- Decisión tomada
  'apelacion',          -- En apelación
  'cerrado'             -- Proceso finalizado
);

-- Enum para tipos de sanción
CREATE TYPE public.sanction_type AS ENUM (
  'amonestacion_verbal',
  'amonestacion_escrita',
  'suspension_1_3_dias',
  'suspension_4_8_dias',
  'terminacion_justa_causa',
  'sin_sancion'
);

-- =====================================================
-- TABLA PRINCIPAL: PROCESOS DISCIPLINARIOS
-- =====================================================
CREATE TABLE public.disciplinary_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  
  -- Información del caso
  case_number TEXT NOT NULL,
  status disciplinary_status NOT NULL DEFAULT 'apertura',
  fault_type fault_type NOT NULL,
  fault_date DATE NOT NULL,
  
  -- Descripción de los hechos
  facts_description TEXT NOT NULL,
  article_violated TEXT, -- Artículos del reglamento interno
  witnesses TEXT, -- Nombres de testigos si aplica
  
  -- Fechas del proceso
  opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notification_date DATE, -- Fecha de notificación al empleado
  hearing_date TIMESTAMP WITH TIME ZONE, -- Fecha de audiencia de descargos
  decision_date DATE, -- Fecha de decisión
  closing_date DATE, -- Fecha de cierre
  
  -- Resultado
  sanction_type sanction_type,
  sanction_days INTEGER DEFAULT 0, -- Días de suspensión si aplica
  sanction_start_date DATE,
  sanction_end_date DATE,
  decision_summary TEXT,
  
  -- Apelación
  has_appeal BOOLEAN DEFAULT FALSE,
  appeal_date DATE,
  appeal_resolution TEXT,
  appeal_decision_date DATE,
  
  -- Responsables
  investigator_name TEXT,
  investigator_id UUID,
  decision_maker_name TEXT,
  decision_maker_id UUID,
  
  -- Documentos
  opening_document_url TEXT,
  notification_document_url TEXT,
  hearing_document_url TEXT,
  decision_document_url TEXT,
  appeal_document_url TEXT,
  
  -- Control
  observations TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLA: EVIDENCIAS DEL PROCESO
-- =====================================================
CREATE TABLE public.disciplinary_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.disciplinary_processes(id) ON DELETE CASCADE,
  
  evidence_type TEXT NOT NULL, -- documento, testimonio, video, foto, otro
  description TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  
  collected_date DATE NOT NULL DEFAULT CURRENT_DATE,
  collected_by TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLA: HISTORIAL DE ESTADOS/ACCIONES
-- =====================================================
CREATE TABLE public.disciplinary_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.disciplinary_processes(id) ON DELETE CASCADE,
  
  action_type TEXT NOT NULL, -- apertura, citacion, audiencia, decision, etc.
  action_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_status disciplinary_status,
  new_status disciplinary_status,
  
  description TEXT NOT NULL,
  performed_by UUID,
  performed_by_name TEXT,
  document_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLA: DESCARGOS DEL EMPLEADO
-- =====================================================
CREATE TABLE public.disciplinary_defenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.disciplinary_processes(id) ON DELETE CASCADE,
  
  defense_date DATE NOT NULL,
  defense_type TEXT NOT NULL, -- escrito, oral
  content TEXT NOT NULL, -- Contenido de los descargos
  
  received_by TEXT,
  received_by_id UUID,
  document_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_disciplinary_processes_company ON public.disciplinary_processes(company_id);
CREATE INDEX idx_disciplinary_processes_employee ON public.disciplinary_processes(employee_id);
CREATE INDEX idx_disciplinary_processes_status ON public.disciplinary_processes(status);
CREATE INDEX idx_disciplinary_processes_case_number ON public.disciplinary_processes(case_number);
CREATE INDEX idx_disciplinary_evidence_process ON public.disciplinary_evidence(process_id);
CREATE INDEX idx_disciplinary_timeline_process ON public.disciplinary_timeline(process_id);
CREATE INDEX idx_disciplinary_defenses_process ON public.disciplinary_defenses(process_id);

-- =====================================================
-- TRIGGERS DE UPDATED_AT
-- =====================================================
CREATE TRIGGER update_disciplinary_processes_updated_at
  BEFORE UPDATE ON public.disciplinary_processes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disciplinary_evidence_updated_at
  BEFORE UPDATE ON public.disciplinary_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disciplinary_defenses_updated_at
  BEFORE UPDATE ON public.disciplinary_defenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.disciplinary_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_defenses ENABLE ROW LEVEL SECURITY;

-- Políticas para disciplinary_processes
CREATE POLICY "Admin and RRHH can manage disciplinary processes"
  ON public.disciplinary_processes FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company disciplinary processes"
  ON public.disciplinary_processes FOR SELECT
  USING (is_company_member(company_id) OR is_admin());

-- Políticas para disciplinary_evidence
CREATE POLICY "Admin and RRHH can manage disciplinary evidence"
  ON public.disciplinary_evidence FOR ALL
  USING (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_evidence.process_id
      AND is_company_member(dp.company_id)
    )
  )
  WITH CHECK (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_evidence.process_id
      AND is_company_member(dp.company_id)
    )
  );

CREATE POLICY "Users can view disciplinary evidence"
  ON public.disciplinary_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_evidence.process_id
      AND (is_company_member(dp.company_id) OR is_admin())
    )
  );

-- Políticas para disciplinary_timeline
CREATE POLICY "Admin and RRHH can manage disciplinary timeline"
  ON public.disciplinary_timeline FOR ALL
  USING (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_timeline.process_id
      AND is_company_member(dp.company_id)
    )
  )
  WITH CHECK (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_timeline.process_id
      AND is_company_member(dp.company_id)
    )
  );

CREATE POLICY "Users can view disciplinary timeline"
  ON public.disciplinary_timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_timeline.process_id
      AND (is_company_member(dp.company_id) OR is_admin())
    )
  );

-- Políticas para disciplinary_defenses
CREATE POLICY "Admin and RRHH can manage disciplinary defenses"
  ON public.disciplinary_defenses FOR ALL
  USING (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_defenses.process_id
      AND is_company_member(dp.company_id)
    )
  )
  WITH CHECK (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_defenses.process_id
      AND is_company_member(dp.company_id)
    )
  );

CREATE POLICY "Users can view disciplinary defenses"
  ON public.disciplinary_defenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_defenses.process_id
      AND (is_company_member(dp.company_id) OR is_admin())
    )
  );