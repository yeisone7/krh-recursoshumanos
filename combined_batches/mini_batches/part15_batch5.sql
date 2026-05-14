DO $$
DECLARE
  emp_id UUID;
BEGIN

  -- Empleado: 1193424581 (Ricardo Acosta)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT 'b2377a7c-a871-4260-b118-0426a8849d19', 'CC', '1193424581', 'Ricardo', 'Antonio', 'Acosta', 'Pedrozo', '1997-12-31', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = 'b2377a7c-a871-4260-b118-0426a8849d19' AND document_number = '1193424581')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'e2b683e4-3488-4fd1-b6e7-f34d5ee1302c', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Servicios Generales', '2022-02-22', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'fijo', 1500000, '2022-02-22');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'Famisanar', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'Banco Caja Social Bcsc Sa', '24111025929', 'ahorros', true);
  END IF;

  -- Empleado: 63511398 (Gloria Bautista)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT 'b2377a7c-a871-4260-b118-0426a8849d19', 'CC', '63511398', 'Gloria', 'Amparo', 'Bautista', 'Tobo', '1976-05-26', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = 'b2377a7c-a871-4260-b118-0426a8849d19' AND document_number = '63511398')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'e2b683e4-3488-4fd1-b6e7-f34d5ee1302c', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Administrador', '2015-12-01', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'fijo', 3400000, '2015-12-01');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'Eps Sura', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'Banco Caja Social Bcsc Sa', '24044316453', 'ahorros', true);
  END IF;

  -- Empleado: 1104127628 (Julian Garcia)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1104127628', 'Julian', 'Felipe', 'Garcia', 'Moreno', '2006-08-30', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1104127628')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'a4b679c5-6fd4-4449-9ff6-af9addcd4b43', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Aprendiz Sena Lectiva', '2026-01-14', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-01-14');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Coosalud Eps-Cm', 'Entidad No Aporta Pensión', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '84010132', 'ahorros', true);
  END IF;

  -- Empleado: 91296123 (Ramiro Chaparro)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT 'b2377a7c-a871-4260-b118-0426a8849d19', 'CC', '91296123', 'Ramiro', '', 'Chaparro', 'Cardozo', '1974-02-12', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = 'b2377a7c-a871-4260-b118-0426a8849d19' AND document_number = '91296123')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'e2b683e4-3488-4fd1-b6e7-f34d5ee1302c', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2020-01-22', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'fijo', 1720000, '2020-01-22');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'Nueva Eps', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'Pendienta Banco', '0', 'ahorros', true);
  END IF;

  -- Empleado: 28151909 (Sonia Rueda)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT 'b2377a7c-a871-4260-b118-0426a8849d19', 'CC', '28151909', 'Sonia', 'Amparo', 'Rueda', 'Galvis', '1978-10-07', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = 'b2377a7c-a871-4260-b118-0426a8849d19' AND document_number = '28151909')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'e2b683e4-3488-4fd1-b6e7-f34d5ee1302c', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2021-07-28', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'fijo', 1550000, '2021-07-28');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'Salud Total', 'Porvenir', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, 'b2377a7c-a871-4260-b118-0426a8849d19', 'Pendienta Banco', '0', 'corriente', true);
  END IF;

  -- Empleado: 1006414423 (Asly Tumay)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1006414423', 'Asly', 'Yurany', 'Tumay', 'Carvajal', '2001-01-15', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1006414423')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '423108da-c727-4130-871b-ecec115ce237', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo', '2026-01-16', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 3776220, '2026-01-16');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Pendienta Banco', '0', 'ahorros', true);
  END IF;

  -- Empleado: 1063295080 (Mileidys Diaz)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1063295080', 'Mileidys', 'Paola', 'Diaz', 'Diaz', '1993-11-02', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1063295080')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e371ac6e-8e1f-473a-a5ce-9782dfa981eb', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar General', '2026-01-16', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'obra_labor', 1750905, '2026-01-16');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Caja De Compensación Familiar De Antioquia', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '900003087', 'ahorros', true);
  END IF;

  -- Empleado: 1035128910 (Bernardo Zapata)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1035128910', 'Bernardo', 'De Jesus', 'Zapata', 'Valdes', '1995-05-23', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1035128910')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e371ac6e-8e1f-473a-a5ce-9782dfa981eb', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar General', '2026-01-16', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'obra_labor', 1750905, '2026-01-16');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Coosalud Eps-Cm', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '91285845300', 'ahorros', true);
  END IF;

  -- Empleado: 1096199289 (Rosa Moscoso)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1096199289', 'Rosa', 'Maria', 'Moscoso', 'Guzman', '1988-10-05', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1096199289')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '352df2d8-a7df-43ad-a489-ab86c99ac60a', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Aseo Y Cafeteria', '2026-01-19', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1750905, '2026-01-19');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '30671827631', 'ahorros', true);
  END IF;

  -- Empleado: 1002065514 (Jose Lopez)
  emp_id := NULL;
  INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1002065514', 'Jose', 'Gabriel', 'Lopez', 'Eusse', '2000-05-24', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1002065514')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e371ac6e-8e1f-473a-a5ce-9782dfa981eb', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Cocinero', '2026-01-20', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 1971720, '2026-01-20');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Porvenir', 'Comfenalco Antioquia Ccf', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '50300001082', 'ahorros', true);
  END IF;
END $$;
