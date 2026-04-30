-- Create table for ARL (Administradoras de Riesgos Laborales)
CREATE TABLE public.catalog_arl (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Create table for EPS (Entidades Promotoras de Salud)
CREATE TABLE public.catalog_eps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Create table for AFP (Administradoras de Fondos de Pensiones)
CREATE TABLE public.catalog_afp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Create table for CCF (Cajas de Compensación Familiar)
CREATE TABLE public.catalog_ccf (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Create table for AFC (Cuentas de Ahorro para el Fomento de la Construcción)
CREATE TABLE public.catalog_afc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Create table for IPS (Instituciones Prestadoras de Servicios de Salud)
CREATE TABLE public.catalog_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  address VARCHAR(255),
  city VARCHAR(100),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Enable RLS on all tables
ALTER TABLE public.catalog_arl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_eps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_afp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_ccf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_afc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_ips ENABLE ROW LEVEL SECURITY;

-- RLS policies for catalog_arl
CREATE POLICY "Users can view ARL from their companies" ON public.catalog_arl
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert ARL" ON public.catalog_arl
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update ARL" ON public.catalog_arl
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete ARL" ON public.catalog_arl
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- RLS policies for catalog_eps
CREATE POLICY "Users can view EPS from their companies" ON public.catalog_eps
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert EPS" ON public.catalog_eps
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update EPS" ON public.catalog_eps
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete EPS" ON public.catalog_eps
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- RLS policies for catalog_afp
CREATE POLICY "Users can view AFP from their companies" ON public.catalog_afp
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert AFP" ON public.catalog_afp
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update AFP" ON public.catalog_afp
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete AFP" ON public.catalog_afp
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- RLS policies for catalog_ccf
CREATE POLICY "Users can view CCF from their companies" ON public.catalog_ccf
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert CCF" ON public.catalog_ccf
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update CCF" ON public.catalog_ccf
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete CCF" ON public.catalog_ccf
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- RLS policies for catalog_afc
CREATE POLICY "Users can view AFC from their companies" ON public.catalog_afc
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert AFC" ON public.catalog_afc
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update AFC" ON public.catalog_afc
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete AFC" ON public.catalog_afc
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- RLS policies for catalog_ips
CREATE POLICY "Users can view IPS from their companies" ON public.catalog_ips
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert IPS" ON public.catalog_ips
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update IPS" ON public.catalog_ips
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete IPS" ON public.catalog_ips
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- Create triggers for updated_at
CREATE TRIGGER update_catalog_arl_updated_at BEFORE UPDATE ON public.catalog_arl
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_eps_updated_at BEFORE UPDATE ON public.catalog_eps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_afp_updated_at BEFORE UPDATE ON public.catalog_afp
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_ccf_updated_at BEFORE UPDATE ON public.catalog_ccf
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_afc_updated_at BEFORE UPDATE ON public.catalog_afc
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_ips_updated_at BEFORE UPDATE ON public.catalog_ips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();