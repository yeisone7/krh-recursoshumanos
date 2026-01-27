-- Create a user_status table to track active/inactive state
-- This is separate from auth.users to avoid modifying the auth schema
CREATE TABLE IF NOT EXISTS public.user_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz,
  deactivated_by uuid REFERENCES auth.users(id),
  deactivation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view user status"
  ON public.user_status
  FOR SELECT
  USING (public.is_admin_or_rrhh());

CREATE POLICY "Admins can insert user status"
  ON public.user_status
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user status"
  ON public.user_status
  FOR UPDATE
  USING (public.is_admin());

-- Create updated_at trigger
CREATE TRIGGER update_user_status_updated_at
  BEFORE UPDATE ON public.user_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to check if a user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.user_status WHERE user_id = _user_id),
    true -- Default to active if no record exists
  )
$$;