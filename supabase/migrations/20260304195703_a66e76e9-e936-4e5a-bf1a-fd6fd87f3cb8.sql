
-- Auto-create Administrador role for new companies
CREATE OR REPLACE FUNCTION public.insert_default_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  _role_id UUID;
BEGIN
  INSERT INTO public.custom_roles (company_id, name, description, is_system, is_active)
  VALUES (NEW.id, 'Administrador', 'Rol con acceso total al sistema. No se puede eliminar ni quitar permisos.', true, true)
  RETURNING id INTO _role_id;
  
  -- Assign all permissions to the admin role (though is_system=true bypasses checks)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT _role_id, p.id FROM public.permissions p;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_admin_role_for_company
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.insert_default_admin_role();
