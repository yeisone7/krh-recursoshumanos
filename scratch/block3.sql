-- Work Info for 1062810978
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '32ab5ba2-7515-4ade-9c1b-5d4e8c6bdb56', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', 'e308222c-8624-456e-bf7f-ce1bdc0e8103', 'Auxiliar De Bodega', 'El Paso', '2021-09-17', 'fijo', true, '2021-09-17'
) ON CONFLICT DO NOTHING;
-- Contract for 1062810978
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '32ab5ba2-7515-4ade-9c1b-5d4e8c6bdb56', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-09-17', 1755142, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065580413
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '8e6f728c-59cf-42de-bcaf-3e3c64fc9905', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', 'e308222c-8624-456e-bf7f-ce1bdc0e8103', 'Auxiliar De Bodega', 'El Paso', '2016-09-28', 'fijo', true, '2016-09-28'
) ON CONFLICT DO NOTHING;
-- Contract for 1065580413
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '8e6f728c-59cf-42de-bcaf-3e3c64fc9905', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-09-28', 1755142, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 7573143
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'b47449b1-ac08-4254-8983-54f79041bec6', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b1aca022-95e2-45f8-bad0-278a6ee7a8ad', 'babb0326-dd40-4180-b9d3-833d2b79263f', 'Conductor', 'El Paso', '2016-10-19', 'fijo', true, '2016-10-19'
) ON CONFLICT DO NOTHING;
-- Contract for 7573143
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'b47449b1-ac08-4254-8983-54f79041bec6', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-19', 1962935, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 72276639
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '459c9abe-3e78-46b0-9f34-b3938bd15794', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'e4f04700-562f-4530-98cb-885b4f0588ac', '1b83641b-7967-4a41-b4f3-e9d2e8d4b06b', 'Jefe De Recursos Humanos', 'El Paso', '2021-09-30', 'indefinido', true, '2021-09-30'
) ON CONFLICT DO NOTHING;
-- Contract for 72276639
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '459c9abe-3e78-46b0-9f34-b3938bd15794', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2021-09-30', 5805844, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065625431
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '72e84c12-33de-484c-a180-0f13e8d858dc', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '58d469c1-02e8-4772-bd7e-11babc0a4d2b', 'b3b6cbe1-1246-4dfd-b900-5a8d3e305b71', 'Cajera', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1065625431
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '72e84c12-33de-484c-a180-0f13e8d858dc', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003038261
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '4da75289-c338-4ca8-a63c-6de0158759ff', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '7172e957-a60e-4b77-93c3-de9bf2037187', '705e554c-0f29-453a-8578-247bdd451ba7', 'Analista De Informacion', 'El Paso', '2019-01-30', 'fijo', true, '2019-01-30'
) ON CONFLICT DO NOTHING;
-- Contract for 1003038261
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '4da75289-c338-4ca8-a63c-6de0158759ff', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-01-30', 2234704, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1062907621
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'a0c843ad-2f04-4d1a-b831-c55b7b9929b0', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2021-06-11', 'fijo', true, '2021-06-11'
) ON CONFLICT DO NOTHING;
-- Contract for 1062907621
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'a0c843ad-2f04-4d1a-b831-c55b7b9929b0', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-06-11', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 17977078
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '79163085-6ef3-4b09-8f20-1ee986db4b8e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', '3485cd0f-133b-4a78-9958-f0de1a104c70', 'Cocinero 1', 'El Paso', '2019-12-23', 'fijo', true, '2019-12-23'
) ON CONFLICT DO NOTHING;
-- Contract for 17977078
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '79163085-6ef3-4b09-8f20-1ee986db4b8e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-12-23', 3926283, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064798199
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '29f35329-89a2-459e-9427-35ab5166a001', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', 'e308222c-8624-456e-bf7f-ce1bdc0e8103', 'Auxiliar De Bodega', 'El Paso', '2021-03-19', 'fijo', true, '2021-03-19'
) ON CONFLICT DO NOTHING;
-- Contract for 1064798199
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '29f35329-89a2-459e-9427-35ab5166a001', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-03-19', 1755142, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 72227122
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '74da7013-1d69-45f4-8ea8-2aee3f0212b7', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'db158692-ce3b-4aff-ba6f-a92ecae7542c', 'Coordinador De Eventos', 'El Paso', '2022-03-21', 'indefinido', true, '2022-03-21'
) ON CONFLICT DO NOTHING;
-- Contract for 72227122
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '74da7013-1d69-45f4-8ea8-2aee3f0212b7', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2022-03-21', 6442637, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 36573899
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'cde7b727-7056-4544-88b5-19bf11d3c5ae', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '9621a918-9474-4a2b-9f9a-195018024464', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2019-10-08', 'fijo', true, '2019-10-08'
) ON CONFLICT DO NOTHING;
-- Contract for 36573899
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'cde7b727-7056-4544-88b5-19bf11d3c5ae', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-10-08', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1001094469
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '7a83fa94-27e1-452a-8a58-b1fa0d91272e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '242b0070-5d1e-492c-8264-4bbd9b0a6929', 'b3b6cbe1-1246-4dfd-b900-5a8d3e305b71', 'Cajera', 'El Paso', '2023-06-06', 'fijo', true, '2023-06-06'
) ON CONFLICT DO NOTHING;
-- Contract for 1001094469
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '7a83fa94-27e1-452a-8a58-b1fa0d91272e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-06-06', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064791541
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '334f4625-e538-4d8e-9f35-363528960aec', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '2df5bafa-6944-4736-ba05-d0686b703911', 'e69185bd-527f-4b68-bf94-eadcd3b1616d', 'Tecnico De Mantenimiento', 'El Paso', '2025-09-25', 'obra_labor', true, '2025-09-25'
) ON CONFLICT DO NOTHING;
-- Contract for 1064791541
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '334f4625-e538-4d8e-9f35-363528960aec', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO POR OBRA O LABOR DETERMINADA', '2025-09-25', 2477669, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1014218702
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '2e010b6f-3dd0-4310-9098-baf2223d0380', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '9621a918-9474-4a2b-9f9a-195018024464', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2019-01-03', 'fijo', true, '2019-01-03'
) ON CONFLICT DO NOTHING;
-- Contract for 1014218702
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '2e010b6f-3dd0-4310-9098-baf2223d0380', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-01-03', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003334311
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'de6c1ddd-f96f-4e6a-90a7-0496bf5ad2a1', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b1aca022-95e2-45f8-bad0-278a6ee7a8ad', 'babb0326-dd40-4180-b9d3-833d2b79263f', 'Conductor', 'El Paso', '2022-11-29', 'fijo', true, '2022-11-29'
) ON CONFLICT DO NOTHING;
-- Contract for 1003334311
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'de6c1ddd-f96f-4e6a-90a7-0496bf5ad2a1', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-11-29', 1962935, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1007246368
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '13e33ade-eed5-4f04-90d9-37dcf3104b57', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', '0fc87688-921b-42ee-be49-808fe46799a6', 'Supervisor De Servicios', 'El Paso', '2016-10-11', 'fijo', true, '2016-10-11'
) ON CONFLICT DO NOTHING;
-- Contract for 1007246368
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '13e33ade-eed5-4f04-90d9-37dcf3104b57', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-11', 3907494, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1004178981
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '3703f903-ed32-419c-9f83-953211d3e3d6', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b1aca022-95e2-45f8-bad0-278a6ee7a8ad', 'babb0326-dd40-4180-b9d3-833d2b79263f', 'Conductor', 'El Paso', '2021-03-01', 'fijo', true, '2021-03-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1004178981
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '3703f903-ed32-419c-9f83-953211d3e3d6', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-03-01', 2186572, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1063493701
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e4c844cf-d70f-417a-953f-1f2fc6270eb8', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2021-02-03', 'fijo', true, '2021-02-03'
) ON CONFLICT DO NOTHING;
-- Contract for 1063493701
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e4c844cf-d70f-417a-953f-1f2fc6270eb8', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-02-03', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065563965
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '778a78af-5623-49ce-bb39-7cc5d0419c0a', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2019-12-16', 'fijo', true, '2019-12-16'
) ON CONFLICT DO NOTHING;
-- Contract for 1065563965
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '778a78af-5623-49ce-bb39-7cc5d0419c0a', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-12-16', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1066000582
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '7ae693ec-eac7-4e4b-aeb5-e45a13e8ed47', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2021-10-01', 'fijo', true, '2021-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1066000582
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '7ae693ec-eac7-4e4b-aeb5-e45a13e8ed47', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1098658093
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'd47b9b77-8795-4723-8af6-a517254c4db6', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd9609516-2c88-4373-ab3f-55e945ea4864', '86d8df26-b7d3-420b-8af8-b36f79549deb', 'Profesional De Nomina', 'El Paso', '2017-02-02', 'indefinido', true, '2017-02-02'
) ON CONFLICT DO NOTHING;
-- Contract for 1098658093
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'd47b9b77-8795-4723-8af6-a517254c4db6', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2017-02-02', 3000000, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 8865826
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '662323b9-e70e-4353-8ee9-b1db0faafe8c', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2021-03-19', 'fijo', true, '2021-03-19'
) ON CONFLICT DO NOTHING;
-- Contract for 8865826
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '662323b9-e70e-4353-8ee9-b1db0faafe8c', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-03-19', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 17975261
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'b1c0ed9d-d4f8-4be2-a0a0-9020c55c2117', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2019-04-29', 'fijo', true, '2019-04-29'
) ON CONFLICT DO NOTHING;
-- Contract for 17975261
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'b1c0ed9d-d4f8-4be2-a0a0-9020c55c2117', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-04-29', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 49670472
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'db042ec0-983c-4e53-b006-863e51fa5f8e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '7172e957-a60e-4b77-93c3-de9bf2037187', '705e554c-0f29-453a-8578-247bdd451ba7', 'Analista De Informacion', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 49670472
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'db042ec0-983c-4e53-b006-863e51fa5f8e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 2234704, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1090379252
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'd3ee6cc0-b5db-4a93-845b-29c55da81770', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '58d469c1-02e8-4772-bd7e-11babc0a4d2b', 'b3b6cbe1-1246-4dfd-b900-5a8d3e305b71', 'Cajera', 'El Paso', '2024-01-22', 'fijo', true, '2024-01-22'
) ON CONFLICT DO NOTHING;
-- Contract for 1090379252
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'd3ee6cc0-b5db-4a93-845b-29c55da81770', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2024-01-22', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 51936335
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'aef5befb-785a-4117-9327-b8e7f139433e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'c862f6b2-2695-4f6d-82d8-7ad92c3b28ad', 'f82cafe1-0d03-4e25-ae44-4e2e9d9ffa07', 'Gerente Operativo', 'El Paso', '2016-10-11', 'indefinido', true, '2016-10-11'
) ON CONFLICT DO NOTHING;
-- Contract for 51936335
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'aef5befb-785a-4117-9327-b8e7f139433e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2016-10-11', 10066618, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1095908463
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '20664e23-495e-4391-8a9d-8628ad82bed0', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'd9609516-2c88-4373-ab3f-55e945ea4864', '81a115a8-e53c-4122-bea7-660c150c5328', 'Gestor De Compras', 'El Paso', '2018-03-07', 'indefinido', true, '2018-03-07'
) ON CONFLICT DO NOTHING;
-- Contract for 1095908463
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '20664e23-495e-4391-8a9d-8628ad82bed0', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2018-03-07', 6000000, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 91326148
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '60943ba8-f40f-45df-a6e4-d938acef0e7d', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '11949ee9-276e-40c0-8152-03282d7cab34', '05cf908d-da6b-4e17-9317-56eeb2944709', 'Supervisor De Campo', 'El Paso', '2018-02-11', 'indefinido', true, '2018-02-11'
) ON CONFLICT DO NOTHING;
-- Contract for 91326148
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '60943ba8-f40f-45df-a6e4-d938acef0e7d', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2018-02-11', 5028624, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 36642477
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'a436c76c-8ab8-467f-9d98-52f79750fd10', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2022-11-09', 'fijo', true, '2022-11-09'
) ON CONFLICT DO NOTHING;
-- Contract for 36642477
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'a436c76c-8ab8-467f-9d98-52f79750fd10', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-11-09', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 57117190
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'cec4893e-d30d-4887-a4eb-f7fe0c4e8ac2', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', '0fc87688-921b-42ee-be49-808fe46799a6', 'Supervisor De Servicios', 'El Paso', '2016-10-04', 'fijo', true, '2016-10-04'
) ON CONFLICT DO NOTHING;
-- Contract for 57117190
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'cec4893e-d30d-4887-a4eb-f7fe0c4e8ac2', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-04', 3907494, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065608505
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'edfaa431-5bd9-4dc3-a264-c0216109cdea', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2021-03-30', 'fijo', true, '2021-03-30'
) ON CONFLICT DO NOTHING;
-- Contract for 1065608505
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'edfaa431-5bd9-4dc3-a264-c0216109cdea', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-03-30', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003173233
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'f9237e1f-8a9d-4236-a4cb-5e4613889edd', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2022-04-13', 'fijo', true, '2022-04-13'
) ON CONFLICT DO NOTHING;
-- Contract for 1003173233
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'f9237e1f-8a9d-4236-a4cb-5e4613889edd', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-04-13', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1007347179
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e51d2a34-c79a-42ec-9d37-282129702cdf', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2019-10-08', 'fijo', true, '2019-10-08'
) ON CONFLICT DO NOTHING;
-- Contract for 1007347179
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e51d2a34-c79a-42ec-9d37-282129702cdf', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-10-08', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 12569170
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '42bae615-f920-46ea-a08b-b933dc9ee8bd', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2023-08-11', 'fijo', true, '2023-08-11'
) ON CONFLICT DO NOTHING;
-- Contract for 12569170
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '42bae615-f920-46ea-a08b-b933dc9ee8bd', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-08-11', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77033858
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '566578d0-103d-4e9d-baee-5a5a49e0f697', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', '84978563-8633-4d99-92f7-eb90aae326e1', 'Panadero', 'El Paso', '2026-03-12', 'fijo', true, '2026-03-12'
) ON CONFLICT DO NOTHING;
-- Contract for 77033858
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '566578d0-103d-4e9d-baee-5a5a49e0f697', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2026-03-12', 4106776, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77154831
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e3e3ae7e-80ff-4a50-8171-a5b4385e44e6', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'c8b5c2e2-6753-46a3-a728-d01e1bb5d479', 'Porcionador', 'El Paso', '2019-11-27', 'fijo', true, '2019-11-27'
) ON CONFLICT DO NOTHING;
-- Contract for 77154831
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e3e3ae7e-80ff-4a50-8171-a5b4385e44e6', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-11-27', 2064725, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1112464360
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '07f4b3cf-7d9c-4b03-b9f4-089085c458b2', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2022-10-07', 'fijo', true, '2022-10-07'
) ON CONFLICT DO NOTHING;
-- Contract for 1112464360
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '07f4b3cf-7d9c-4b03-b9f4-089085c458b2', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-10-07', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1193597751
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'b05fdc3c-0d53-438a-9ed7-0fdcb945fc11', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2023-07-26', 'fijo', true, '2023-07-26'
) ON CONFLICT DO NOTHING;
-- Contract for 1193597751
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'b05fdc3c-0d53-438a-9ed7-0fdcb945fc11', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-07-26', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1082243084
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c8e5d038-28b6-4c94-b97b-f9f3d6176065', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', '73f2e376-db87-46f7-bb9a-79dd17618fb7', 'Coordinador De Bodega', 'El Paso', '2016-10-01', 'indefinido', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1082243084
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c8e5d038-28b6-4c94-b97b-f9f3d6176065', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO DIRECCIÓN CONFIANZA Y MANEJO', '2016-10-01', 3926933, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 47436139
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'ca7c922a-ab1f-47a2-9385-efd60494d415', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2021-11-18', 'fijo', true, '2021-11-18'
) ON CONFLICT DO NOTHING;
-- Contract for 47436139
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'ca7c922a-ab1f-47a2-9385-efd60494d415', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-11-18', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1003166568
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '8f8a77d8-a9de-443c-a4bc-e7a88b410cda', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2021-04-12', 'fijo', true, '2021-04-12'
) ON CONFLICT DO NOTHING;
-- Contract for 1003166568
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '8f8a77d8-a9de-443c-a4bc-e7a88b410cda', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-04-12', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 15174175
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '908350a4-d649-4a2b-b7ad-3df388105761', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '9621a918-9474-4a2b-9f9a-195018024464', 'e554e7b6-e335-42e4-a5a3-37df97889f56', 'Coordinador De Alimentos', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 15174175
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '908350a4-d649-4a2b-b7ad-3df388105761', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 2186572, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1064112407
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '4fadfdc6-8a21-45db-b09a-be5c5b897bbf', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '65849fcf-0eae-417e-bb37-29747dd00de5', 'e308222c-8624-456e-bf7f-ce1bdc0e8103', 'Auxiliar De Bodega', 'El Paso', '2019-10-08', 'fijo', true, '2019-10-08'
) ON CONFLICT DO NOTHING;
-- Contract for 1064112407
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '4fadfdc6-8a21-45db-b09a-be5c5b897bbf', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-10-08', 1755142, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065996850
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'd438e9bf-6922-48ee-96e6-9df33f38ec38', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2021-10-01', 'fijo', true, '2021-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1065996850
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'd438e9bf-6922-48ee-96e6-9df33f38ec38', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1128188516
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '0c1561c8-62d3-421d-b3fa-e66a6212cfe7', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1128188516
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '0c1561c8-62d3-421d-b3fa-e66a6212cfe7', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 7574510
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '7755d782-40e2-4820-afe8-ed2fa73bb9ef', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'e39ba735-b118-4466-9d60-b7d90f1119fe', 'Cocinero 2', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 7574510
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '7755d782-40e2-4820-afe8-ed2fa73bb9ef', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 2410525, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065982747
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '0fefdfbd-0ffa-464e-8d50-97cfeb471543', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2022-11-09', 'fijo', true, '2022-11-09'
) ON CONFLICT DO NOTHING;
-- Contract for 1065982747
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '0fefdfbd-0ffa-464e-8d50-97cfeb471543', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-11-09', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77146863
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'c2ccb256-e87a-4e33-88cd-ae38025484f0', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2016-10-05', 'fijo', true, '2016-10-05'
) ON CONFLICT DO NOTHING;
-- Contract for 77146863
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'c2ccb256-e87a-4e33-88cd-ae38025484f0', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-05', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 18974703
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'bbcb02c7-3de6-425f-94d0-e87f89592fd0', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2022-05-20', 'fijo', true, '2022-05-20'
) ON CONFLICT DO NOTHING;
-- Contract for 18974703
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'bbcb02c7-3de6-425f-94d0-e87f89592fd0', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2022-05-20', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065985417
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '2c3faf37-88d6-469e-af86-c64de971ec5a', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '58d469c1-02e8-4772-bd7e-11babc0a4d2b', 'b3b6cbe1-1246-4dfd-b900-5a8d3e305b71', 'Cajera', 'El Paso', '2019-09-27', 'fijo', true, '2019-09-27'
) ON CONFLICT DO NOTHING;
-- Contract for 1065985417
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '2c3faf37-88d6-469e-af86-c64de971ec5a', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-09-27', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1065609480
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '6a8ed55d-a323-427c-b4ee-a126afcc8003', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2019-10-16', 'fijo', true, '2019-10-16'
) ON CONFLICT DO NOTHING;
-- Contract for 1065609480
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '6a8ed55d-a323-427c-b4ee-a126afcc8003', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-10-16', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 49757761
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '9257aac5-77ed-4bb9-b677-0273f85bed12', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', 'a0a2dbe6-3ec1-4d4e-aa2a-642ce2415bc1', 'Mesero', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 49757761
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '9257aac5-77ed-4bb9-b677-0273f85bed12', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 7601393
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '0f0823a1-57ca-40a5-8a71-b4be14bad16f', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', 'ccf52248-07cb-4938-aaab-e9fd2aef4fae', 'Subcheff', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 7601393
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '0f0823a1-57ca-40a5-8a71-b4be14bad16f', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 6347664, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77161928
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '89b1f031-aff6-461d-8fd6-c51ced001099', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '683e3b55-1928-4402-857a-2fa833f7c3ca', 'f76a6142-dff0-4ffe-838a-5d4d26fd7e27', 'Steward Y Aseo', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 77161928
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '89b1f031-aff6-461d-8fd6-c51ced001099', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 40801513
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '7e28b61b-8247-42e7-8c1c-e3355a3c837e', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', '5b241781-72a8-43b8-bbc2-eab7bad88308', 'Auxiliar De Cocina A&b', 'El Paso', '2016-10-05', 'fijo', true, '2016-10-05'
) ON CONFLICT DO NOTHING;
-- Contract for 40801513
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '7e28b61b-8247-42e7-8c1c-e3355a3c837e', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-05', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1007218182
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '144d5d62-8e53-4cb1-a0e6-210adb0b8ed2', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '11949ee9-276e-40c0-8152-03282d7cab34', 'f84142f8-1f41-45ec-80de-ae9a09dc8aa8', 'Auxiliar De Casa Hielo', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1007218182
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '144d5d62-8e53-4cb1-a0e6-210adb0b8ed2', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1047354471
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'e2561304-d607-4f3f-b48f-7622d888f703', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b1aca022-95e2-45f8-bad0-278a6ee7a8ad', 'babb0326-dd40-4180-b9d3-833d2b79263f', 'Conductor', 'El Paso', '2023-02-10', 'fijo', true, '2023-02-10'
) ON CONFLICT DO NOTHING;
-- Contract for 1047354471
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'e2561304-d607-4f3f-b48f-7622d888f703', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2023-02-10', 1962935, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 77031790
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '0c4e1d62-2569-41d1-bc8e-bc8db1322473', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'f476b570-49b6-41dc-b1f6-287b632f9138', '84978563-8633-4d99-92f7-eb90aae326e1', 'Panadero', 'El Paso', '2019-11-27', 'fijo', true, '2019-11-27'
) ON CONFLICT DO NOTHING;
-- Contract for 77031790
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '0c4e1d62-2569-41d1-bc8e-bc8db1322473', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2019-11-27', 3907494, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1121041957
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    '80e15de3-c8f9-4a54-8dea-7e2c2ca5ca05', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', '9621a918-9474-4a2b-9f9a-195018024464', 'd57640da-59e8-4f5d-870a-3341a3089d87', 'Auxiliar De Cocina', 'El Paso', '2021-03-30', 'fijo', true, '2021-03-30'
) ON CONFLICT DO NOTHING;
-- Contract for 1121041957
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    '80e15de3-c8f9-4a54-8dea-7e2c2ca5ca05', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2021-03-30', 1750905, 'El Paso', false
) ON CONFLICT DO NOTHING;

-- Work Info for 1062814887
INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, cost_center, area_id, position_id, position_name, work_city, hire_date, link_type, is_current, valid_from
) VALUES (
    'bc91bd48-6103-440e-9846-52cce542929c', '11a12ece-a130-4682-9a8a-cba4325dadf0', '19bb0ca6-6bc4-4619-8179-5575d4caebc5', 'Campos', 'b7ecc41f-6012-41e4-9aab-2dccca52fb11', '0fc87688-921b-42ee-be49-808fe46799a6', 'Supervisor De Servicios', 'El Paso', '2016-10-01', 'fijo', true, '2016-10-01'
) ON CONFLICT DO NOTHING;
-- Contract for 1062814887
INSERT INTO public.contracts (
    employee_id, company_id, contract_type, start_date, salary, work_city, is_terminated
) VALUES (
    'bc91bd48-6103-440e-9846-52cce542929c', '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CONTRATO A TERMINO FIJO INFERIOR A UN AÑO', '2016-10-01', 3907494, 'El Paso', false
) ON CONFLICT DO NOTHING;

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

