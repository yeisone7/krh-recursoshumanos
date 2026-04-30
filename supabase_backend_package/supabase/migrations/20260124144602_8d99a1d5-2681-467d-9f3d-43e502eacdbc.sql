-- Create audit_logs table for tracking all critical actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  company_id UUID REFERENCES public.companies(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins and auditors can view all logs for their company
CREATE POLICY "Admins and auditors can view company logs"
ON public.audit_logs
FOR SELECT
USING (
  (is_admin() OR is_auditor()) 
  AND (company_id IS NULL OR is_company_member(company_id))
);

-- Users can insert their own logs (needed for client-side logging)
CREATE POLICY "Users can insert their own logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Registro de auditoría para todas las acciones críticas del sistema';