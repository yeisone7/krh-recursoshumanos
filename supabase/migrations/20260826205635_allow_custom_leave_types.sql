-- Allow each company to define its own leave type keys instead of being
-- limited to the original PostgreSQL enum. The enum remains in place for
-- backwards compatibility with older stored functions and migrations.
ALTER TABLE public.leave_type_config
  ALTER COLUMN leave_type TYPE text USING leave_type::text;

ALTER TABLE public.leave_requests
  ALTER COLUMN leave_type TYPE text USING leave_type::text;

ALTER TABLE public.leave_balances
  ALTER COLUMN leave_type TYPE text USING leave_type::text;

ALTER TABLE public.leave_type_config
  ADD CONSTRAINT leave_type_config_key_format_check
  CHECK (leave_type ~ '^[a-z0-9_]{2,60}$');

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_leave_type_key_format_check
  CHECK (leave_type ~ '^[a-z0-9_]{2,60}$');

ALTER TABLE public.leave_balances
  ADD CONSTRAINT leave_balances_leave_type_key_format_check
  CHECK (leave_type ~ '^[a-z0-9_]{2,60}$');

-- These composite foreign keys make deletion race-safe. NOT VALID preserves
-- any legacy inconsistent data while enforcing the relationship for new rows
-- and preventing deletion of a type that already has history.
ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_company_leave_type_fkey
  FOREIGN KEY (company_id, leave_type)
  REFERENCES public.leave_type_config(company_id, leave_type)
  ON UPDATE CASCADE ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.leave_balances
  ADD CONSTRAINT leave_balances_company_leave_type_fkey
  FOREIGN KEY (company_id, leave_type)
  REFERENCES public.leave_type_config(company_id, leave_type)
  ON UPDATE CASCADE ON DELETE RESTRICT
  NOT VALID;

-- Replace the previous FOR ALL policy so each permission only authorizes its
-- corresponding mutation.
DROP POLICY IF EXISTS "Admin can manage leave type config" ON public.leave_type_config;

CREATE POLICY "Authorized users can create leave type config"
ON public.leave_type_config FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin()
      OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'create')
    )
  )
);

CREATE POLICY "Authorized users can update leave type config"
ON public.leave_type_config FOR UPDATE TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin()
      OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin()
      OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'update')
    )
  )
);

CREATE POLICY "Authorized users can delete leave type config"
ON public.leave_type_config FOR DELETE TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin()
      OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'delete')
    )
  )
);
