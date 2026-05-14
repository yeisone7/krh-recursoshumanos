DO $$ DECLARE emp_id UUID; BEGIN
INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1129514420', 'Luis', 'Carlos', 'Yepes', 'Rosales', '1985-07-06', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1129514420')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '423108da-c727-4130-871b-ecec115ce237', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Subchef', '2023-05-23', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 3529920, '2023-05-23');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sura', 'Protección', 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '48187263070', 'ahorros', true);
  END IF;

  -- Empleado: 1116789554 (Ysamar Moreno)
  emp_id := NULL;


emp_id := NULL;
INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1116789554', 'Ysamar', '', 'Moreno', 'Castillo', '1990-12-09', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1116789554')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '423108da-c727-4130-871b-ecec115ce237', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2023-05-23', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 3142470, '2023-05-23');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Nueva Eps', 'Protección', 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '31706188994', 'ahorros', true);
  END IF;

  -- Empleado: 37555921 (Liceth Bayona)
  emp_id := NULL;


emp_id := NULL;
INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '37555921', 'Liceth', 'Patricia', 'Bayona', 'Garcia', '1978-03-20', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '37555921')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'e633e9ba-9892-465e-a342-094392012912', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliares De  Servicios Hospitalarios', '2023-05-18', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'indefinido', 1750905, '2023-05-18');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sanitas', 'Protección', 'Comfenalco Santander', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Banco Caja Social Bcsc Sa', '24123193407', 'ahorros', true);
  END IF;

  -- Empleado: 17594332 (Hermess Dueñez)
  emp_id := NULL;


emp_id := NULL;
INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '17594332', 'Hermess', '', 'Dueñez', 'Sanguino', '1978-11-03', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '17594332')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '423108da-c727-4130-871b-ecec115ce237', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Auxiliar De Cocina', '2025-07-18', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 3142470, '2025-07-18');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sanitas', 'Protección', 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bbva Colombia', '137491866', 'ahorros', true);
  END IF;

  -- Empleado: 1116789890 (Joan Escobar)
  emp_id := NULL;


emp_id := NULL;
INSERT INTO public.employees_v2 (company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, birth_date, is_active)
  SELECT '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'CC', '1116789890', 'Joan', 'Alfredo', 'Escobar', 'Granados', '1991-03-03', true
  WHERE NOT EXISTS (SELECT 1 FROM public.employees_v2 WHERE company_id = '0a1a781e-e8ad-4ae6-a475-1f717c100304' AND document_number = '1116789890')
  RETURNING id INTO emp_id;

  IF emp_id IS NOT NULL THEN
    -- Work Info
    INSERT INTO public.employee_work_info (employee_id, company_id, operation_center_id, area_id, position_id, position_name, hire_date, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', '423108da-c727-4130-871b-ecec115ce237', '89078f39-e6de-455a-92ba-5287e042c36e', NULL, 'Cuadrillo', '2023-05-14', true);

    -- Contract
    INSERT INTO public.contracts (employee_id, company_id, contract_type, salary, start_date)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'fijo', 3529920, '2023-05-14');

    -- Social Security
    INSERT INTO public.employee_social_security (employee_id, company_id, eps, afp, ccf, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Eps Sanitas', 'Protección', 'Comfiar Caja De Compensacion Familiar De Arauca', true);

    -- Bank Info
    INSERT INTO public.employee_bank_info (employee_id, company_id, bank_name, account_number, account_type, is_current)
    VALUES (emp_id, '0a1a781e-e8ad-4ae6-a475-1f717c100304', 'Bancolombia', '31700010981', 'ahorros', true);
  END IF;

  -- Empleado: 1115739501 (Heillerr Tarazona)
  emp_id := NULL;


END $$;