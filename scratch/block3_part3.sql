-- Work Info for 1067724214
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '7cc22d1b-0096-4fc0-82bd-6e2a08904956', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2024-06-13', 'fijo', true, '2024-06-13'
) ON CONFLICT DO NOTHING;
-- Contract for 1067724214
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '7cc22d1b-0096-4fc0-82bd-6e2a08904956', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-06-13', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065995953
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e8aafdd7-4b52-429d-9f2b-c5efdde389a7', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '2df5bafa-6944-4736-ba05-d0686b703911', 'e69185bd-527f-4b68-bf94-eadcd3b1616d', 'Tecnico De Mantenimiento', 'El Paso', '2023-12-22', 'fijo', true, '2023-12-22'
) ON CONFLICT DO NOTHING;
-- Contract for 1065995953
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e8aafdd7-4b52-429d-9f2b-c5efdde389a7', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-12-22', 2477669, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065985378
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '30a17f5b-efcf-4d40-9473-45d799adfbab', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2024-02-01', 'indefinido', true, '2024-02-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1065985378
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '30a17f5b-efcf-4d40-9473-45d799adfbab', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2024-02-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065997804
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c58153f6-052f-4899-b5e1-c18a18023408', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '11949ee9-276e-40c0-8152-03282d7cab34', 'f84142f8-1f41-45ec-80de-ae9a09dc8aa8', 'Auxiliar De Casa Hielo', 'El Paso', '2024-02-01', 'indefinido', true, '2024-02-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1065997804
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c58153f6-052f-4899-b5e1-c18a18023408', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2024-02-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1066864250
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '9b50f5c9-a070-48df-975e-94c48684d6d5', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b1aca022-95e2-45f8-bad0-278a6ee7a8ad', 'babb0326-dd40-4180-b9d3-833d2b79263f', 'Conductor', 'El Paso', '2024-02-19', 'fijo', true, '2024-02-19'
) ON CONFLICT DO NOTHING;
-- Contract for 1066864250
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '9b50f5c9-a070-48df-975e-94c48684d6d5', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-02-19', 1962935, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064792435
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '9238312f-aae9-4203-b4f7-de3a07b3d44b', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2024-02-27', 'indefinido', true, '2024-02-27'
) ON CONFLICT DO NOTHING;
-- Contract for 1064792435
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '9238312f-aae9-4203-b4f7-de3a07b3d44b', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2024-02-27', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1063971695
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '7784daa1-a76a-481d-9f51-7b9b621ef404', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2024-03-05', 'indefinido', true, '2024-03-05'
) ON CONFLICT DO NOTHING;
-- Contract for 1063971695
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '7784daa1-a76a-481d-9f51-7b9b621ef404', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2024-03-05', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065999473
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'b517b8d2-8392-4c5b-8ffd-e78123e94822', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '58d469c1-02e8-4772-bd7e-11babc0a4d2b', 'b3b6cbe1-1246-4dfd-b900-5a8d3e305b71', 'Cajera', 'El Paso', '2024-03-11', 'indefinido', true, '2024-03-11'
) ON CONFLICT DO NOTHING;
-- Contract for 1065999473
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'b517b8d2-8392-4c5b-8ffd-e78123e94822', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2024-03-11', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1063951667
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '31d7dde8-2ea5-4d97-851f-c14f59641aab', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2024-03-11', 'indefinido', true, '2024-03-11'
) ON CONFLICT DO NOTHING;
-- Contract for 1063951667
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '31d7dde8-2ea5-4d97-851f-c14f59641aab', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2024-03-11', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065994998
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e0896066-b0bb-4e10-9aa1-d6d5dfbbbd1d', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2024-03-21', 'indefinido', true, '2024-03-21'
) ON CONFLICT DO NOTHING;
-- Contract for 1065994998
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e0896066-b0bb-4e10-9aa1-d6d5dfbbbd1d', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2024-03-21', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1148198745
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '3d165832-bc5d-4df5-95aa-0a6772dcc765', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2024-03-21', 'indefinido', true, '2024-03-21'
) ON CONFLICT DO NOTHING;
-- Contract for 1148198745
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '3d165832-bc5d-4df5-95aa-0a6772dcc765', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2024-03-21', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1192812368
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '7b2207b3-d072-48a9-82bd-990cd6c119dc', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2024-04-29', 'fijo', true, '2024-04-29'
) ON CONFLICT DO NOTHING;
-- Contract for 1192812368
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '7b2207b3-d072-48a9-82bd-990cd6c119dc', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-04-29', 1558868, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1062354019
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '85f4d2a0-1b06-4931-b17c-ca2db4271d06', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2024-05-03', 'fijo', true, '2024-05-03'
) ON CONFLICT DO NOTHING;
-- Contract for 1062354019
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '85f4d2a0-1b06-4931-b17c-ca2db4271d06', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-05-03', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1192738846
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '910ec826-2e48-4dce-8229-38163269b27e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2024-07-16', 'fijo', true, '2024-07-16'
) ON CONFLICT DO NOTHING;
-- Contract for 1192738846
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '910ec826-2e48-4dce-8229-38163269b27e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-07-16', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003251723
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '7db8c962-2d80-41c4-bd91-8a5c4145a859', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2024-08-05', 'fijo', true, '2024-08-05'
) ON CONFLICT DO NOTHING;
-- Contract for 1003251723
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '7db8c962-2d80-41c4-bd91-8a5c4145a859', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-08-05', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1066002226
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '4acbaf20-60a9-40e6-a333-2fa4fbfe1a06', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '9621a918-9474-4a2b-9f9a-195018024464', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2024-08-21', 'fijo', true, '2024-08-21'
) ON CONFLICT DO NOTHING;
-- Contract for 1066002226
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '4acbaf20-60a9-40e6-a333-2fa4fbfe1a06', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-08-21', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1007624529
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '8dd95a24-335f-4945-b418-d4904dd38dbf', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', 'e308222c-8624-456e-bf7f-ce1bdc0e8103', 'Auxiliar De Bodega', 'El Paso', '2024-09-02', 'fijo', true, '2024-09-02'
) ON CONFLICT DO NOTHING;
-- Contract for 1007624529
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '8dd95a24-335f-4945-b418-d4904dd38dbf', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-09-02', 1755142, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065983896
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '523a7097-282a-4cf2-aa66-52f746905709', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', 'e308222c-8624-456e-bf7f-ce1bdc0e8103', 'Auxiliar De Bodega', 'El Paso', '2024-09-02', 'fijo', true, '2024-09-02'
) ON CONFLICT DO NOTHING;
-- Contract for 1065983896
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '523a7097-282a-4cf2-aa66-52f746905709', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-09-02', 1755142, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1095906395
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '88e575e6-b814-44f9-a0da-adf100bf28f8', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd9609516-2c88-4373-ab3f-55e945ea4864', '5e49f260-58ab-417e-978e-2d6877787fc8', 'Asistente De Tesoreria', 'Bucaramanga', '2024-09-16', 'fijo', true, '2024-09-16'
) ON CONFLICT DO NOTHING;
-- Contract for 1095906395
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '88e575e6-b814-44f9-a0da-adf100bf28f8', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-09-16', 2350000, 'Bucaramanga', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065995972
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '07589984-d8d5-4f13-80ce-1e70603b36e9', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2024-10-16', 'fijo', true, '2024-10-16'
) ON CONFLICT DO NOTHING;
-- Contract for 1065995972
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '07589984-d8d5-4f13-80ce-1e70603b36e9', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-10-16', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1128149133
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '24772203-595f-454e-8884-50df717d89d0', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2024-10-30', 'fijo', true, '2024-10-30'
) ON CONFLICT DO NOTHING;
-- Contract for 1128149133
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '24772203-595f-454e-8884-50df717d89d0', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-10-30', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065562735
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '6dce5387-5932-46d2-a38d-508e266c845d', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2024-10-30', 'fijo', true, '2024-10-30'
) ON CONFLICT DO NOTHING;
-- Contract for 1065562735
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '6dce5387-5932-46d2-a38d-508e266c845d', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-10-30', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064112638
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '34ba3d19-26ad-45e0-993e-69b6e84e9769', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2024-10-30', 'fijo', true, '2024-10-30'
) ON CONFLICT DO NOTHING;
-- Contract for 1064112638
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '34ba3d19-26ad-45e0-993e-69b6e84e9769', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-10-30', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1016950101
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '55913e03-0eef-4c12-9626-70a0e27ff229', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd8bfc8fa-3973-451f-9578-bca82d61d3ee', 'ddf36646-f5ca-4610-9230-4da75dfa48e0', 'Aprendiz Sena Lectiva', 'Bucaramanga', '2024-10-30', 'aprendizaje', true, '2024-10-30'
) ON CONFLICT DO NOTHING;
-- Contract for 1016950101
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '55913e03-0eef-4c12-9626-70a0e27ff229', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DE APRENDIZAJE', '2024-10-30', 1750905, 'Bucaramanga', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064802227
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '2a722c1a-3cf8-4b6c-a183-82e8b63ed374', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '58d469c1-02e8-4772-bd7e-11babc0a4d2b', 'b3b6cbe1-1246-4dfd-b900-5a8d3e305b71', 'Cajera', 'El Paso', '2025-01-29', 'fijo', true, '2025-01-29'
) ON CONFLICT DO NOTHING;
-- Contract for 1064802227
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '2a722c1a-3cf8-4b6c-a183-82e8b63ed374', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-01-29', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003123100
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '3e5c940e-c15f-4b62-99ec-a64109e3e1b6', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2025-02-20', 'fijo', true, '2025-02-20'
) ON CONFLICT DO NOTHING;
-- Contract for 1003123100
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '3e5c940e-c15f-4b62-99ec-a64109e3e1b6', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-02-20', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1066093900
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '7475c92d-2896-4ce2-871d-84d7a21cd967', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'e4f04700-562f-4530-98cb-885b4f0588ac', 'e5d02bdd-e37c-42cd-a0b6-052bf9e20145', 'Asistente De Recursos Humanos', 'El Paso', '2025-03-19', 'fijo', true, '2025-03-19'
) ON CONFLICT DO NOTHING;
-- Contract for 1066093900
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '7475c92d-2896-4ce2-871d-84d7a21cd967', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-03-19', 2348797, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064787526
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '4d8d6d40-7863-40b7-b61f-b5215987f651', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2025-03-25', 'fijo', true, '2025-03-25'
) ON CONFLICT DO NOTHING;
-- Contract for 1064787526
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '4d8d6d40-7863-40b7-b61f-b5215987f651', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-03-25', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1193097319
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '40f57638-a604-42cf-912d-e7b8285d378a', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2025-04-21', 'fijo', true, '2025-04-21'
) ON CONFLICT DO NOTHING;
-- Contract for 1193097319
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '40f57638-a604-42cf-912d-e7b8285d378a', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-04-21', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1050544980
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '5cf22d3b-141f-4128-92cb-449d4667e8aa', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2026-04-16', 'obra_labor', true, '2026-04-16'
) ON CONFLICT DO NOTHING;
-- Contract for 1050544980
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '5cf22d3b-141f-4128-92cb-449d4667e8aa', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO POR OBRA O LABOR DETERMINADA', '2026-04-16', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1119836870
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'f916ce7a-916d-4b0e-88b3-472cc4e5981e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2025-05-08', 'fijo', true, '2025-05-08'
) ON CONFLICT DO NOTHING;
-- Contract for 1119836870
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'f916ce7a-916d-4b0e-88b3-472cc4e5981e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-05-08', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77161115
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '50af3288-db99-4f8f-87fb-20d24ee51740', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2025-05-08', 'fijo', true, '2025-05-08'
) ON CONFLICT DO NOTHING;
-- Contract for 77161115
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '50af3288-db99-4f8f-87fb-20d24ee51740', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-05-08', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 84455247
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '1c063e3c-8aca-462c-a16a-eec57240f452', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', '0fc87688-921b-42ee-be49-808fe46799a6', 'Supervisor De Servicios', 'El Paso', '2025-05-21', 'fijo', true, '2025-05-21'
) ON CONFLICT DO NOTHING;
-- Contract for 84455247
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '1c063e3c-8aca-462c-a16a-eec57240f452', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-05-21', 3907494, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 17975914
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '19940506-983b-4001-9f3d-f1fe0d50fa14', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', '84978563-8633-4d99-92f7-eb90aae326e1', 'Panadero', 'El Paso', '2025-05-20', 'fijo', true, '2025-05-20'
) ON CONFLICT DO NOTHING;
-- Contract for 17975914
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '19940506-983b-4001-9f3d-f1fe0d50fa14', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-05-20', 3907494, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1007398803
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '66b5d9cf-fceb-4cd6-88c7-285f22335007', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '58d469c1-02e8-4772-bd7e-11babc0a4d2b', 'b3b6cbe1-1246-4dfd-b900-5a8d3e305b71', 'Cajera', 'El Paso', '2025-06-13', 'fijo', true, '2025-06-13'
) ON CONFLICT DO NOTHING;
-- Contract for 1007398803
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '66b5d9cf-fceb-4cd6-88c7-285f22335007', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-06-13', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1140826120
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '8df69178-d30c-4208-aa0e-908c9046e485', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2025-06-24', 'fijo', true, '2025-06-24'
) ON CONFLICT DO NOTHING;
-- Contract for 1140826120
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '8df69178-d30c-4208-aa0e-908c9046e485', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-06-24', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1007574207
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'a8e174c3-2968-446f-89b6-a1c4f9e7ae04', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd8bfc8fa-3973-451f-9578-bca82d61d3ee', 'e10712a4-72d8-41c6-9d70-e18b7195985e', 'Aprendiz Universitario', 'El Paso', '2025-06-24', 'aprendizaje', true, '2025-06-24'
) ON CONFLICT DO NOTHING;
-- Contract for 1007574207
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'a8e174c3-2968-446f-89b6-a1c4f9e7ae04', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DE APRENDIZAJE', '2025-06-24', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 37555831
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '214e9c85-aa84-488e-a80b-a81aa1e53421', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd9609516-2c88-4373-ab3f-55e945ea4864', '833847ef-b5e9-483a-bdae-8072dd072af3', 'Auxiliar De Servicios Generales', 'Bucaramanga', '2025-06-16', 'fijo', true, '2025-06-16'
) ON CONFLICT DO NOTHING;
-- Contract for 37555831
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '214e9c85-aa84-488e-a80b-a81aa1e53421', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-06-16', 1750905, 'Bucaramanga', false
) ON CONFLICT DO NOTHING;

-- Work Info for 18971129
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '50344559-c555-4057-80d6-570bac1643bb', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '2df5bafa-6944-4736-ba05-d0686b703911', 'e69185bd-527f-4b68-bf94-eadcd3b1616d', 'Tecnico De Mantenimiento', 'El Paso', '2025-07-17', 'fijo', true, '2025-07-17'
) ON CONFLICT DO NOTHING;
-- Contract for 18971129
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '50344559-c555-4057-80d6-570bac1643bb', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-07-17', 2400000, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065986009
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '041161eb-5428-4182-aa0f-aba0db387706', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2025-08-01', 'fijo', true, '2025-08-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1065986009
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '041161eb-5428-4182-aa0f-aba0db387706', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-08-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1122813904
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '81f6fc29-4e6a-4d6d-bede-6ac80d32eebe', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '9e18fa1d-2662-468c-b6f0-7d1f6ffb5489', '240169b2-c697-4c8b-adcd-3688d407c5d5', 'Jefe Sgi', 'El Paso', '2025-08-08', 'fijo', true, '2025-08-08'
) ON CONFLICT DO NOTHING;
-- Contract for 1122813904
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '81f6fc29-4e6a-4d6d-bede-6ac80d32eebe', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-08-08', 5426092, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 49724161
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c22ba822-25fc-4c9b-a77d-d68fed0a5a3c', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', '0fc87688-921b-42ee-be49-808fe46799a6', 'Supervisor De Servicios', 'El Paso', '2025-09-24', 'obra_labor', true, '2025-09-24'
) ON CONFLICT DO NOTHING;
-- Contract for 49724161
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c22ba822-25fc-4c9b-a77d-d68fed0a5a3c', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO POR OBRA O LABOR DETERMINADA', '2025-09-24', 3907493, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064787989
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '63acd679-fb42-4b2e-90aa-86d3f0c11b51', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', 'e308222c-8624-456e-bf7f-ce1bdc0e8103', 'Auxiliar De Bodega', 'El Paso', '2025-11-01', 'obra_labor', true, '2025-11-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1064787989
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '63acd679-fb42-4b2e-90aa-86d3f0c11b51', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO POR OBRA O LABOR DETERMINADA', '2025-11-01', 1755142, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1067591773
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '2f331a09-6a73-4a1f-8a5b-70e60d02abf5', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '11949ee9-276e-40c0-8152-03282d7cab34', 'f84142f8-1f41-45ec-80de-ae9a09dc8aa8', 'Auxiliar De Casa Hielo', 'El Paso', '2025-11-01', 'fijo', true, '2025-11-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1067591773
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '2f331a09-6a73-4a1f-8a5b-70e60d02abf5', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-11-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1067601401
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '81d51b8f-ea00-4750-9855-7e953997a7ce', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd8bfc8fa-3973-451f-9578-bca82d61d3ee', '0c91e44a-1302-4c46-81e6-9be232d00dd6', 'Aprendiz Sena Productiva', 'El Paso', '2025-11-05', 'aprendizaje', true, '2025-11-05'
) ON CONFLICT DO NOTHING;
-- Contract for 1067601401
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '81d51b8f-ea00-4750-9855-7e953997a7ce', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DE APRENDIZAJE', '2025-11-05', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1062395531
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '1eeaabca-7506-4f7d-9e38-b80fd2723121', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd8bfc8fa-3973-451f-9578-bca82d61d3ee', '0c91e44a-1302-4c46-81e6-9be232d00dd6', 'Aprendiz Sena Productiva', 'El Paso', '2025-11-05', 'aprendizaje', true, '2025-11-05'
) ON CONFLICT DO NOTHING;
-- Contract for 1062395531
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '1eeaabca-7506-4f7d-9e38-b80fd2723121', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DE APRENDIZAJE', '2025-11-05', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065855863
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '3663fc52-49cc-4d1d-a3e5-5506eb9e3e37', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd8bfc8fa-3973-451f-9578-bca82d61d3ee', '0c91e44a-1302-4c46-81e6-9be232d00dd6', 'Aprendiz Sena Productiva', 'El Paso', '2025-11-19', 'aprendizaje', true, '2025-11-19'
) ON CONFLICT DO NOTHING;
-- Contract for 1065855863
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '3663fc52-49cc-4d1d-a3e5-5506eb9e3e37', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DE APRENDIZAJE', '2025-11-19', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1081916522
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'd276ccd1-8501-47d6-a3db-541f9f097b63', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2026-04-06', 'fijo', true, '2026-04-06'
) ON CONFLICT DO NOTHING;
-- Contract for 1081916522
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'd276ccd1-8501-47d6-a3db-541f9f097b63', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2026-04-06', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1069177238
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '74e59d18-58d2-47bc-bfb5-10d2e9ad0346', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'c36b0840-d123-4112-a1ba-9bf31a02e576', 'Jefe De A&b Y Eventos', 'El Paso', '2025-12-01', 'indefinido', true, '2025-12-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1069177238
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '74e59d18-58d2-47bc-bfb5-10d2e9ad0346', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2025-12-01', 5534650, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1063953480
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'a3117bb9-e220-4c50-87a6-022396705214', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2025-12-01', 'fijo', true, '2025-12-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1063953480
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'a3117bb9-e220-4c50-87a6-022396705214', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2025-12-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1082843092
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e1876ec1-ec83-4010-b4a9-41283d17d11a', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', 'beb33cc2-8dce-41da-8b5f-8e2363e722de', 'Supervisor De Bodega', 'El Paso', '2026-01-16', 'fijo', true, '2026-01-16'
) ON CONFLICT DO NOTHING;
-- Contract for 1082843092
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e1876ec1-ec83-4010-b4a9-41283d17d11a', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2026-01-16', 3274080, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 18127895
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c73a6404-54a3-436a-b721-3c4f8310999e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '55616c11-7b52-4ea9-8242-8da2ec9708e4', 'b7c3a681-706c-478e-9e99-93e4848981ca', 'Hseq Relevante', 'El Paso', '2026-01-19', 'indefinido', true, '2026-01-19'
) ON CONFLICT DO NOTHING;
-- Contract for 18127895
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c73a6404-54a3-436a-b721-3c4f8310999e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2026-01-19', 5000000, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1192904781
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '43a3d62c-5107-470b-88b8-6f5fa7b3aa5b', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd8bfc8fa-3973-451f-9578-bca82d61d3ee', 'e10712a4-72d8-41c6-9d70-e18b7195985e', 'Aprendiz Universitario', 'El Paso', '2026-01-22', 'aprendizaje', true, '2026-01-22'
) ON CONFLICT DO NOTHING;
-- Contract for 1192904781
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '43a3d62c-5107-470b-88b8-6f5fa7b3aa5b', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DE APRENDIZAJE', '2026-01-22', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065202906
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '80943980-d6a3-4a72-8cb8-f4c70b4ee145', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd8bfc8fa-3973-451f-9578-bca82d61d3ee', '0c91e44a-1302-4c46-81e6-9be232d00dd6', 'Aprendiz Sena Productiva', 'El Paso', '2026-03-26', 'aprendizaje', true, '2026-03-26'
) ON CONFLICT DO NOTHING;
-- Contract for 1065202906
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '80943980-d6a3-4a72-8cb8-f4c70b4ee145', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DE APRENDIZAJE', '2026-03-26', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064726399
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'f8b6ee03-7ad7-4d3c-8b50-7fa06b1586e4', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd8bfc8fa-3973-451f-9578-bca82d61d3ee', '0c91e44a-1302-4c46-81e6-9be232d00dd6', 'Aprendiz Sena Productiva', 'El Paso', '2026-03-12', 'aprendizaje', true, '2026-03-12'
) ON CONFLICT DO NOTHING;
-- Contract for 1064726399
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'f8b6ee03-7ad7-4d3c-8b50-7fa06b1586e4', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DE APRENDIZAJE', '2026-03-12', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065983645
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'ef4cbe4f-b54c-4a0b-9527-deb00f2da22e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2026-04-06', 'fijo', true, '2026-04-06'
) ON CONFLICT DO NOTHING;
-- Contract for 1065983645
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'ef4cbe4f-b54c-4a0b-9527-deb00f2da22e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2026-04-06', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065575783
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '2f54edeb-bcf0-49da-bfc3-5d106122dac8', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2026-04-06', 'fijo', true, '2026-04-06'
) ON CONFLICT DO NOTHING;
-- Contract for 1065575783
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '2f54edeb-bcf0-49da-bfc3-5d106122dac8', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2026-04-06', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 91283538
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c86f6628-d6f6-4a78-86ff-05631efbab32', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'b673d210-e9b8-4bbe-a765-cacc611dd399', 'Chef Ejecutivo', 'El Paso', '2026-04-08', 'indefinido', true, '2026-04-08'
) ON CONFLICT DO NOTHING;
-- Contract for 91283538
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c86f6628-d6f6-4a78-86ff-05631efbab32', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2026-04-08', 6771211, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1015393251
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '452440f0-d46a-4bf0-95b9-74360a61ce5c', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2026-04-16', 'obra_labor', true, '2026-04-16'
) ON CONFLICT DO NOTHING;
-- Contract for 1015393251
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '452440f0-d46a-4bf0-95b9-74360a61ce5c', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO POR OBRA O LABOR DETERMINADA', '2026-04-16', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003252636
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'f01920e2-4cc0-441a-b844-992831e7a98e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2026-04-22', 'obra_labor', true, '2026-04-22'
) ON CONFLICT DO NOTHING;
-- Contract for 1003252636
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'f01920e2-4cc0-441a-b844-992831e7a98e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO POR OBRA O LABOR DETERMINADA', '2026-04-22', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

