DO $$
DECLARE
  emp_id UUID;
BEGIN
  -- Empleado: 1098650428 (Jhayra Torres)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1098650428', 'Jhayra', 'Alejandra', 'Torres', 'Mendoza', '2006-03-12', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1098650428')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a4b679c5-6fd4-4449-9ff6-af9addcd4b43', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Aprendiz Sena Lectiva', '2026-02-18', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-02-18');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '91295507034', 'ahorros', true);
  END IF;

  -- Empleado: 1050549290 (Yomaris Pacheco)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1050549290', 'Yomaris', '', 'Pacheco', 'Sanchez', '1990-12-04', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1050549290')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '57e5be5e-f320-47d4-9013-3de14957a674', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2026-03-02', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-02');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Coosalud Eps-Cm', 'Porvenir', 'Comfenalco Cartagena', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '84010377', 'ahorros', true);
  END IF;

  -- Empleado: 1051636773 (Ingris Castro)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1051636773', 'Ingris', 'Paola', 'Castro', 'Munive', '1995-12-23', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1051636773')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '57e5be5e-f320-47d4-9013-3de14957a674', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2026-03-02', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-02');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Coosalud Eps-Cm', 'Porvenir', 'Comfenalco Cartagena', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '84010378', 'ahorros', true);
  END IF;

  -- Empleado: 1056772064 (Mabel Paramo)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1056772064', 'Mabel', 'Patricia', 'Paramo', 'Medina', '1987-11-07', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1056772064')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '8751491a-ab04-4287-9953-db03e09e9733', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar Servicios Generales', '2026-03-02', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'obra_labor', 1966439, '2026-03-02');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Famisanar', 'Porvenir', 'Comfaboy', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '25494394238', 'ahorros', true);
  END IF;

  -- Empleado: 43851750 (Omaira Del Socorro Gomez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '43851750', 'Omaira Del Socorro', '', 'Gomez', '', '1979-03-12', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '43851750')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e371ac6e-8e1f-473a-a5ce-9782dfa981eb', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2026-03-02', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'obra_labor', 2021013, '2026-03-02');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sura', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '24500011568', 'ahorros', true);
  END IF;

  -- Empleado: 1001815351 (Leydy Jimenez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1001815351', 'Leydy', 'Johana', 'Jimenez', 'Corredor', '2001-09-29', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1001815351')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '352df2d8-a7df-43ad-a489-ab86c99ac60a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria (Perfil Lavaloza)', '2026-03-04', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-04');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Salud Total', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '863008277', 'ahorros', true);
  END IF;

  -- Empleado: 1042212639 (Karen Lopez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1042212639', 'Karen', 'Andrea', 'Lopez', 'Barriosnuevos', '1992-11-18', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1042212639')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '352df2d8-a7df-43ad-a489-ab86c99ac60a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2026-03-04', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-04');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '84010382', 'ahorros', true);
  END IF;

  -- Empleado: 1002446712 (Maidis Seija)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1002446712', 'Maidis', '', 'Seija', 'Pimienta', '1997-03-06', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1002446712')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '352df2d8-a7df-43ad-a489-ab86c99ac60a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2026-03-02', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-02');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '30677517235', 'ahorros', true);
  END IF;

  -- Empleado: 28359441 (Maria Medina)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '28359441', 'Maria', 'Susana', 'Medina', 'Villamizar', '1979-03-29', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '28359441')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '0c7ea053-77f9-475d-a61b-9c2697dea6ee', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2026-03-02', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-02');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps Movilidad', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Pendienta Banco', '1234', 'ahorros', true);
  END IF;

  -- Empleado: 1005461689 (Sleyder Gutierrez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1005461689', 'Sleyder', '', 'Gutierrez', 'Caicedo', '2000-02-25', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1005461689')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '0c7ea053-77f9-475d-a61b-9c2697dea6ee', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Cocinero', '2026-03-01', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 2177490, '2026-03-01');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '21660385620', 'ahorros', true);
  END IF;

  -- Empleado: 1096195467 (Tabita Caceres)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1096195467', 'Tabita', '', 'Caceres', 'Gale', '1987-04-16', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1096195467')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '148e2e4c-cc2e-4d60-851e-e13b25c409b3', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2026-03-04', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-04');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Famisanar', 'Porvenir', 'Caja De Comp. Familiar De Barrancabermeja Cafaba', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '30698842501', 'ahorros', true);
  END IF;

  -- Empleado: 1062874790 (Marlon Gutierrez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1062874790', 'Marlon', 'Arley', 'Gutierrez', 'Gutierrez', '2005-07-18', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1062874790')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a4b679c5-6fd4-4449-9ff6-af9addcd4b43', '7b5d56a9-3f20-46a8-9b57-551fa88b521f', NULL, 'Auxiliar De Bodega', '2026-03-03', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-03');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '2099168318', 'ahorros', true);
  END IF;

  -- Empleado: 22586655 (Laudith Ospino)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '22586655', 'Laudith', 'Johana', 'Ospino', 'Benitez', '1982-04-24', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '22586655')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e371ac6e-8e1f-473a-a5ce-9782dfa981eb', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar General', '2026-03-06', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-06');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Salud Total Eps S.A.', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '31100021353', 'ahorros', true);
  END IF;

  -- Empleado: 1095918423 (Lina Godoy)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1095918423', 'Lina', 'Maria', 'Godoy', 'Vega', '1989-04-17', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1095918423')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '148e2e4c-cc2e-4d60-851e-e13b25c409b3', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2026-03-10', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-10');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Caja De Comp. Familiar De Barrancabermeja Cafaba', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '30638788621', 'ahorros', true);
  END IF;

  -- Empleado: 1094281078 (Jose Parada)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1094281078', 'Jose', 'Alejandro', 'Parada', 'Rico', '1998-02-14', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1094281078')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'ce3e5c61-6717-4bd9-99fd-2e645744f2b2', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Servicios Hospitalarios', '2026-03-10', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-10');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '79599436761', 'ahorros', true);
  END IF;

  -- Empleado: 1006476656 (Angie Sarmiento)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1006476656', 'Angie', 'Johana', 'Sarmiento', 'Gutierrez', '2001-12-29', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1006476656')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '423108da-c727-4130-871b-ecec115ce237', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo', '2026-03-10', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 3776220, '2026-03-10');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '125113575', 'ahorros', true);
  END IF;

  -- Empleado: 30937790 (Sol Saavedra)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '30937790', 'Sol', 'Merida', 'Saavedra', 'Granados', '1984-08-03', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '30937790')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'c663c459-1004-4f1f-b3db-fd4cdcb201a8', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Servicios Generales', '2026-03-12', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-12');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Cajacopi Eps', 'Protección', 'Cofrem Meta', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '202006042', 'ahorros', true);
  END IF;

  -- Empleado: 1005340270 (Carlos Porras)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1005340270', 'Carlos', 'Daniel', 'Porras', 'Cardenas', '2000-06-15', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1005340270')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a4b679c5-6fd4-4449-9ff6-af9addcd4b43', 'a6d24543-09ac-42e0-8115-972c88f0f5d2', NULL, 'Auxiliar De Bodega', '2026-03-11', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-11');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sanitas', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '91299562412', 'ahorros', true);
  END IF;

  -- Empleado: 1069462833 (Luz Sotelo)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1069462833', 'Luz', 'Esther', 'Sotelo', 'Padilla', '1995-04-21', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1069462833')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '52d98b41-c040-4018-9ab0-3958a19f02ad', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2026-03-13', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 2841296, '2026-03-13');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Mutual Ser', 'Porvenir', 'Comfacor', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '53198434457', 'ahorros', true);
  END IF;

  -- Empleado: 5888139 (Genesis Morillo)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '5888139', 'Genesis', 'Robimar', 'Morillo', 'Gonzalez', '2007-12-06', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '5888139')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '52d98b41-c040-4018-9ab0-3958a19f02ad', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2026-03-13', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 2841296, '2026-03-13');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Mutual Ser', 'Porvenir', 'Comfacor', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '53100003291', 'ahorros', true);
  END IF;

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

  -- Empleado: 1061988907 (Maria Gaviria)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1061988907', 'Maria', 'Alejandra', 'Gaviria', 'Ruiz', '1995-09-29', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1061988907')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'b45212de-c602-4ea1-9a04-7a230bb6972b', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Clasificadora De Huevos', '2026-03-20', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-20');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Pendienta Banco', '1234', 'ahorros', true);
  END IF;

  -- Empleado: 1097036137 (Juan Alzate)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1097036137', 'Juan', 'Manuel', 'Alzate', 'Valencia', '1991-06-19', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1097036137')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e371ac6e-8e1f-473a-a5ce-9782dfa981eb', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Supervisor De Produccion', '2026-03-21', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 3154752, '2026-03-21');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sanitas', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '17180211454', 'ahorros', true);
  END IF;

  -- Empleado: 1095836569 (Jhonatan Suarez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1095836569', 'Jhonatan', 'Camilo', 'Suarez', 'Torres', '1997-09-09', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1095836569')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'ce3e5c61-6717-4bd9-99fd-2e645744f2b2', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Servicios Hospitalarios', '2026-03-20', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-20');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '9089006781', 'ahorros', true);
  END IF;

  -- Empleado: 1005183512 (Daniela Garzon)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1005183512', 'Daniela', '', 'Garzon', 'Delgado', '2003-05-20', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1005183512')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '148e2e4c-cc2e-4d60-851e-e13b25c409b3', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2026-03-24', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-03-24');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Salud Total Eps S.A.', 'Porvenir', 'Caja De Comp. Familiar De Barrancabermeja Cafaba', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '84010514', 'ahorros', true);
  END IF;

  -- Empleado: 1056779063 (Cristian Bustos)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1056779063', 'Cristian', 'David', 'Bustos', 'Diaz', '1993-06-14', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1056779063')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '8751491a-ab04-4287-9953-db03e09e9733', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Bodeguero', '2026-03-24', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 2260571, '2026-03-24');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfaboy', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '91299696915', 'ahorros', true);
  END IF;

  -- Empleado: 1001503105 (Yurany Espinosa)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1001503105', 'Yurany', 'Alejandra', 'Espinosa', 'Jaramillo', '1999-03-30', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1001503105')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e371ac6e-8e1f-473a-a5ce-9782dfa981eb', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar General', '2026-03-25', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-25');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Savia Salud Eps', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '50398751750', 'ahorros', true);
  END IF;

  -- Empleado: 1088305693 (Yeisson Castro)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1088305693', 'Yeisson', 'Alexander', 'Castro', 'Gomez', '1993-01-19', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1088305693')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'eef493ee-ebc3-43ff-9975-cd030c21a47a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Galponero', '2026-03-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sanitas', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '4400046081', 'ahorros', true);
  END IF;

  -- Empleado: 1102356306 (Albeiro Araque)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1102356306', 'Albeiro', '', 'Araque', 'Carrizalez', '2006-06-17', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1102356306')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '09b54945-700f-41c6-8c44-caed54c8f874', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Galponero', '2026-03-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Salud Total', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '91201456849', 'ahorros', true);
  END IF;

  -- Empleado: 63507148 (Cecilia Calderon)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '63507148', 'Cecilia', '', 'Calderon', 'Duran', '1975-03-31', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '63507148')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'f0e66122-d89d-4717-be05-abcdf35032b4', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2026-03-31', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-03-31');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Banco Davivienda Sa', '550506000000000', 'ahorros', true);
  END IF;

  -- Empleado: 40250424 (Vilma Galvis)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '40250424', 'Vilma', 'Patricia', 'Galvis', 'Gaitan', '1984-11-17', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '40250424')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fe6f8e2d-725e-45e7-9527-427421929058', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2026-04-01', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 2512620, '2026-04-01');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Cofrem Meta', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '28900008134', 'ahorros', true);
  END IF;

  -- Empleado: 1048872156 (Maria Perez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1048872156', 'Maria', 'Angel', 'Perez', 'Vasquez', '2003-02-02', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1048872156')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '868a7d45-7f42-4d8a-85da-98b9122e2ec0', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Mesera-Auxiliar De Servicios Generales', '2026-04-06', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-04-06');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Coosalud Eps-S', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '79600061211', 'ahorros', true);
  END IF;

  -- Empleado: 1096209095 (Ana Sanchez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1096209095', 'Ana', 'Laura', 'Sanchez', 'Retamoza', '1990-09-10', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1096209095')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '148e2e4c-cc2e-4d60-851e-e13b25c409b3', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2026-04-06', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-04-06');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Caja De Comp. Familiar De Barrancabermeja Cafaba', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '30600086631', 'ahorros', true);
  END IF;

  -- Empleado: 1005047818 (Gustavo Meneses)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1005047818', 'Gustavo', 'Alexis', 'Meneses', 'Buitrago', '2000-02-27', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1005047818')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'ec3737a6-0d59-4568-aad0-adb743dd047e', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Cocinero', '2026-04-01', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'obra_labor', 2177490, '2026-04-01');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Comfaoriente Eps', 'Porvenir', 'Caja De Comp. Familiar Comfanorte', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Banco Agrario', '451700000000', 'ahorros', true);
  END IF;

  -- Empleado: 1093905986 (Jorge Garcia)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1093905986', 'Jorge', 'Alexander', 'Garcia', 'Duran', '1987-01-23', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1093905986')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'ec3737a6-0d59-4568-aad0-adb743dd047e', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Conductor Lonchero', '2026-04-01', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-04-01');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Caja De Comp. Familiar Comfanorte', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '59079818831', 'ahorros', true);
  END IF;

  -- Empleado: 1116778903 (German Gelves)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1116778903', 'German', '', 'Gelves', 'Sierra', '1986-10-14', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1116778903')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'ed126c70-b373-44b0-80a3-2a72e1fb0a58', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Cuadrillo', '2026-04-06', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 4241820, '2026-04-06');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '31772256798', 'ahorros', true);
  END IF;

  -- Empleado: 1102635648 (Andres Camargo)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1102635648', 'Andres', 'Sebastian', 'Camargo', 'Sandoval', '2007-12-31', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1102635648')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'c8e74a0f-7a8c-4993-ab05-9f563305b14e', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Aprendiz Sena Productiva', '2026-04-06', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'aprendizaje', 1750950, '2026-04-06');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sura', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '4400046285', 'ahorros', true);
  END IF;

  -- Empleado: 1085046065 (Zoila Florez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1085046065', 'Zoila', 'Maria', 'Florez', 'Cardenas', '1986-03-22', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1085046065')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '57e5be5e-f320-47d4-9013-3de14957a674', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Cocinera', '2026-04-08', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'obra_labor', 2177490, '2026-04-08');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps Movilidad', 'Porvenir', 'Comfenalco Cartagena', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '30659026127', 'ahorros', true);
  END IF;

  -- Empleado: 10782488 (Adalberto Murillo)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '10782488', 'Adalberto', '', 'Murillo', 'Perez', '1984-08-16', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '10782488')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fd28c9df-6d50-46fc-8dd5-5b6eff640470', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Conductor', '2026-04-08', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 2000000, '2026-04-08');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Salud Total Eps S.A.', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '963047908', 'ahorros', true);
  END IF;

  -- Empleado: 1001165642 (Sara Velasquez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1001165642', 'Sara', 'Paulina', 'Velasquez', 'Agudelo', '2001-09-02', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1001165642')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e371ac6e-8e1f-473a-a5ce-9782dfa981eb', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar General', '2026-04-09', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-04-09');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Savia Salud Eps', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '50340994971', 'ahorros', true);
  END IF;

  -- Empleado: 1080296439 (Jeidy Llanos)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1080296439', 'Jeidy', 'Yohana', 'Llanos', 'Suaza', '1996-05-29', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1080296439')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a91ebed5-c3f9-4e00-ae2d-6470214c618a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2026-04-09', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1839720, '2026-04-09');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfamiliar Del Huila', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '71156474406', 'ahorros', true);
  END IF;

END $$;