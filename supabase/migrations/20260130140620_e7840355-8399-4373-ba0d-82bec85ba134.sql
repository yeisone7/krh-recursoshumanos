-- Enum para día de descanso obligatorio
CREATE TYPE public.day_of_week AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');

-- Enum para motivo de solicitud
CREATE TYPE public.requisition_reason AS ENUM (
  'renuncia', 'vacaciones', 'incapacidad', 'rotacion', 
  'movimiento_interno', 'nuevo_cargo', 'nuevo_puesto', 
  'terminacion_contrato', 'calamidad', 'licencia'
);

-- Enum para tipo de convocatoria
CREATE TYPE public.recruitment_type AS ENUM ('externa', 'interna', 'mixta');

-- Enum para estado de requisición
CREATE TYPE public.requisition_status AS ENUM (
  'borrador', 'enviada', 'en_operaciones', 'en_rrhh', 
  'en_juridico', 'en_seleccion', 'en_gerencia', 
  'aprobada', 'rechazada', 'cerrada'
);

-- Tabla principal de requisiciones de personal
CREATE TABLE public.personnel_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Datos generales
  fecha_requisicion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_ingreso_estimada DATE,
  cantidad_vacantes_requeridas INTEGER NOT NULL DEFAULT 1,
  cargo_solicitado TEXT NOT NULL,
  area_id UUID REFERENCES public.areas(id),
  operation_center_id UUID REFERENCES public.operation_centers(id),
  cargo_a_reemplazar TEXT,
  persona_a_reemplazar TEXT,
  requiere_herramienta_trabajo BOOLEAN DEFAULT false,
  horario_trabajo TEXT,
  dia_descanso_obligatorio public.day_of_week,
  
  -- Motivo de la solicitud
  motivo_solicitud public.requisition_reason NOT NULL,
  observaciones_motivo_solicitud TEXT,
  
  -- Información del solicitante
  solicitante_id UUID REFERENCES auth.users(id),
  solicitante_nombre TEXT NOT NULL,
  cargo_solicitante TEXT,
  
  -- Aprobaciones Operaciones
  operaciones_aprobado BOOLEAN,
  operaciones_aprobado_salario BOOLEAN,
  operaciones_quien_aprobo TEXT,
  operaciones_aprobador_id UUID REFERENCES auth.users(id),
  operaciones_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  operaciones_observaciones TEXT,
  
  -- Aprobaciones RRHH
  rrhh_asignacion_salarial NUMERIC(12,2),
  rrhh_condiciones_adicionales TEXT,
  rrhh_fuente_asignacion_salarial TEXT,
  rrhh_nivel_politica_salarial TEXT,
  rrhh_tipo_convocatoria public.recruitment_type,
  rrhh_observaciones TEXT,
  rrhh_aprobado BOOLEAN,
  rrhh_quien_aprobo TEXT,
  rrhh_aprobador_id UUID REFERENCES auth.users(id),
  rrhh_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  
  -- Aprobaciones Jurídico
  juridico_tipo_contrato TEXT,
  juridico_duracion TEXT,
  juridico_observaciones TEXT,
  juridico_aprobado BOOLEAN,
  juridico_quien_aprobo TEXT,
  juridico_aprobador_id UUID REFERENCES auth.users(id),
  juridico_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  
  -- Aprobaciones Selección
  seleccion_fecha_inicio_proceso DATE,
  seleccion_observaciones TEXT,
  seleccion_aprobado BOOLEAN,
  seleccion_quien_aprobo TEXT,
  seleccion_aprobador_id UUID REFERENCES auth.users(id),
  seleccion_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  
  -- Aprobaciones Gerencia
  gerencia_aprobado_salario BOOLEAN,
  gerencia_aprobado BOOLEAN,
  gerencia_observaciones TEXT,
  gerencia_quien_aprobo TEXT,
  gerencia_aprobador_id UUID REFERENCES auth.users(id),
  gerencia_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  
  -- Estado del proceso
  estado_requisicion public.requisition_status NOT NULL DEFAULT 'borrador',
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para códigos de vacantes externas
CREATE TABLE public.requisition_vacancy_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES public.personnel_requisitions(id) ON DELETE CASCADE,
  codigo_vacante_externa TEXT NOT NULL,
  entidad_origen TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar columna de referencia a requisición en vacantes
ALTER TABLE public.vacancies 
ADD COLUMN requisition_id UUID REFERENCES public.personnel_requisitions(id);

-- Índices para performance
CREATE INDEX idx_personnel_requisitions_company ON public.personnel_requisitions(company_id);
CREATE INDEX idx_personnel_requisitions_status ON public.personnel_requisitions(estado_requisicion);
CREATE INDEX idx_personnel_requisitions_area ON public.personnel_requisitions(area_id);
CREATE INDEX idx_requisition_vacancy_codes_requisition ON public.requisition_vacancy_codes(requisition_id);
CREATE INDEX idx_vacancies_requisition ON public.vacancies(requisition_id);

-- Trigger para updated_at
CREATE TRIGGER update_personnel_requisitions_updated_at
  BEFORE UPDATE ON public.personnel_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.personnel_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_vacancy_codes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para personnel_requisitions
CREATE POLICY "Users can view requisitions from their company"
  ON public.personnel_requisitions
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin and RRHH can insert requisitions"
  ON public.personnel_requisitions
  FOR INSERT
  WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin and RRHH can update requisitions"
  ON public.personnel_requisitions
  FOR UPDATE
  USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin can delete requisitions"
  ON public.personnel_requisitions
  FOR DELETE
  USING (public.is_admin() AND public.is_company_member(company_id));

-- Políticas RLS para requisition_vacancy_codes
CREATE POLICY "Users can view vacancy codes from their requisitions"
  ON public.requisition_vacancy_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.personnel_requisitions pr
      WHERE pr.id = requisition_id
      AND public.is_company_member(pr.company_id)
    )
  );

CREATE POLICY "Admin and RRHH can manage vacancy codes"
  ON public.requisition_vacancy_codes
  FOR ALL
  USING (
    public.is_admin_or_rrhh() AND
    EXISTS (
      SELECT 1 FROM public.personnel_requisitions pr
      WHERE pr.id = requisition_id
      AND public.is_company_member(pr.company_id)
    )
  );