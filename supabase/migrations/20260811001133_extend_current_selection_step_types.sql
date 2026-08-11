-- Keep the database enum aligned with the nine-stage selection flow used by the application.
ALTER TYPE public.selection_step_type ADD VALUE IF NOT EXISTS 'prefiltro';
ALTER TYPE public.selection_step_type ADD VALUE IF NOT EXISTS 'entrevista_seleccion';
ALTER TYPE public.selection_step_type ADD VALUE IF NOT EXISTS 'entrevista_jefe';
ALTER TYPE public.selection_step_type ADD VALUE IF NOT EXISTS 'validacion_antecedentes';
ALTER TYPE public.selection_step_type ADD VALUE IF NOT EXISTS 'pruebas_psicotecnicas';
ALTER TYPE public.selection_step_type ADD VALUE IF NOT EXISTS 'pruebas_conocimiento';
ALTER TYPE public.selection_step_type ADD VALUE IF NOT EXISTS 'validacion_academica';
ALTER TYPE public.selection_step_type ADD VALUE IF NOT EXISTS 'validacion_referencias';
ALTER TYPE public.selection_step_type ADD VALUE IF NOT EXISTS 'examenes_medicos';
