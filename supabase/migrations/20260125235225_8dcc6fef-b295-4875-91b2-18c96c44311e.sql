
-- =============================================
-- MÓDULO DE HORARIOS Y TURNOS - KRH
-- =============================================

-- Enum para modalidad de tiempo del empleado
CREATE TYPE public.employee_time_mode AS ENUM ('administrative', 'shift');

-- Enum para origen de asignación de turno
CREATE TYPE public.shift_assignment_source AS ENUM ('cycle', 'manual');

-- =============================================
-- 1. WORK_SCHEDULES (Horarios Administrativos)
-- =============================================
CREATE TABLE public.work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Dom, 1=Lun, ..., 6=Sab
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- 2. SHIFTS (Turnos Operativos)
-- =============================================
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  crosses_midnight BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3B82F6', -- Para visualización en calendario
  is_rest_day BOOLEAN DEFAULT false, -- Para días de descanso en ciclos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- 3. SHIFT_CYCLES (Ciclos de Rotación)
-- =============================================
CREATE TABLE public.shift_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  total_days INTEGER NOT NULL, -- Total de días en el ciclo
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- 4. SHIFT_CYCLE_DAYS (Días del Ciclo)
-- =============================================
CREATE TABLE public.shift_cycle_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_cycle_id UUID NOT NULL REFERENCES public.shift_cycles(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL, -- 1, 2, 3, ... hasta total_days
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shift_cycle_id, day_number)
);

-- =============================================
-- 5. EMPLOYEE_TIME_CONFIG (Config por Empleado)
-- =============================================
CREATE TABLE public.employee_time_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  mode public.employee_time_mode NOT NULL,
  work_schedule_id UUID REFERENCES public.work_schedules(id) ON DELETE SET NULL,
  shift_cycle_id UUID REFERENCES public.shift_cycles(id) ON DELETE SET NULL,
  cycle_start_date DATE, -- Fecha de inicio del ciclo para calcular posición
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Validación: solo un modo activo por empleado
  CONSTRAINT valid_mode_config CHECK (
    (mode = 'administrative' AND work_schedule_id IS NOT NULL AND shift_cycle_id IS NULL) OR
    (mode = 'shift' AND shift_cycle_id IS NOT NULL AND work_schedule_id IS NULL)
  )
);

-- Índice para garantizar solo un registro activo por empleado
CREATE UNIQUE INDEX idx_employee_time_config_active 
ON public.employee_time_config(employee_id) 
WHERE is_active = true;

-- =============================================
-- 6. EMPLOYEE_SHIFT_ASSIGNMENTS (Asignaciones Diarias)
-- =============================================
CREATE TABLE public.employee_shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  assignment_date DATE NOT NULL,
  source public.shift_assignment_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Un empleado solo puede tener un turno por día
  UNIQUE(employee_id, assignment_date)
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX idx_work_schedules_company ON public.work_schedules(company_id);
CREATE INDEX idx_shifts_company ON public.shifts(company_id);
CREATE INDEX idx_shift_cycles_company ON public.shift_cycles(company_id);
CREATE INDEX idx_employee_time_config_employee ON public.employee_time_config(employee_id);
CREATE INDEX idx_employee_shift_assignments_employee_date ON public.employee_shift_assignments(employee_id, assignment_date);
CREATE INDEX idx_employee_shift_assignments_date ON public.employee_shift_assignments(assignment_date);

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================
CREATE TRIGGER update_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_cycles_updated_at
  BEFORE UPDATE ON public.shift_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_time_config_updated_at
  BEFORE UPDATE ON public.employee_time_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_shift_assignments_updated_at
  BEFORE UPDATE ON public.employee_shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_cycle_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_time_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_shift_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas para work_schedules
CREATE POLICY "work_schedules_select" ON public.work_schedules
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "work_schedules_insert" ON public.work_schedules
  FOR INSERT WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "work_schedules_update" ON public.work_schedules
  FOR UPDATE USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "work_schedules_delete" ON public.work_schedules
  FOR DELETE USING (public.is_company_member(company_id) AND public.is_admin());

-- Políticas para shifts
CREATE POLICY "shifts_select" ON public.shifts
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "shifts_insert" ON public.shifts
  FOR INSERT WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "shifts_update" ON public.shifts
  FOR UPDATE USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "shifts_delete" ON public.shifts
  FOR DELETE USING (public.is_company_member(company_id) AND public.is_admin());

-- Políticas para shift_cycles
CREATE POLICY "shift_cycles_select" ON public.shift_cycles
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "shift_cycles_insert" ON public.shift_cycles
  FOR INSERT WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "shift_cycles_update" ON public.shift_cycles
  FOR UPDATE USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "shift_cycles_delete" ON public.shift_cycles
  FOR DELETE USING (public.is_company_member(company_id) AND public.is_admin());

-- Políticas para shift_cycle_days (heredan del ciclo padre)
CREATE POLICY "shift_cycle_days_select" ON public.shift_cycle_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shift_cycles sc 
      WHERE sc.id = shift_cycle_id AND public.is_company_member(sc.company_id)
    )
  );

CREATE POLICY "shift_cycle_days_insert" ON public.shift_cycle_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shift_cycles sc 
      WHERE sc.id = shift_cycle_id AND public.is_company_member(sc.company_id) AND public.is_admin_or_rrhh()
    )
  );

CREATE POLICY "shift_cycle_days_update" ON public.shift_cycle_days
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shift_cycles sc 
      WHERE sc.id = shift_cycle_id AND public.is_company_member(sc.company_id) AND public.is_admin_or_rrhh()
    )
  );

CREATE POLICY "shift_cycle_days_delete" ON public.shift_cycle_days
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.shift_cycles sc 
      WHERE sc.id = shift_cycle_id AND public.is_company_member(sc.company_id) AND public.is_admin()
    )
  );

-- Políticas para employee_time_config
CREATE POLICY "employee_time_config_select" ON public.employee_time_config
  FOR SELECT USING (public.has_employee_v2_access(employee_id));

CREATE POLICY "employee_time_config_insert" ON public.employee_time_config
  FOR INSERT WITH CHECK (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());

CREATE POLICY "employee_time_config_update" ON public.employee_time_config
  FOR UPDATE USING (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());

CREATE POLICY "employee_time_config_delete" ON public.employee_time_config
  FOR DELETE USING (public.has_employee_v2_access(employee_id) AND public.is_admin());

-- Políticas para employee_shift_assignments
CREATE POLICY "employee_shift_assignments_select" ON public.employee_shift_assignments
  FOR SELECT USING (public.has_employee_v2_access(employee_id));

CREATE POLICY "employee_shift_assignments_insert" ON public.employee_shift_assignments
  FOR INSERT WITH CHECK (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());

CREATE POLICY "employee_shift_assignments_update" ON public.employee_shift_assignments
  FOR UPDATE USING (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());

CREATE POLICY "employee_shift_assignments_delete" ON public.employee_shift_assignments
  FOR DELETE USING (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());
