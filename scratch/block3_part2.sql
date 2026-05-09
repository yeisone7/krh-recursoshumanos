-- Work Info for 1003236138
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '0a6e22d5-b42c-4114-9dcc-76ef1bfa01a6', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b1aca022-95e2-45f8-bad0-278a6ee7a8ad', 'babb0326-dd40-4180-b9d3-833d2b79263f', 'Conductor', 'El Paso', '2022-03-28', 'fijo', true, '2022-03-28'
) ON CONFLICT DO NOTHING;
-- Contract for 1003236138
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '0a6e22d5-b42c-4114-9dcc-76ef1bfa01a6', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-03-28', 2186572, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 36676686
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'b1c86dcc-a30f-4758-a0fc-12efbbe347b7', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'e39ba735-b118-4466-9d60-b7d90f1119fe', 'Cocinero 2', 'El Paso', '2016-10-05', 'fijo', true, '2016-10-05'
) ON CONFLICT DO NOTHING;
-- Contract for 36676686
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'b1c86dcc-a30f-4758-a0fc-12efbbe347b7', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-05', 2410525, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065627283
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'fae3db8f-5b2e-406e-af01-4850c6309543', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '9621a918-9474-4a2b-9f9a-195018024464', '41ef7e08-4151-4dfe-978a-50f48a840f71', 'Asistente De Gerencia', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1065627283
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'fae3db8f-5b2e-406e-af01-4850c6309543', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 2348797, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1193510422
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '2f138d2c-4b62-4df4-b578-32db924ef8a8', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2020-11-03', 'fijo', true, '2020-11-03'
) ON CONFLICT DO NOTHING;
-- Contract for 1193510422
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '2f138d2c-4b62-4df4-b578-32db924ef8a8', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2020-11-03', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064117649
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'cb51fe69-b543-4fe1-aff2-18dc62e0e26c', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '11949ee9-276e-40c0-8152-03282d7cab34', 'f84142f8-1f41-45ec-80de-ae9a09dc8aa8', 'Auxiliar De Casa Hielo', 'El Paso', '2024-01-22', 'fijo', true, '2024-01-22'
) ON CONFLICT DO NOTHING;
-- Contract for 1064117649
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'cb51fe69-b543-4fe1-aff2-18dc62e0e26c', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-01-22', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 84070532
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '60c3ff7b-6c59-4a7b-a4c8-18ef53c7712a', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 84070532
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '60c3ff7b-6c59-4a7b-a4c8-18ef53c7712a', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77181385
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '2f171aaf-c95a-4262-adf6-ee46067b3a28', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b1aca022-95e2-45f8-bad0-278a6ee7a8ad', 'babb0326-dd40-4180-b9d3-833d2b79263f', 'Conductor', 'El Paso', '2019-10-04', 'fijo', true, '2019-10-04'
) ON CONFLICT DO NOTHING;
-- Contract for 77181385
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '2f171aaf-c95a-4262-adf6-ee46067b3a28', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-10-04', 1962935, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003253384
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e76e5019-2ee7-4869-872a-5a40a1cc3e7b', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2022-05-20', 'fijo', true, '2022-05-20'
) ON CONFLICT DO NOTHING;
-- Contract for 1003253384
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e76e5019-2ee7-4869-872a-5a40a1cc3e7b', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-05-20', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064801452
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '27814762-3023-4e60-8f6c-c46917e34fc6', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '11949ee9-276e-40c0-8152-03282d7cab34', 'f84142f8-1f41-45ec-80de-ae9a09dc8aa8', 'Auxiliar De Casa Hielo', 'El Paso', '2019-02-20', 'fijo', true, '2019-02-20'
) ON CONFLICT DO NOTHING;
-- Contract for 1064801452
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '27814762-3023-4e60-8f6c-c46917e34fc6', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-02-20', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 12436618
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '94864b52-ce80-4f4c-8cdf-2c2b466aec40', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2022-06-01', 'fijo', true, '2022-06-01'
) ON CONFLICT DO NOTHING;
-- Contract for 12436618
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '94864b52-ce80-4f4c-8cdf-2c2b466aec40', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-06-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77093958
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e4662145-75c5-4234-958c-b8c6efa0ef5b', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2019-01-28', 'fijo', true, '2019-01-28'
) ON CONFLICT DO NOTHING;
-- Contract for 77093958
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e4662145-75c5-4234-958c-b8c6efa0ef5b', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-01-28', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 7618400
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '8f090675-53f7-4b1b-91cf-edac32596f94', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2016-10-05', 'fijo', true, '2016-10-05'
) ON CONFLICT DO NOTHING;
-- Contract for 7618400
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '8f090675-53f7-4b1b-91cf-edac32596f94', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-05', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1126420678
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c94d22c1-daa5-418a-b9a4-0912adb6c8d1', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2023-04-12', 'fijo', true, '2023-04-12'
) ON CONFLICT DO NOTHING;
-- Contract for 1126420678
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c94d22c1-daa5-418a-b9a4-0912adb6c8d1', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-04-12', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77094975
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c9d9b2b0-3a2e-426e-b97a-a022fe43d742', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2019-11-27', 'fijo', true, '2019-11-27'
) ON CONFLICT DO NOTHING;
-- Contract for 77094975
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c9d9b2b0-3a2e-426e-b97a-a022fe43d742', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-11-27', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 78707382
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '8f6957ac-0c56-4a4e-9e40-b50eda188cf4', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', '0fc87688-921b-42ee-be49-808fe46799a6', 'Supervisor De Servicios', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 78707382
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '8f6957ac-0c56-4a4e-9e40-b50eda188cf4', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 3907494, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1063623417
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '37863046-17e3-49f0-aae5-1d1ecc20c3b0', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '7172e957-a60e-4b77-93c3-de9bf2037187', '7d4815a8-a7a0-4a56-85d0-93b7a6ad858d', 'Asistente De Costos', 'El Paso', '2022-11-05', 'fijo', true, '2022-11-05'
) ON CONFLICT DO NOTHING;
-- Contract for 1063623417
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '37863046-17e3-49f0-aae5-1d1ecc20c3b0', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-11-05', 1755142, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065138686
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '93e7d695-9382-41e8-9d22-44898926d68e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', 'e308222c-8624-456e-bf7f-ce1bdc0e8103', 'Auxiliar De Bodega', 'El Paso', '2017-09-26', 'fijo', true, '2017-09-26'
) ON CONFLICT DO NOTHING;
-- Contract for 1065138686
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '93e7d695-9382-41e8-9d22-44898926d68e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2017-09-26', 1755142, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1082045539
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'd809cbc6-0d2b-4af4-b207-532f81eeabb5', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2016-09-30', 'fijo', true, '2016-09-30'
) ON CONFLICT DO NOTHING;
-- Contract for 1082045539
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'd809cbc6-0d2b-4af4-b207-532f81eeabb5', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-09-30', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 12436123
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '35bc4277-284c-42f9-8a32-fb9c7df8af80', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', 'beb33cc2-8dce-41da-8b5f-8e2363e722de', 'Supervisor De Bodega', 'El Paso', '2022-04-04', 'fijo', true, '2022-04-04'
) ON CONFLICT DO NOTHING;
-- Contract for 12436123
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '35bc4277-284c-42f9-8a32-fb9c7df8af80', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-04-04', 3274080, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 91284934
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '809df953-b31d-431d-bc10-d39847145e46', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'c862f6b2-2695-4f6d-82d8-7ad92c3b28ad', 'b4535592-939e-4172-9daf-1985ba3fb9e9', 'Gerente De Contrato', 'El Paso', '2016-08-26', 'indefinido', true, '2016-08-26'
) ON CONFLICT DO NOTHING;
-- Contract for 91284934
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '809df953-b31d-431d-bc10-d39847145e46', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2016-08-26', 13690600, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 17974693
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '3a01ab96-631d-42a2-8db8-80ef7818a530', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', '3485cd0f-133b-4a78-9958-f0de1a104c70', 'Cocinero 1', 'El Paso', '2018-10-04', 'fijo', true, '2018-10-04'
) ON CONFLICT DO NOTHING;
-- Contract for 17974693
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '3a01ab96-631d-42a2-8db8-80ef7818a530', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2018-10-04', 3926283, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 56099298
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '608fe86e-f34c-421a-a38f-84a5a3f2031c', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2021-11-18', 'fijo', true, '2021-11-18'
) ON CONFLICT DO NOTHING;
-- Contract for 56099298
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '608fe86e-f34c-421a-a38f-84a5a3f2031c', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-11-18', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1096211431
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '7e1cc811-fc1e-4bf9-a073-73bec214a5e9', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd9609516-2c88-4373-ab3f-55e945ea4864', 'f759b6f6-9871-41c9-9f64-1a7b8037d4b7', 'Auxiliar Contable', 'El Paso', '2022-11-01', 'fijo', true, '2022-11-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1096211431
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '7e1cc811-fc1e-4bf9-a073-73bec214a5e9', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-11-01', 1752000, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 88170997
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '87778ddf-2c28-412b-88fe-46fa8f8113fa', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'c862f6b2-2695-4f6d-82d8-7ad92c3b28ad', 'f82cafe1-0d03-4e25-ae44-4e2e9d9ffa07', 'Gerente Operativo', 'El Paso', '2016-09-21', 'indefinido', true, '2016-09-21'
) ON CONFLICT DO NOTHING;
-- Contract for 88170997
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '87778ddf-2c28-412b-88fe-46fa8f8113fa', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2016-09-21', 5435974, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1123732936
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'f2d3e533-079c-4855-94b1-ac96c3140ab7', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2021-06-10', 'fijo', true, '2021-06-10'
) ON CONFLICT DO NOTHING;
-- Contract for 1123732936
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'f2d3e533-079c-4855-94b1-ac96c3140ab7', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-06-10', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064791332
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '5e8240d9-9765-4d27-ae10-ef1ce0acb6b1', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '58d469c1-02e8-4772-bd7e-11babc0a4d2b', 'b3b6cbe1-1246-4dfd-b900-5a8d3e305b71', 'Cajera', 'El Paso', '2022-07-08', 'fijo', true, '2022-07-08'
) ON CONFLICT DO NOTHING;
-- Contract for 1064791332
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '5e8240d9-9765-4d27-ae10-ef1ce0acb6b1', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-07-08', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 17975704
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'd43b3e5f-aa4b-420e-b318-493a220f75d1', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 17975704
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'd43b3e5f-aa4b-420e-b318-493a220f75d1', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003290103
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '9ca9d626-5941-42ab-b7f7-b29b70def6d8', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2017-06-05', 'fijo', true, '2017-06-05'
) ON CONFLICT DO NOTHING;
-- Contract for 1003290103
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '9ca9d626-5941-42ab-b7f7-b29b70def6d8', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2017-06-05', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064793389
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e189aeff-566c-4726-87de-0ec5483c7d93', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2021-02-08', 'fijo', true, '2021-02-08'
) ON CONFLICT DO NOTHING;
-- Contract for 1064793389
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e189aeff-566c-4726-87de-0ec5483c7d93', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-02-08', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77184077
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '9937a5d7-ec0e-46e6-9e17-2f847c7164c0', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', '3485cd0f-133b-4a78-9958-f0de1a104c70', 'Cocinero 1', 'El Paso', '2016-10-05', 'fijo', true, '2016-10-05'
) ON CONFLICT DO NOTHING;
-- Contract for 77184077
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '9937a5d7-ec0e-46e6-9e17-2f847c7164c0', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-05', 2410525, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77094402
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c28bba96-811d-4a53-a1fa-728dd14e41bf', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '11949ee9-276e-40c0-8152-03282d7cab34', 'f84142f8-1f41-45ec-80de-ae9a09dc8aa8', 'Auxiliar De Casa Hielo', 'El Paso', '2016-09-30', 'fijo', true, '2016-09-30'
) ON CONFLICT DO NOTHING;
-- Contract for 77094402
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c28bba96-811d-4a53-a1fa-728dd14e41bf', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-09-30', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1232888071
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'd3804c0c-ec56-464a-a71c-f20a35dcbd06', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd9609516-2c88-4373-ab3f-55e945ea4864', 'd51e4b2c-77e9-4cdc-8c3c-6dd96a6138d8', 'Auxiliar De Gestion Documental', 'El Paso', '2022-10-04', 'fijo', true, '2022-10-04'
) ON CONFLICT DO NOTHING;
-- Contract for 1232888071
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'd3804c0c-ec56-464a-a71c-f20a35dcbd06', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-10-04', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 22532974
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'ff6832d9-0141-4d5c-8409-255472011b19', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'c862f6b2-2695-4f6d-82d8-7ad92c3b28ad', 'f82cafe1-0d03-4e25-ae44-4e2e9d9ffa07', 'Gerente Operativo', 'El Paso', '2022-06-01', 'fijo', true, '2022-06-01'
) ON CONFLICT DO NOTHING;
-- Contract for 22532974
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'ff6832d9-0141-4d5c-8409-255472011b19', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-06-01', 8831042, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 8496329
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'a376897e-bdc7-4668-ac71-0632bde095c4', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2019-11-05', 'fijo', true, '2019-11-05'
) ON CONFLICT DO NOTHING;
-- Contract for 8496329
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'a376897e-bdc7-4668-ac71-0632bde095c4', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-11-05', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 12203592
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '96d205da-c908-4b02-8e92-a2355f4a29d7', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'ccf52248-07cb-4938-aaab-e9fd2aef4fae', 'Subcheff', 'El Paso', '2022-11-18', 'fijo', true, '2022-11-18'
) ON CONFLICT DO NOTHING;
-- Contract for 12203592
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '96d205da-c908-4b02-8e92-a2355f4a29d7', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-11-18', 6347664, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 5166055
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c783a071-6f67-4efa-ac23-1eda60e61d1f', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'c8b5c2e2-6753-46a3-a728-d01e1bb5d479', 'Porcionador', 'El Paso', '2022-01-06', 'fijo', true, '2022-01-06'
) ON CONFLICT DO NOTHING;
-- Contract for 5166055
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c783a071-6f67-4efa-ac23-1eda60e61d1f', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-01-06', 2064725, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1063960167
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'aa5ba123-2304-4404-9201-395f0454f3cc', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2021-04-21', 'fijo', true, '2021-04-21'
) ON CONFLICT DO NOTHING;
-- Contract for 1063960167
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'aa5ba123-2304-4404-9201-395f0454f3cc', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-04-21', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003427309
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e85c7680-a90e-4577-b9d0-4843c2365986', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b1aca022-95e2-45f8-bad0-278a6ee7a8ad', 'babb0326-dd40-4180-b9d3-833d2b79263f', 'Conductor', 'El Paso', '2017-09-28', 'fijo', true, '2017-09-28'
) ON CONFLICT DO NOTHING;
-- Contract for 1003427309
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e85c7680-a90e-4577-b9d0-4843c2365986', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2017-09-28', 2186572, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1067724597
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '90264038-c516-4457-8eec-a51ae84eb41a', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '242b0070-5d1e-492c-8264-4bbd9b0a6929', 'b3b6cbe1-1246-4dfd-b900-5a8d3e305b71', 'Cajera', 'El Paso', '2022-10-12', 'fijo', true, '2022-10-12'
) ON CONFLICT DO NOTHING;
-- Contract for 1067724597
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '90264038-c516-4457-8eec-a51ae84eb41a', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-10-12', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003241247
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '4a0f67c5-36f9-4aa3-8db4-ca77290cc633', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2021-02-24', 'fijo', true, '2021-02-24'
) ON CONFLICT DO NOTHING;
-- Contract for 1003241247
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '4a0f67c5-36f9-4aa3-8db4-ca77290cc633', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-02-24', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 36562740
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '5a0ca9eb-946e-4c6f-a4ad-3bd5ab1d3dec', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 36562740
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '5a0ca9eb-946e-4c6f-a4ad-3bd5ab1d3dec', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003428537
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'a3b07188-5e78-4cb0-81ae-333102fd8405', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '242b0070-5d1e-492c-8264-4bbd9b0a6929', 'b3b6cbe1-1246-4dfd-b900-5a8d3e305b71', 'Cajera', 'El Paso', '2023-01-07', 'fijo', true, '2023-01-07'
) ON CONFLICT DO NOTHING;
-- Contract for 1003428537
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'a3b07188-5e78-4cb0-81ae-333102fd8405', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-01-07', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 19706896
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'cd6cb452-444c-4ce0-aaed-8a554f6ccc17', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2018-10-04', 'fijo', true, '2018-10-04'
) ON CONFLICT DO NOTHING;
-- Contract for 19706896
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'cd6cb452-444c-4ce0-aaed-8a554f6ccc17', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2018-10-04', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 63448617
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '1f21c51e-d27b-4f47-9397-32978ccc47c8', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '55616c11-7b52-4ea9-8242-8da2ec9708e4', '20aa7185-fcbd-45c8-bebd-ee5e2f55a74d', 'Jefe Hseq', 'El Paso', '2018-01-22', 'indefinido', true, '2018-01-22'
) ON CONFLICT DO NOTHING;
-- Contract for 63448617
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '1f21c51e-d27b-4f47-9397-32978ccc47c8', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2018-01-22', 5426039, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 49779186
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '74de5e59-9659-4933-9778-2b81df73fbe0', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2016-11-21', 'fijo', true, '2016-11-21'
) ON CONFLICT DO NOTHING;
-- Contract for 49779186
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '74de5e59-9659-4933-9778-2b81df73fbe0', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-11-21', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 7571393
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '5dc3315f-63d6-4cf6-944a-c6858501e1c1', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 7571393
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '5dc3315f-63d6-4cf6-944a-c6858501e1c1', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 49773419
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '8f6fdf7a-fb09-4787-95ed-8e12f4a07c87', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', '0fc87688-921b-42ee-be49-808fe46799a6', 'Supervisor De Servicios', 'El Paso', '2016-09-30', 'fijo', true, '2016-09-30'
) ON CONFLICT DO NOTHING;
-- Contract for 49773419
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '8f6fdf7a-fb09-4787-95ed-8e12f4a07c87', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-09-30', 3907494, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 36593050
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'a1ec7afc-2203-4f19-9b00-6f6d0474e97d', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2016-10-06', 'fijo', true, '2016-10-06'
) ON CONFLICT DO NOTHING;
-- Contract for 36593050
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'a1ec7afc-2203-4f19-9b00-6f6d0474e97d', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-06', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1085176275
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '88bf85e0-5fc3-41bc-88f6-4a401e39d17a', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1085176275
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '88bf85e0-5fc3-41bc-88f6-4a401e39d17a', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 17972782
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '0ccb1b1d-cc6f-4cfd-95c3-b2f42e3184a7', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'e39ba735-b118-4466-9d60-b7d90f1119fe', 'Cocinero 2', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 17972782
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '0ccb1b1d-cc6f-4cfd-95c3-b2f42e3184a7', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 3315122, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77040385
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '69841093-f581-46d8-9d48-33442faab4ca', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'c8b5c2e2-6753-46a3-a728-d01e1bb5d479', 'Porcionador', 'El Paso', '2016-09-29', 'fijo', true, '2016-09-29'
) ON CONFLICT DO NOTHING;
-- Contract for 77040385
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '69841093-f581-46d8-9d48-33442faab4ca', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-09-29', 2064725, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1067812338
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '5ffe6392-da58-4ef1-888d-27861b6d7aab', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '11949ee9-276e-40c0-8152-03282d7cab34', 'f84142f8-1f41-45ec-80de-ae9a09dc8aa8', 'Auxiliar De Casa Hielo', 'El Paso', '2016-10-06', 'fijo', true, '2016-10-06'
) ON CONFLICT DO NOTHING;
-- Contract for 1067812338
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '5ffe6392-da58-4ef1-888d-27861b6d7aab', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-06', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065633715
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e98e5f4d-3845-4ba1-bc21-503b911419ff', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2023-08-28', 'fijo', true, '2023-08-28'
) ON CONFLICT DO NOTHING;
-- Contract for 1065633715
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e98e5f4d-3845-4ba1-bc21-503b911419ff', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-08-28', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1068348535
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '6782de7d-6000-4446-9592-c2389fbf340c', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '9621a918-9474-4a2b-9f9a-195018024464', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2023-08-28', 'fijo', true, '2023-08-28'
) ON CONFLICT DO NOTHING;
-- Contract for 1068348535
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '6782de7d-6000-4446-9592-c2389fbf340c', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-08-28', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1122411028
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'aea7b009-44da-43b2-8723-a8546cf7c4a7', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2023-08-28', 'fijo', true, '2023-08-28'
) ON CONFLICT DO NOTHING;
-- Contract for 1122411028
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'aea7b009-44da-43b2-8723-a8546cf7c4a7', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-08-28', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1004306076
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'aae6bb95-0cff-46b0-a1bf-e36ea63e469b', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '55616c11-7b52-4ea9-8242-8da2ec9708e4', '0c91e44a-1302-4c46-81e6-9be232d00dd6', 'Aprendiz Sena Productiva', 'El Paso', '2023-11-02', 'aprendizaje', true, '2023-11-02'
) ON CONFLICT DO NOTHING;
-- Contract for 1004306076
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'aae6bb95-0cff-46b0-a1bf-e36ea63e469b', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DE APRENDIZAJE', '2023-11-02', 1160000, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1004306076
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'aae6bb95-0cff-46b0-a1bf-e36ea63e469b', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2024-12-21', 'fijo', true, '2024-12-21'
) ON CONFLICT DO NOTHING;
-- Contract for 1004306076
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'aae6bb95-0cff-46b0-a1bf-e36ea63e469b', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-12-21', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1066001278
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '63fa1bf1-aa88-48db-89ac-cf4a7b6c4ef8', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2026-01-16', 'fijo', true, '2026-01-16'
) ON CONFLICT DO NOTHING;
-- Contract for 1066001278
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '63fa1bf1-aa88-48db-89ac-cf4a7b6c4ef8', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2026-01-16', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 12435483
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '6a15471a-bc87-4409-ba1d-d797eae3a74c', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b1aca022-95e2-45f8-bad0-278a6ee7a8ad', 'babb0326-dd40-4180-b9d3-833d2b79263f', 'Conductor', 'El Paso', '2023-11-17', 'fijo', true, '2023-11-17'
) ON CONFLICT DO NOTHING;
-- Contract for 12435483
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '6a15471a-bc87-4409-ba1d-d797eae3a74c', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-11-17', 1962935, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003122827
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c4dd3705-e62b-42ef-ba35-8778a7f25057', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '11949ee9-276e-40c0-8152-03282d7cab34', 'f84142f8-1f41-45ec-80de-ae9a09dc8aa8', 'Auxiliar De Casa Hielo', 'El Paso', '2024-06-04', 'fijo', true, '2024-06-04'
) ON CONFLICT DO NOTHING;
-- Contract for 1003122827
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c4dd3705-e62b-42ef-ba35-8778a7f25057', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-06-04', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

