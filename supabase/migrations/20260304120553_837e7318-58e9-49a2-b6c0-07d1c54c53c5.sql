
-- 1. Exam Catalog table (equivalent to dotation_item_types)
CREATE TABLE public.exam_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.exam_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam catalog for their company"
  ON public.exam_catalog FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can manage exam catalog"
  ON public.exam_catalog FOR ALL TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE TRIGGER update_exam_catalog_updated_at
  BEFORE UPDATE ON public.exam_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Exam Profesiograma table
CREATE TABLE public.exam_profesiograma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id UUID NOT NULL REFERENCES public.operation_centers(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, operation_center_id, position_id)
);

ALTER TABLE public.exam_profesiograma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam profesiograma for their company"
  ON public.exam_profesiograma FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can manage exam profesiograma"
  ON public.exam_profesiograma FOR ALL TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE TRIGGER update_exam_profesiograma_updated_at
  BEFORE UPDATE ON public.exam_profesiograma
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Exam Profesiograma Items table
CREATE TABLE public.exam_profesiograma_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesiograma_id UUID NOT NULL REFERENCES public.exam_profesiograma(id) ON DELETE CASCADE,
  exam_catalog_id UUID NOT NULL REFERENCES public.exam_catalog(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profesiograma_id, exam_catalog_id)
);

ALTER TABLE public.exam_profesiograma_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam profesiograma items"
  ON public.exam_profesiograma_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exam_profesiograma ep
    WHERE ep.id = profesiograma_id AND public.is_company_member(ep.company_id)
  ));

CREATE POLICY "Admin/RRHH can manage exam profesiograma items"
  ON public.exam_profesiograma_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exam_profesiograma ep
    WHERE ep.id = profesiograma_id AND public.is_company_member(ep.company_id) AND public.is_admin_or_rrhh()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exam_profesiograma ep
    WHERE ep.id = profesiograma_id AND public.is_company_member(ep.company_id) AND public.is_admin_or_rrhh()
  ));

-- 4. Exam Delivery Transactions table (header)
CREATE TABLE public.exam_delivery_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exam_type TEXT NOT NULL DEFAULT 'periodico',
  provider TEXT,
  doctor_name TEXT,
  signature_url TEXT,
  document_url TEXT,
  observations TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_delivery_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam transactions"
  ON public.exam_delivery_transactions FOR SELECT TO authenticated
  USING (public.has_employee_v2_access(employee_id));

CREATE POLICY "Admin/RRHH can manage exam transactions"
  ON public.exam_delivery_transactions FOR ALL TO authenticated
  USING (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh())
  WITH CHECK (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());

CREATE TRIGGER update_exam_delivery_transactions_updated_at
  BEFORE UPDATE ON public.exam_delivery_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Exam Delivery Items table (detail)
CREATE TABLE public.exam_delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.exam_delivery_transactions(id) ON DELETE CASCADE,
  exam_catalog_id UUID REFERENCES public.exam_catalog(id),
  exam_name TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'pendiente',
  concept TEXT,
  restrictions TEXT,
  expiration_date DATE,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_delivery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam delivery items"
  ON public.exam_delivery_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exam_delivery_transactions edt
    WHERE edt.id = transaction_id AND public.has_employee_v2_access(edt.employee_id)
  ));

CREATE POLICY "Admin/RRHH can manage exam delivery items"
  ON public.exam_delivery_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exam_delivery_transactions edt
    WHERE edt.id = transaction_id AND public.has_employee_v2_access(edt.employee_id) AND public.is_admin_or_rrhh()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exam_delivery_transactions edt
    WHERE edt.id = transaction_id AND public.has_employee_v2_access(edt.employee_id) AND public.is_admin_or_rrhh()
  ));

-- 6. RPC function for exam profesiogramas with items
CREATE OR REPLACE FUNCTION public.get_exam_profesiogramas_with_items(_company_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(json_agg(prof_row ORDER BY prof_row.created_at DESC), '[]'::json)
  FROM (
    SELECT 
      p.id,
      p.company_id,
      p.operation_center_id,
      p.position_id,
      p.created_at,
      p.updated_at,
      json_build_object('id', oc.id, 'name', oc.name) AS operation_centers,
      json_build_object('id', pos.id, 'name', pos.name) AS positions,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', pi.id,
          'profesiograma_id', pi.profesiograma_id,
          'exam_catalog_id', pi.exam_catalog_id,
          'notes', pi.notes,
          'is_required', pi.is_required,
          'exam_catalog', json_build_object(
            'id', ec.id,
            'name', ec.name,
            'code', ec.code,
            'description', ec.description
          )
        ))
        FROM exam_profesiograma_items pi
        JOIN exam_catalog ec ON ec.id = pi.exam_catalog_id
        WHERE pi.profesiograma_id = p.id),
        '[]'::json
      ) AS items
    FROM exam_profesiograma p
    LEFT JOIN operation_centers oc ON oc.id = p.operation_center_id
    LEFT JOIN positions pos ON pos.id = p.position_id
    WHERE p.company_id = _company_id
  ) prof_row
$$;
