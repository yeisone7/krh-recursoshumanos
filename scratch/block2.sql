-- MIGRATION BLOCK 2: EMPLOYEES (IDENTITY)

INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1062810978', 'Becerril', '2012-02-20',
        'Hector', 'Luis', 'Acosta', 'Urueta',
        'Colombia', 'Cesar', 'Becerril', '1993-08-10',
        'M', 'A+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065580413', 'Valledupar', '2005-02-23',
        'Angel', NULL, 'Acuña', 'De La Cruz',
        'Colombia', 'Cesar', 'Valledupar', '1987-02-03',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '7573143', 'Valledupar', '2001-07-09',
        'Jair', 'Alfonso', 'Agamez', 'Castro',
        'Colombia', 'Cesar', 'Valledupar', '1983-02-16',
        'M', 'O-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '72276639', 'Barranquilla', '2001-02-22',
        'Nolasco', 'Enrique', 'Alvarez', 'Varela',
        'Colombia', 'Atlántico', 'Barranquilla', '1983-02-14',
        'M', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065625431', 'Valledupar', '2009-02-20',
        'Yulieth', 'Esmith', 'Araujo', 'Gutierrez',
        'Colombia', 'Cesar', 'Valledupar', '1991-01-01',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003038261', 'La Jagua De Ibirico', '2015-03-11',
        'Anderson', 'Junior', 'Arevalo', 'Parra',
        'Colombia', 'Cesar', 'Becerril', '1997-03-10',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1062907621', 'Pelaya', '2008-06-09',
        'Ana', 'Leonor', 'Arias', 'Pacheco',
        'Colombia', 'Cesar', 'Pelaya', '1990-03-19',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '17977078', 'Villanueva', '2002-04-15',
        'Jean', 'Carlos', 'Baldovino', 'Lago',
        'Colombia', 'La Guajira', 'Villanueva', '1982-08-26',
        'M', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064798199', 'Chiriguaná', '2012-05-10',
        'Eyvier', 'Alfonso', 'Baños', 'Ochoa',
        'Colombia', 'Cesar', 'Chiriguaná', '1993-09-16',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '72227122', 'Barranquilla', '1995-04-04',
        'Ruben', 'Dario', 'Barrera', 'Galofre',
        'Colombia', 'Atlántico', 'Barranquilla', '1976-12-17',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '36573899', 'La Jagua De Ibirico', '2003-01-24',
        'Yasmine', 'Patricia', 'Barrios', 'Vasquez',
        'Colombia', 'Cesar', 'La Jagua De Ibirico', '1984-12-16',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1001094469', 'El Paso', '2021-01-13',
        'Melany', 'De Jesus', 'Barros', 'Garcia',
        'Colombia', 'Cundinamarca', 'Bogotá, D.c.', '2003-01-09',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064791541', 'Chiriguaná', '2008-01-04',
        'Luis', 'Carlos', 'Basto', 'Difilippo',
        'Colombia', 'Cesar', 'Chiriguaná', '1989-12-08',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1014218702', 'Bogotá, D.c.', '2009-02-04',
        'Martha', 'Liliana', 'Bayona', 'Iseda',
        'Colombia', 'Cesar', 'San Diego', '1991-01-27',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003334311', 'La Jagua De Ibirico', '2014-12-23',
        'Luis', 'Eduardo', 'Benavides', 'Oliveras',
        'Colombia', 'Cesar', 'Tamalameque', '1996-08-16',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1007246368', 'Chimichagua', '2008-01-11',
        'Luis', 'Eduardo', 'Cadena', 'Navarro',
        'Colombia', 'Cesar', 'Chimichagua', '1989-09-18',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1004178981', 'Nueva Granada', '2010-02-05',
        'Juan', 'Camilo', 'Cardona', 'Peña',
        'Colombia', 'Magdalena', 'Plato', '1992-02-04',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1063493701', 'Chimichagua', '2014-03-31',
        'Daniel', 'Jose', 'Carreño', 'Canoles',
        'Colombia', 'Cesar', 'El Copey', '1996-01-22',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065563965', 'Valledupar', '2003-12-17',
        'Daniellys', NULL, 'Carrillo', 'Contreras',
        'Colombia', 'Cesar', 'Becerril', '1985-10-20',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1066000582', 'El Paso', '2016-01-27',
        'Jose', 'Armando', 'Contreras', 'De Alba',
        'Colombia', 'Cesar', 'El Copey', '1997-09-19',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1098658093', 'Bucaramanga', '2006-09-11',
        'Wilmar', NULL, 'Corzo', 'Castro',
        'Colombia', 'Santander', 'Bucaramanga', '1988-09-09',
        'M', 'B+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '8865826', 'Magangué', '2002-06-21',
        'Luis', 'Carlos', 'Cuadrado', 'Cantillo',
        'Colombia', 'Atlántico', 'Barranquilla', '1984-02-14',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '17975261', 'Villanueva', '1994-06-20',
        'Eduar', 'Enrique', 'Diaz', NULL,
        'Colombia', 'La Guajira', 'Villanueva', '1972-07-19',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '49670472', 'Aguachica', '2001-01-10',
        'Sandy', NULL, 'Diaz', 'Armenta',
        'Colombia', 'Santander', 'Bucaramanga', '1982-10-07',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1090379252', 'Cúcuta', '2005-04-05',
        'Elizabeth', NULL, 'Donado', 'Hernandez',
        'Colombia', 'Cesar', 'La Jagua De Ibirico', '1986-12-08',
        'F', 'A-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '51936335', 'Bogotá, D.c.', '1987-06-15',
        'Idelma', 'Maria', 'Duarte', 'Cantillo',
        'Colombia', 'La Guajira', 'Barrancas', '1968-09-12',
        'F', 'B+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1095908463', 'Girón', '2004-10-11',
        'Boris', NULL, 'Duran', 'Afanador',
        'Colombia', 'Santander', 'San Gil', '1986-09-23',
        'M', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '91326148', 'Puerto Wilches', '2001-05-23',
        'Yeison', NULL, 'Escobar', 'Arias',
        'Colombia', 'Santander', 'Puerto Wilches', '1982-08-24',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '36642477', 'Guamal', '2002-10-10',
        'Martha', 'Isabel', 'Escobar', 'Castro',
        'Colombia', 'Magdalena', 'Guamal', '1993-07-29',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '57117190', 'Chibolo', '1999-09-30',
        'Katy', 'Ladys', 'Escobar', 'Rojano',
        'Colombia', 'Magdalena', 'Chibolo', '1981-04-09',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065608505', 'Valledupar', '2007-08-14',
        'Luis', 'Alfonso', 'Espeleta', 'Molina',
        'Colombia', 'Cesar', 'Valledupar', '1989-07-18',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003173233', 'Chiriguaná', '2017-07-18',
        'Stevinson', 'Fabian', 'Florez', 'Cujia',
        'Colombia', 'Cesar', 'Chiriguaná', '1999-05-10',
        'M', 'B+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1007347179', 'El Paso', '2012-10-08',
        'Javitt', 'Ernei', 'Galvis', 'Atencio',
        'Colombia', 'Cesar', 'Chiriguaná', '1993-06-12',
        'M', 'O-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '12569170', 'Becerril', '2002-10-15',
        'Jorge', 'Luis', 'Galvis', 'Carpio',
        'Colombia', 'Cesar', 'Becerril', '1983-04-29',
        'M', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77033858', 'Valledupar', '1989-04-17',
        'Jesus', 'Eduardo', 'Galvis', 'Lopez',
        'Colombia', 'Cesar', 'Valledupar', '1970-01-04',
        'M', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77154831', 'Agustín Codazzi', '1989-05-12',
        'Wilson', NULL, 'Gaviria', 'Villadiego',
        'Colombia', 'Cesar', 'Agustín Codazzi', '1971-01-22',
        'M', 'O-', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1112464360', 'Jamundí', '2005-10-10',
        'Faber', 'Adrian', 'Girón', 'Sandoval',
        'Colombia', 'Valle Del Cauca', 'Jamundí', '1987-09-27',
        'M', 'A+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1193597751', 'El Paso', '2021-09-07',
        'Andres', 'Felipe', 'Gomez', 'Sanjuan',
        'Colombia', 'Cesar', 'El Paso', '2002-10-04',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1082243084', 'Ariguaní', '2006-06-02',
        'Alberth', 'Javier', 'Gonzalez', 'Castro',
        'Colombia', 'Bolívar', 'El Carmen De Bolívar', '1985-01-15',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '47436139', 'Yopal', '1997-04-28',
        'Edilma', NULL, 'Grismaldo', 'Montañez',
        'Colombia', 'Casanare', 'Yopal', '1979-03-10',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003166568', 'Aguachica', '2013-01-29',
        'Janer', NULL, 'Gutierrez', 'Quintero',
        'Colombia', 'Cesar', 'Curumaní', '1994-09-12',
        'M', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '15174175', 'Valledupar', '2000-02-14',
        'Deybis', 'Samir', 'Hernandez', 'Carrillo',
        'Colombia', 'Cesar', 'Valledupar', '1981-12-08',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064112407', 'La Jagua De Ibirico', '2010-01-26',
        'Javier', 'Fernando', 'Hernandez', 'Garcia',
        'Colombia', 'Cesar', 'La Jagua De Ibirico', '1991-09-05',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065996850', 'El Paso', '2012-05-31',
        'Anderson', 'Enrique', 'Hernandez', 'Muñoz',
        'Colombia', 'Atlántico', 'Ponedera', '1993-03-06',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1128188516', 'Zona Bananera', '2005-12-07',
        'Alexander', 'Jose', 'Hernandez', 'Ospino',
        'Colombia', 'Magdalena', 'Zona Bananera', '1987-07-21',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '7574510', 'Valledupar', '2001-11-08',
        'Edwar', 'Enrique', 'Hernandez', 'Romero',
        'Colombia', 'Cesar', 'Valledupar', '1983-09-29',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065982747', 'El Paso', '2019-05-16',
        'Carlos', 'Mario', 'Hernandez', 'Tarazona',
        'Colombia', 'Cesar', 'El Paso', '2001-02-17',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77146863', 'Valledupar', '2000-04-27',
        'Arnovis', 'De Jesus', 'Herrera', 'Carrillo',
        'Colombia', 'Cesar', 'La Paz', '1981-01-10',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '18974703', 'Curumaní', '2000-11-22',
        'Olimpo', NULL, 'Hoyos', 'Martinez',
        'Colombia', 'Cesar', 'Curumaní', '1980-11-12',
        'M', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065985417', 'El Paso', '2006-08-29',
        'Matelda', NULL, 'Hurtado', 'Gonzalez',
        'Colombia', 'La Guajira', 'Fonseca', '1988-02-19',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065609480', 'Valledupar', '2007-09-10',
        'Jorge', 'Antonio', 'Jimenez', 'Benavides',
        'Colombia', 'Cesar', 'Chiriguaná', '1989-04-08',
        'M', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '49757761', 'El Paso', '1996-10-02',
        'Mariluz', NULL, 'Leon', 'Machuca',
        'Colombia', 'Cesar', 'El Paso', '1977-04-07',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '7601393', 'Santa Marta', '1997-12-10',
        'Jimmi', 'Antonio', 'Maestre', 'Cantillo',
        'Colombia', 'Cesar', 'La Jagua De Ibirico', '1977-12-31',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77161928', 'El Paso', '1985-11-18',
        'Carlos', 'Arturo', 'Martinez', 'Acuña',
        'Colombia', 'Cesar', 'El Paso', '1967-10-22',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '40801513', 'Urumita', '1997-06-18',
        'Maria', 'Ines', 'Martinez', 'Lopez',
        'Colombia', 'La Guajira', 'Urumita', '1997-10-13',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1007218182', 'Chimichagua', '2011-08-31',
        'Jesus', 'Alberto', 'Martinez', 'Moreno',
        'Colombia', 'Cesar', 'Chimichagua', '1993-08-23',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1047354471', 'Santo Tomás', '2013-08-27',
        'Moises', 'David', 'Martinez', 'Polanco',
        'Colombia', 'Atlántico', 'Santo Tomás', '1995-06-29',
        'M', 'O-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77031790', 'Valledupar', '1988-05-31',
        'Alberto', 'Jose', 'Martinez', 'Ternera',
        'Colombia', 'Cesar', 'Valledupar', '1968-02-19',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1121041957', 'Distracción', '2008-04-08',
        'Jhon', 'Breiner', 'Maza', 'Perez',
        'Colombia', 'La Guajira', 'Villanueva', '1989-10-09',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1062814887', 'Becerril', '2015-08-13',
        'Alexandra', 'Paola', 'Medina', 'Peña',
        'Colombia', 'Cesar', 'El Paso', '1988-10-22',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003236138', 'Valledupar', '2010-05-20',
        'Osneider', 'Jose', 'Medina', 'Oñate',
        'Colombia', 'Cesar', 'Valledupar', '1990-04-24',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '36676686', 'Chiriguaná', '1996-07-30',
        'Ana', 'Idalides', 'Mejia', 'Lopez',
        'Colombia', 'Cesar', 'Chiriguaná', '1976-09-20',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065627283', 'Valledupar', '2009-04-17',
        'Rafael', 'Eduardo', 'Mercado', 'Orozco',
        'Colombia', 'Cesar', 'Valledupar', '1991-02-24',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1193510422', 'Plato', '2016-02-19',
        'Ivan', 'Andres', 'Miranda', 'Ramirez',
        'Colombia', 'Magdalena', 'Plato', '1998-02-07',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064117649', 'La Jagua De Ibirico', '2014-01-16',
        'Rangel', 'Andres', 'Mojica', 'Alvarez',
        'Colombia', 'Cesar', 'La Jagua De Ibirico', '1995-10-24',
        'M', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '84070532', 'Maicao', '1990-09-24',
        'Jairo', 'Enrique', 'Morgan', 'Pedrozo',
        'Colombia', 'Cesar', 'El Paso', '1972-02-17',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77181385', 'Valledupar', '1993-04-19',
        'Luis', 'Eduardo', 'Muñoz', 'Orozco',
        'Colombia', 'Cesar', 'Valledupar', '1975-01-30',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003253384', 'El Paso', '2018-04-09',
        'York', 'Javier', 'Ochoa', 'Castro',
        'Colombia', 'Cesar', 'El Paso', '1999-11-04',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064801452', 'Chiriguaná', '2014-10-01',
        'Jeison', 'Jose', 'Ochoa', 'Rodriguez',
        'Colombia', 'Cesar', 'Chiriguaná', '1996-09-17',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '12436618', 'Valledupar', '2000-09-05',
        'Nicolas', 'Enrique', 'Orozco', 'Garcia',
        'Colombia', 'Cesar', 'Valledupar', '1981-03-23',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77093958', 'Valledupar', '2002-11-19',
        'Libier', NULL, 'Ortiz', 'Ramirez',
        'Colombia', 'Cesar', 'El Paso', '1984-11-07',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '7618400', 'Astrea', '1995-03-07',
        'Carlos', 'Enrique', 'Pallares', 'Mier',
        'Colombia', 'Cesar', 'Chimichagua', '1976-12-12',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1126420678', 'El Paso', '2008-11-06',
        'Cesar', 'Augusto', 'Palacio', 'Vasquez',
        'Colombia', 'Antioquia', 'Santa Fé De Antioquia', '1990-02-18',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77094975', 'Valledupar', '2003-01-30',
        'Luis', 'Antonio', 'Palmezano', 'Sarmiento',
        'Colombia', 'Cesar', 'Valledupar', '1983-01-19',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '78707382', 'Montería', '1989-09-26',
        'Hernan', 'Antonio', 'Palomo', 'Florez',
        'Colombia', 'Córdoba', 'Montería', '1968-06-08',
        'M', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1063623417', 'San Martín', '2015-01-14',
        'Rudy', NULL, 'Peñaranda', 'Carranza',
        'Colombia', 'Norte De Santander', 'El Carmen', '2002-11-13',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065138686', 'El Copey', '2015-02-11',
        'Alexander', NULL, 'Perez', 'Chacon',
        'Colombia', 'Atlántico', 'Barranquilla', '1998-01-19',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1082045539', 'Salamina', '2009-12-29',
        'Denilson', 'David', 'Pertuz', 'Martinez',
        'Colombia', 'Magdalena', 'Salamina', '1990-09-27',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '12436123', 'Valledupar', '2000-07-25',
        'Yeferson', 'Miguel', 'Polo', 'Ochoa',
        'Colombia', 'Cesar', 'Valledupar', '1982-04-01',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '91284934', 'Bucaramanga', '1990-09-28',
        'Lidio', 'Gonzalo', 'Prada', 'Prada',
        'Colombia', 'Santander', 'Zapatoca', '1971-12-06',
        'M', 'A+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '17974693', 'Villanueva', '1991-11-08',
        'Luis', 'Aurelio', 'Quintero', 'Bastidas',
        'Colombia', 'La Guajira', 'Villanueva', '1972-02-28',
        'M', 'B+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '56099298', 'Villanueva', '2003-03-10',
        'Angela', 'Maria', 'Quintero', 'Vizcaino',
        'Colombia', 'La Guajira', 'Villanueva', '1982-09-28',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1096211431', 'Barrancabermeja', '2009-07-24',
        'Marcela', 'Patricia', 'Quiroz', 'Vergara',
        'Colombia', 'Santander', 'Barrancabermeja', '1991-07-24',
        'F', 'O-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '88170997', 'Cáchira', '1991-11-08',
        'Oscar', 'Enrique', 'Rangel', 'Florez',
        'Colombia', 'Norte De Santander', 'Cáchira', '1973-10-14',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1123732936', 'El Molino', '2014-01-15',
        'Jhoel', 'Alfonso', 'Redondo', 'Camargo',
        'Colombia', 'La Guajira', 'El Molino', '1995-05-08',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064791332', 'Chiriguaná', '2007-11-21',
        'Sindys', 'Paola', 'Rios', 'Martinez',
        'Colombia', 'Cesar', 'Becerril', '1989-10-08',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '17975704', 'Villanueva', '1996-07-17',
        'Jose', 'Luis', 'Rizo', 'Plata',
        'Colombia', 'La Guajira', 'Villanueva', '1977-12-17',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003290103', 'Montelíbano', '2010-11-25',
        'Elizabeth', NULL, 'Rodiño', 'Vega',
        'Colombia', 'Córdoba', 'Montelíbano', '1992-07-22',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064793389', 'Chiriguaná', '2009-01-20',
        'Jhon', 'Jainer', 'Rodriguez', 'Cadena',
        'Colombia', 'Cesar', 'Valledupar', '1990-10-10',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77184077', 'Valledupar', '1994-01-20',
        'Jimmy', 'Leonar', 'Rodriguez', 'Gonzalez',
        'Colombia', 'Córdoba', 'Planeta Rica', '1975-12-12',
        'M', 'A+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77094402', 'Valledupar', '2002-12-18',
        'Luis', 'Gustavo', 'Rojano', 'Fernandez',
        'Colombia', 'Cesar', 'Agustín Codazzi', '1984-12-04',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1232888071', 'Bucaramanga', '2015-03-25',
        'Jonathan', 'Javier', 'Rojas', 'Olarte',
        'Colombia', 'Santander', 'Bucaramanga', '1997-03-24',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '22532974', 'Soledad', '1995-11-17',
        'Stella', 'Isabel', 'Romero', 'Seña',
        'Colombia', 'Sucre', 'Sincelejo', '1977-09-12',
        'F', 'B+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '8496329', 'Palmar De Varela', '1987-07-01',
        'Carlos', 'Arturo', 'Rua', 'Armenta',
        'Colombia', 'Atlántico', 'Palmar De Varela', '1968-11-01',
        'M', 'B+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '12203592', 'Garzón', '2003-10-03',
        'Leonel', NULL, 'Sendoya', 'Perdomo',
        'Colombia', 'Huila', 'Garzón', '1985-07-19',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '5166055', 'San Juan Del Cesar', '2002-06-14',
        'Yeiner', 'Fabian', 'Sierra', 'Mendoza',
        'Colombia', 'La Guajira', 'San Juan Del Cesar', '1982-11-20',
        'M', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1063960167', 'Bosconia', '2010-03-23',
        'Alejandro', 'Jose', 'Socarras', 'Vasquez',
        'Colombia', 'Cesar', 'Valledupar', '1991-05-02',
        'M', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003427309', 'Astrea', '2008-12-17',
        'Omar', 'Jose', 'Solis', 'Bolaño',
        'Colombia', 'Cesar', 'Astrea', '1990-06-17',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1067724597', 'Agustín Codazzi', '2011-09-14',
        'Dellys', 'Yaneiris', 'Tapia', 'Santoya',
        'Colombia', 'Cesar', 'Agustín Codazzi', '1993-08-18',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003241247', 'Valledupar', '2017-09-04',
        'Cristian', 'Anibal', 'Teran', 'Martinez',
        'Colombia', 'Cesar', 'Valledupar', '1999-08-11',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '36562740', 'Santa Marta', '1986-12-17',
        'Camila', 'Mercedes', 'Toncel', 'Marin',
        'Colombia', 'Magdalena', 'Ciénega', '1966-05-31',
        'F', 'O+', 'viudo', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003428537', 'Astrea', '2019-06-17',
        'Yeiles', 'Cristina', 'Torres', 'Lopez',
        'Colombia', 'Cesar', 'Astrea', '2001-05-02',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '19706896', 'Bosconia', '1998-03-13',
        'Fredy', 'Enrique', 'Torrijo', 'Martinez',
        'Colombia', 'Cesar', 'Bosconia', '1978-06-20',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '63448617', 'Floridablanca', '1993-11-04',
        'Rosalia', NULL, 'Urrea', 'Aguas',
        'Colombia', 'Santander', 'Barrancabermeja', '1975-02-14',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '49779186', 'Valledupar', '1994-10-31',
        'Alba', 'Dilia', 'Urrutia', 'Carreño',
        'Colombia', 'Bolívar', 'Río Viejo', '1975-08-17',
        'F', 'O-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '7571393', 'Valledupar', '2001-02-06',
        'Juan', 'Luis', 'Vasquez', 'Martinez',
        'Colombia', 'Cesar', 'Valledupar', '1982-11-24',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '49773419', 'Valledupar', '1993-03-08',
        'Vilma', 'Rosa', 'Vega', 'Correa',
        'Colombia', 'Cesar', 'El Paso', '1974-07-24',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '36593050', 'El Copey', '1990-08-23',
        'Ana', 'Luz', 'Vega', 'Suarez',
        'Colombia', 'Cesar', 'El Copey', '1969-12-11',
        'F', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1085176275', 'Guamal', '2011-09-22',
        'Edinson', NULL, 'Villaruel', 'Diaz',
        'Colombia', 'Magdalena', 'Guamal', '1993-04-19',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '17972782', 'Villanueva', '1984-10-30',
        'Juvenal', 'Antonio', 'Vizcaino', 'Parodi',
        'Colombia', 'Magdalena', 'Fundación', '1966-04-29',
        'M', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77040385', 'La Paz', '2002-11-13',
        'Carlos', 'Emilio', 'Zequeira', 'Mieles',
        'Colombia', 'Cesar', 'La Paz', '1984-10-22',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1067812338', 'La Paz', '2008-11-06',
        'Luis', 'Eduardo', 'Zuleta', 'Ortiz',
        'Colombia', 'Cesar', 'La Paz', '1990-09-19',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065633715', 'Valledupar', '2009-10-22',
        'Anis', 'Lorena', 'Ariza', 'Reynel',
        'Colombia', 'Cesar', 'Bosconia', '1991-03-10',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1068348535', 'Astrea', '2006-09-05',
        'Leyder', 'Manuel', 'Espinoza', 'Garcia',
        'Colombia', 'Cesar', 'Astrea', '1987-09-06',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1122411028', 'San Juan Del Cesar', '2013-07-02',
        'Luis', 'Fernando', 'Franco', 'Eraso',
        'Colombia', 'Cesar', 'Valledupar', '1995-05-24',
        'M', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1004306076', 'Ariguaní', '2020-12-16',
        'Andres', 'De Jesus', 'Hernandez', 'Escobar',
        'Colombia', 'Magdalena', 'Ariguaní', '2002-02-03',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1004306076', 'Ariguaní', '2020-12-16',
        'Andres', 'De Jesus', 'Hernandez', 'Escobar',
        'Colombia', 'Magdalena', 'Ariguaní', '2002-02-03',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1066001278', 'El Paso', '2016-10-27',
        'Carlos', 'Andres', 'Machado', 'Infante',
        'Colombia', 'Cesar', 'Chiriguaná', '1998-08-03',
        'M', 'A+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '12435483', 'Valledupar', '2000-05-30',
        'Mario', 'Luis', 'Pinto', 'Rodriguez',
        'Colombia', 'Cesar', 'Valledupar', '1981-11-26',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003122827', 'La Jagua De Ibirico', '2019-11-15',
        'Wilfran', 'Null', 'Lindarte', 'Quintana',
        'Colombia', 'Cesar', 'La Jagua De Ibirico', '2001-11-04',
        'M', 'O-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1067724214', 'Agustín Codazzi', '2011-06-29',
        'Eduardo', 'Luis', 'Fernandez', 'Gamarra',
        'Colombia', 'Cesar', 'Agustín Codazzi', '1992-11-12',
        'M', 'A-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065995953', 'El Paso', '2011-01-26',
        'Jose', 'Manuel', 'Romero', 'Anaya',
        'Colombia', 'Cesar', 'El Paso', '1992-10-28',
        'M', 'A-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065985378', 'El Paso', '2008-08-11',
        'Rodis', 'Maria', 'Redondo', 'Moreno',
        'Colombia', 'Cesar', 'El Paso', '1987-10-29',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065997804', 'El Paso', '2013-03-21',
        'Walter', 'Alfonso', 'Perdomo', 'Sanabria',
        'Colombia', 'Cesar', 'El Paso', '1995-01-09',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1066864250', 'Valledupar', '2018-02-09',
        'Miguel', 'Angel', 'Paredes', 'Avila',
        'Colombia', 'Cesar', 'Valledupar', '1999-10-09',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064792435', 'Chiriguaná', '2010-08-10',
        'Ingris', 'Paola', 'Torres', 'Barrios',
        'Colombia', 'Cesar', 'Chiriguaná', '1989-04-15',
        'F', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1063971695', 'Bosconia', '2016-11-29',
        'Jose', 'Eduardo', 'Granados', 'Mendoza',
        'Colombia', 'Magdalena', 'Aracataca', '1989-03-23',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065999473', 'El Paso', '2014-10-30',
        'Yeinis', 'Esmith', 'Gordillo', 'Lindarte',
        'Colombia', 'Cesar', 'Agustín Codazzi', '1996-09-05',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1063951667', 'Bosconia', '2006-03-07',
        'Noregnis', 'Null', 'Ortega', 'Garcia',
        'Colombia', 'Cesar', 'Bosconia', '1987-11-05',
        'F', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065994998', 'El Paso', '2009-11-20',
        'Martin', 'Rafael', 'Peinado', 'Villazon',
        'Colombia', 'Cesar', 'El Paso', '1990-11-14',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1148198745', 'Chiriguaná', '2010-09-01',
        'Eder', 'Antonio', 'Posada', 'Gutierrez',
        'Colombia', 'Cesar', 'Chiriguaná', '1992-07-15',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1192812368', 'El Paso', '2019-02-26',
        'Juan', 'Camilo', 'Gonzalez', 'Bolaño',
        'Colombia', 'Cesar', 'Valledupar', '2001-02-21',
        'M', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1062354019', 'Astrea', '2016-01-19',
        'Yefferson', 'Null', 'Rocha', 'Rangel',
        'Colombia', 'Cesar', 'Astrea', '1997-12-06',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1192738846', 'El Paso', '2014-08-05',
        'Bernardo', 'Null', 'Muñoz', 'Andrade',
        'Colombia', 'Cesar', 'El Paso', '1995-12-26',
        'M', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003251723', 'El Paso', '2014-11-06',
        'Jose', 'Angel', 'Escobar', 'Vasquez',
        'Colombia', 'Cesar', 'El Paso', '1996-10-25',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1066002226', 'El Paso', '2017-12-22',
        'Gissel', 'Paola', 'Molina', 'Rincones',
        'Colombia', 'Cesar', 'Valledupar', '1999-02-26',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1007624529', 'La Jagua De Ibirico', '2018-05-30',
        'Jonas', 'Javier', 'Rocha', 'Benavides',
        'Colombia', 'Cesar', 'La Jagua De Ibirico', '2000-04-09',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065983896', 'El Paso', '2021-04-27',
        'Camilo', 'Andres', 'Barros', 'Parra',
        'Colombia', 'Cesar', 'El Paso', '2003-04-03',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1095906395', 'Girón', '2004-01-21',
        'Rosa', 'Lili', 'Gomez', 'Prada',
        'Colombia', 'Santander', 'Bucaramanga', '1986-01-12',
        'F', 'A+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065995972', 'El Paso', '2011-02-01',
        'Maria', 'Alejandra', 'Mier', 'Muñoz',
        'Colombia', 'Cesar', 'El Paso', '1992-12-30',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1128149133', 'Nueva Granada', '2009-04-18',
        'Gustavo', 'Alejandro', 'Molina', 'De Angel',
        'Colombia', 'Magdalena', 'Plato', '1990-10-08',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065562735', 'El Paso', '2019-08-23',
        'Randy', 'David', 'Orcasita', 'Martinez',
        'Colombia', 'Cesar', 'Valledupar', '2001-08-21',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064112638', 'La Jagua De Ibirico', '2010-07-27',
        'Jorge', 'Luis', 'Torrenegra', 'Rios',
        'Colombia', 'Cesar', 'La Jagua De Ibirico', '1978-01-19',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1016950101', 'Bucaramanga', '2024-10-29',
        'Nicolas', 'Andrey', 'Gomez', 'Jaimes',
        'Colombia', 'Cundinamarca', 'Bogotá, D.c.', '2006-10-08',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064802227', 'Chiriguaná', '2015-05-08',
        'Franci', 'Liceth', 'Peñaloza', 'Benjumea',
        'Colombia', 'Cesar', 'Chiriguaná', '1996-07-20',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003123100', 'La Jagua De Ibirico', '2020-07-10',
        'Leyder', 'Jose', 'Pedroza', 'Santos',
        'Colombia', 'Cesar', 'La Jagua De Ibirico', '2002-03-18',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1066093900', 'Pailitas', '2011-02-17',
        'Tatiana', 'Marcela', 'Rojas', 'Chona',
        'Colombia', 'Cesar', 'Aguachica', '1993-02-13',
        'F', 'O-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064787526', 'La Jagua De Ibirico', '2023-04-19',
        'Luis', 'Alberto', 'Cubillos', 'De Angel',
        'Colombia', 'Cesar', 'Chiriguaná', '2005-02-17',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1193097319', 'La Jagua De Ibirico', '2019-07-08',
        'Stiven', 'Jose', 'Parodi', 'Vera',
        'Colombia', 'Cesar', 'La Jagua De Ibirico', '2001-07-05',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1050544980', 'El Paso', '2020-07-02',
        'Luis', 'Alberto', 'Chave', 'Mejia',
        'Colombia', 'Bolívar', 'San Pablo', '2001-11-28',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1119836870', 'Urumita', '2006-04-10',
        'Ana', 'Karina', 'Gutierrez', 'De La Hoz',
        'Colombia', 'Cesar', 'Valledupar', '1985-08-29',
        'F', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '77161115', 'San Diego', '1996-06-06',
        'Esneider', 'Miguel', 'Garrido', 'Plata',
        'Colombia', 'Cesar', 'San Diego', '1977-02-06',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '84455247', 'Santa Marta', '2001-06-25',
        'Andres', 'Null', 'Casallas', 'Acosta',
        'Colombia', 'Cundinamarca', 'Bogotá, D.c.', '1983-05-05',
        'M', 'A+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '17975914', 'Villanueva', '1997-04-05',
        'Janer', 'Enrique', 'Pelaez', 'Rojas',
        'Colombia', 'La Guajira', 'Villanueva', '1977-10-08',
        'M', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1007398803', 'Agustín Codazzi', '2017-08-04',
        'Celsina', 'Margoth', 'Zuleta', 'Dangond',
        'Colombia', 'Cesar', 'Agustín Codazzi', '1999-06-23',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1140826120', 'Barranquilla', '2007-12-05',
        'Keylis', 'Johana', 'Cervantes', 'Londoño',
        'Colombia', 'Cesar', 'Chimichagua', '1989-11-25',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1007574207', 'Valledupar', '2020-03-13',
        'Darlys', 'Daniela', 'Bolaño', 'Cuadro',
        'Colombia', 'Cesar', 'La Paz', '2002-03-12',
        'F', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '37555831', 'Bucaramanga', '1996-05-10',
        'Rosmira', 'Null', 'Remolina', 'Sandoval',
        'Colombia', 'Cesar', 'Lebrija', '1978-03-16',
        'F', 'A+', 'divorciado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '18971129', 'Curumaní', '1991-02-11',
        'Luis', 'Alfonso', 'Ruiz', 'Rincon',
        'Colombia', 'Cesar', 'Curumaní', '1972-10-06',
        'M', 'O-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065986009', 'Chía', '2019-12-10',
        'Daniela', 'Maria', 'Sierra', 'Pallares',
        'Colombia', 'Cesar', 'El Paso', '2001-08-22',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1122813904', 'Barrancas', '2009-01-23',
        'Nohora', 'Milagros', 'Ureche', 'Mendoza',
        'Colombia', 'La Guajira', 'Barrancas', '1991-01-18',
        'F', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '49724161', 'Valledupar', '2002-08-23',
        'Maria', 'Camila', 'Gomez', 'Vega',
        'Colombia', 'Cundinamarca', 'Bogotá, D.c.', '1984-06-15',
        'F', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064787989', 'Chiriguaná', '2013-06-25',
        'Aldemiro', 'Null', 'Quintana', 'Ospino',
        'Colombia', 'Cesar', 'Chiriguaná', '1995-05-16',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1067591773', 'Valledupar', '2017-06-07',
        'Jaider', 'Enrique', 'Diaz', 'Plata',
        'Colombia', 'Cesar', 'Valledupar', '1999-05-26',
        'M', 'O-', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1067601401', 'Agustín Codazzi', '2025-04-28',
        'Laura', 'Yamelis', 'Morron', 'Ballesteros',
        'Colombia', 'Cesar', 'Valledupar', '2007-04-16',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1062395531', 'San Diego', '2023-06-13',
        'Carlos', 'Alberto', 'Corrales', 'Diaz',
        'Colombia', 'Cesar', 'San Diego', '2005-06-11',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065855863', 'Valledupar', '2018-01-25',
        'Yoeiner', 'Rafael', 'Jimenez', 'Bolaño',
        'Colombia', 'Cesar', 'Valledupar', '1999-11-20',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1081916522', 'Plato', '2008-09-03',
        'Eduardo', 'Jose', 'Orozco', 'Orozco',
        'Colombia', 'Magdalena', 'Plato', '1989-12-26',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1069177238', 'Ricaurte', '2012-02-15',
        'Daniel', 'Fernando', 'Martin', 'Galvis',
        'Colombia', 'Bogotá', 'Bogotá, D.c.', '1994-02-14',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1063953480', 'Bosconia', '2006-12-06',
        'Yeisson', 'Enrrique', 'Yepes', 'Erazo',
        'Colombia', 'Cesar', 'Bosconia', '1988-10-06',
        'M', 'B+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1082843092', 'Santa Marta', '2004-08-06',
        'Jorge', 'Luis', 'Solano', 'De La Rosa',
        'Colombia', 'Magdalena', 'Santa Marta', '1986-05-23',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '18127895', 'Mocoa', '1997-04-18',
        'Omar', 'Norvey', 'Apraez', 'Pantoja',
        'Colombia', 'San Andrés Y Providencia', 'Mocoa', '1979-03-14',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1192904781', 'San Juan Del Cesar', '2019-04-16',
        'Tulio Rodrigo', 'Miguel', 'Bolaño', 'Rodriguez',
        'Colombia', 'La Guajira', 'San Juan Del Cesar', '2001-04-06',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065202906', 'Manaure Balcón Del Cesar', '2024-08-20',
        'Juan', 'Camilo', 'Torres', 'Castro',
        'Colombia', 'Cesar', 'Manaure Balcón Del Cesar', '2006-06-08',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1064726399', 'Curumaní', '2017-10-23',
        'Dian', 'Maria Vanessa', 'Suarez', 'Hoyos',
        'Colombia', 'Meta', 'Villavicencio', '1999-10-23',
        'F', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065983645', 'El Paso', '2021-07-30',
        'Martin', 'Eduardo', 'Meza', 'Peinado',
        'Colombia', 'Cesar', 'El Paso', '2003-06-26',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1065575783', 'Valledupar', '2022-10-24',
        'Leonardo', 'Jose', 'Nieto', 'Sanchez',
        'Colombia', 'Cesar', 'Valledupar', '2004-10-15',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '91283538', 'Bucaramanga', '1990-07-01',
        'Pedro', 'Yesid', 'Chaparro', 'Murillo',
        'Colombia', 'Tolima', 'San Luis', '1971-09-14',
        'M', 'O+', 'casado', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1015393251', 'La Jagua De Ibirico', '2022-04-07',
        'Sebastian', 'David', 'Molina', 'Castro',
        'Colombia', 'Cundinamarca', 'Bogotá, D.c.', '2004-04-04',
        'M', 'O+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
INSERT INTO public.employees_v2 (
        company_id, document_type, document_number, document_issue_city, document_issue_date,
        first_name, middle_name, last_name, second_last_name,
        birth_country, birth_department, birth_city, birth_date,
        gender, blood_type, marital_status, is_active
    ) VALUES (
        '11a12ece-a130-4682-9a8a-cba4325dadf0', 'CC', '1003252636', 'El Paso', '2021-01-15',
        'Luis', 'Daniel', 'Martinez', 'Carmona',
        'Colombia', 'Cesar', 'El Paso', '2002-12-27',
        'M', 'A+', 'soltero', true
    ) ON CONFLICT (company_id, document_type, document_number) DO NOTHING;
