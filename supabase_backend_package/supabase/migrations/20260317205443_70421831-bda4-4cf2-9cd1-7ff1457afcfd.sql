
ALTER TABLE public.personnel_requisitions
  ADD COLUMN turno_trabajo_id uuid REFERENCES public.shifts(id) DEFAULT NULL,
  ADD COLUMN incluye_alimentacion boolean DEFAULT false,
  ADD COLUMN incluye_desplazamiento boolean DEFAULT false,
  ADD COLUMN trayecto_desplazamiento text DEFAULT NULL;
