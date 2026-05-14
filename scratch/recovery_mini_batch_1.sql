DO $$ DECLARE emp_id UUID; BEGIN
INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '13722650', 'Carlos', 'Giovanny', 'Alvarez', 'Gomez', '1979-11-02', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '13722650')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a4b679c5-6fd4-4449-9ff6-af9addcd4b43', 'ef9540a2-0945-4b0c-a66b-da40a54fc69c', NULL, 'Líder Sgi', '2005-02-04', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 7400000, '2005-02-04');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sura', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Banco Caja Social Bcsc Sa', '24061356627', 'ahorros', true);
  END IF;

  -- Empleado: 19472472 (Jaime Castellanos)
  emp_id := NULL;


emp_id := NULL;
INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '19472472', 'Jaime', 'Aldo', 'Castellanos', 'Rodriguez', '1961-07-02', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '19472472')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fe6f8e2d-725e-45e7-9527-427421929058', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Chef', '2020-12-03', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'indefinido', 3001830, '2020-12-03');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sanitas', 'Fondo Nacional Del Ahorro (Fna)', 'Cofrem Meta', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '202100186', 'ahorros', true);
  END IF;

  -- Empleado: 27600662 (Sofia Gomez)
  emp_id := NULL;


emp_id := NULL;
INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '27600662', 'Sofia', '', 'Gomez', 'Carmen', '1966-11-08', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '27600662')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'f0e66122-d89d-4717-be05-abcdf35032b4', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2025-07-16', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1479390, '2025-07-16');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Protección', 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '842001144', 'ahorros', true);
  END IF;

  -- Empleado: 91497054 (Johan Guerrero)
  emp_id := NULL;


emp_id := NULL;
INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '91497054', 'Johan', 'Antonio', 'Guerrero', 'Rodriguez', '1977-05-28', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '91497054')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '7aab8f17-febd-46df-bb42-2e3a39fc012d', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Supervisor De Campo', '2022-03-01', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 3615000, '2022-03-01');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Cajasan', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '515333', 'ahorros', true);
  END IF;

  -- Empleado: 28218054 (Lucy Rios)
  emp_id := NULL;


emp_id := NULL;
INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '28218054', 'Lucy', '', 'Rios', 'Saavedra', '1976-03-14', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '28218054')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'd3f08ee4-36bc-4dea-88b6-d6c9ae3ca6b8', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2018-06-04', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'indefinido', 1423500, '2018-06-04');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Protección', 'Cajasan', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '88494820883', 'ahorros', true);
  END IF;

  -- Empleado: 28313475 (Juana Bello)
  emp_id := NULL;


END $$;