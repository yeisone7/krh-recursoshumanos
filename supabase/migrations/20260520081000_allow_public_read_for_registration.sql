-- Allow public read of company name and logo for registration form
DROP POLICY IF EXISTS "Public can view company name and logo for registration" ON public.companies;
CREATE POLICY "Public can view company name and logo for registration"
  ON public.companies FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public read of vacancy position title for registration form
DROP POLICY IF EXISTS "Public can view vacancy position title for registration" ON public.vacancies;
CREATE POLICY "Public can view vacancy position title for registration"
  ON public.vacancies FOR SELECT
  TO anon, authenticated
  USING (true);

-- Unify select policies for catalogs to allow both anon and authenticated users

-- catalog_eps
DROP POLICY IF EXISTS "Public can read active catalog items" ON public.catalog_eps;
CREATE POLICY "Public can read active catalog items"
  ON public.catalog_eps FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- catalog_afp
DROP POLICY IF EXISTS "Public can read active catalog items" ON public.catalog_afp;
CREATE POLICY "Public can read active catalog items"
  ON public.catalog_afp FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- catalog_arl
DROP POLICY IF EXISTS "Public can read active catalog items" ON public.catalog_arl;
CREATE POLICY "Public can read active catalog items"
  ON public.catalog_arl FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- catalog_ccf
DROP POLICY IF EXISTS "Public can read active catalog items" ON public.catalog_ccf;
CREATE POLICY "Public can read active catalog items"
  ON public.catalog_ccf FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- catalog_afc
DROP POLICY IF EXISTS "Public can read active catalog items" ON public.catalog_afc;
CREATE POLICY "Public can read active catalog items"
  ON public.catalog_afc FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- catalog_ips
DROP POLICY IF EXISTS "Public can read active catalog items" ON public.catalog_ips;
CREATE POLICY "Public can read active catalog items"
  ON public.catalog_ips FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- catalog_banks
DROP POLICY IF EXISTS "Public can read active catalog items" ON public.catalog_banks;
CREATE POLICY "Public can read active catalog items"
  ON public.catalog_banks FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
