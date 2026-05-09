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

