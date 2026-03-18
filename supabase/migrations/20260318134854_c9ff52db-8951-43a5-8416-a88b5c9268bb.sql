ALTER TABLE public.personnel_requisitions 
  ADD COLUMN autoriza TEXT CHECK (autoriza IN ('gerencia_administrativa', 'gerencia_operaciones'));