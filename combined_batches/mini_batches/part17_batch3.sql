DO $$
DECLARE
  emp_id UUID;
BEGIN

  -- Empleado: 1014286328 (Manuel Soto)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1014286328', 'Manuel', 'Alexander', 'Soto', 'Ariza', '1997-03-01', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1014286328')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e371ac6e-8e1f-473a-a5ce-9782dfa981eb', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Asistente De Sst', '2026-03-13', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 2866881, '2026-03-13');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '11500003200', 'ahorros', true);
  END IF;

  -- Empleado: 1193089937 (Laura Fuentes)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1193089937', 'Laura', 'Liliana', 'Fuentes', 'Bossa', '2001-10-06', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1193089937')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fe6f8e2d-725e-45e7-9527-427421929058', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Mesera', '2026-03-16', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 2512620, '2026-03-16');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Salud Total Eps S.A.', 'Porvenir', 'Cofrem Meta', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '91299461527', 'ahorros', true);
  END IF;

  -- Empleado: 1096204317 (Kevinton Sanchez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1096204317', 'Kevinton', 'Miguel', 'Sanchez', 'Uribe', '1990-03-18', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1096204317')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '148e2e4c-cc2e-4d60-851e-e13b25c409b3', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Conductor Lonchero', '2026-03-16', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-16');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Salud Total Eps S.A.', 'Porvenir', 'Caja De Comp. Familiar De Barrancabermeja Cafaba', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '30600027980', 'ahorros', true);
  END IF;

  -- Empleado: 5081791 (Yelibeth Arias)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'PPT', '5081791', 'Yelibeth', 'Carolina', 'Arias', 'Basora', '1992-09-13', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '5081791')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '0de35144-c08c-4161-9058-4860e2402a7d', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Servicios Generales', '2026-03-16', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-16');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Cofrem Meta', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '28900004758', 'ahorros', true);
  END IF;

  -- Empleado: 1102042212 (Zaray Ayala)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1102042212', 'Zaray', 'Julitza', 'Ayala', 'Bonilla', '2006-10-10', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1102042212')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'ed126c70-b373-44b0-80a3-2a72e1fb0a58', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo', '2026-03-16', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 3776220, '2026-03-16');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '64007473', 'ahorros', true);
  END IF;

  -- Empleado: 1105305172 (Ana Cardenas)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1105305172', 'Ana', 'Maria', 'Cardenas', 'Lara', '1990-05-21', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1105305172')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '423108da-c727-4130-871b-ecec115ce237', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo', '2026-03-17', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 3776220, '2026-03-17');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', NULL, 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Banco Caja Social Bcsc Sa', '24153750407', 'ahorros', true);
  END IF;

  -- Empleado: 1097780731 (Karol Celis)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1097780731', 'Karol', 'Juliana', 'Celis', 'Gomez', '2004-05-17', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1097780731')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '868a7d45-7f42-4d8a-85da-98b9122e2ec0', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Mesera-Auxiliar De Servicios Generales', '2026-03-18', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-18');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sanitas', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '79554195071', 'ahorros', true);
  END IF;

  -- Empleado: 43181279 (Catalina Urrego)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '43181279', 'Catalina', '', 'Urrego', 'Bustamante', '1982-07-06', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '43181279')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'ec3737a6-0d59-4568-aad0-adb743dd047e', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2026-03-18', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-18');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Caja De Comp. Familiar Comfanorte', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Pendienta Banco', '1234', 'ahorros', true);
  END IF;

  -- Empleado: 1000122396 (Luisa Gonzalez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1000122396', 'Luisa', 'Fernanda', 'Gonzalez', 'Ricardo', '2001-05-18', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1000122396')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fe6f8e2d-725e-45e7-9527-427421929058', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Mesera', '2026-03-20', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 2512620, '2026-03-20');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Famisanar', 'Porvenir', 'Cofrem Meta', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Banco De Bogota', '804302503', 'ahorros', true);
  END IF;

  -- Empleado: 1007110696 (Yeny Correa)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1007110696', 'Yeny', 'Paola', 'Correa', 'Vargas', '1998-10-22', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1007110696')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e371ac6e-8e1f-473a-a5ce-9782dfa981eb', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar General', '2026-03-20', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'obra_labor', 1750905, '2026-03-20');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Savia Salud Eps', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '27984252558', 'ahorros', true);
  END IF;

END $$;
