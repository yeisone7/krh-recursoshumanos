ALTER TABLE public.training_access_tokens 
ADD COLUMN operation_center_id UUID REFERENCES public.operation_centers(id) DEFAULT NULL;