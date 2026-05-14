DO $$
DECLARE
  emp_id UUID;
BEGIN

  -- Empleado: 1075258170 (Yesica Pascuas)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1075258170', 'Yesica', 'Maria', 'Pascuas', 'Sanchez', '1991-11-10', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1075258170')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2025-11-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750444, '2025-11-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '45594456380', 'ahorros', true);
  END IF;

  -- Empleado: 1075255547 (Luz Salas)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1075255547', 'Luz', 'Marina', 'Salas', 'Gutierrez', '1991-08-06', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1075255547')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2025-11-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2025-11-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '45494402975', 'ahorros', true);
  END IF;

  -- Empleado: 1075540474 (Angelica Ramirez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1075540474', 'Angelica', '', 'Ramirez', 'Losada', '1989-08-14', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1075540474')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2025-11-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750444, '2025-11-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '45584450723', 'ahorros', true);
  END IF;

  -- Empleado: 1082216121 (Marily Trujillo)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1082216121', 'Marily', '', 'Trujillo', 'Bautista', '1995-01-19', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1082216121')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2025-11-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750444, '2025-11-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '125022010', 'ahorros', true);
  END IF;

  -- Empleado: 1015998868 (Andrea Rico)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1015998868', 'Andrea', '', 'Rico', 'Bernal', '1986-06-10', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1015998868')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2025-11-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750444, '2025-11-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '45994318415', 'ahorros', true);
  END IF;

  -- Empleado: 1075255457 (Carlos Horta)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1075255457', 'Carlos', 'Andres', 'Horta', '', '1991-08-08', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1075255457')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Conductor Lonchero', '2025-11-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750444, '2025-11-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sanitas', 'Porvenir', 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '45547596904', 'ahorros', true);
  END IF;

  -- Empleado: 55217296 (Maria Garzon)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '55217296', 'Maria', 'Aleida', 'Garzon', 'Garzon', '1985-11-06', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '55217296')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2025-11-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750444, '2025-11-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', NULL, 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '45594253969', 'ahorros', true);
  END IF;

  -- Empleado: 26425248 (Rosalia Cabrera)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '26425248', 'Rosalia', '', 'Cabrera', 'Cabrera', '1977-05-05', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '26425248')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2025-11-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750444, '2025-11-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '7631040670', 'ahorros', true);
  END IF;

  -- Empleado: 1003803338 (Eliana Canacue)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1003803338', 'Eliana', '', 'Canacue', 'Murcia', '1995-04-22', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1003803338')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2025-11-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750444, '2025-11-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '1234', 'ahorros', true);
  END IF;

  -- Empleado: 1075288330 (Martha Cerquera)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1075288330', 'Martha', 'Lucia', 'Cerquera', 'Quintero', '1995-05-17', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1075288330')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2025-12-01', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750444, '2025-12-01');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '650568835', 'ahorros', true);
  END IF;
END $$;
