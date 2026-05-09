-- MIGRATION BLOCK 1: CATALOGS

-- Areas
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Bodega') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Conductores') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Rrhh') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Cajeras Borrego') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Administrativo') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Servicio') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Cocina') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Hidrocarburos') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Cajeras Descanso') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Mantenimiento') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Steward') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Admon Bmanga') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Gerencia') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Casa Hielo') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Hse') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Sena') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.areas (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Calidad') ON CONFLICT (company_id, name) DO NOTHING;

-- Positions
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Auxiliar De Bodega') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Conductor') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Jefe De Recursos Humanos') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Cajera') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Analista De Informacion') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Mesero') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Cocinero 1') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Coordinador De Eventos') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Auxiliar De Cocina') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Tecnico De Mantenimiento') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Supervisor De Servicios') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Steward Y Aseo') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Profesional De Nomina') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Gerente Operativo') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Gestor De Compras') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Supervisor De Campo') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Panadero') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Porcionador') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Coordinador De Bodega') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Coordinador De Alimentos') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Cocinero 2') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Subcheff') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Auxiliar De Cocina A&b') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Auxiliar De Casa Hielo') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Asistente De Gerencia') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Asistente De Costos') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Supervisor De Bodega') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Gerente De Contrato') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Auxiliar Contable') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Auxiliar De Gestion Documental') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Jefe Hseq') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Aprendiz Sena Productiva') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Asistente De Tesoreria') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Aprendiz Sena Lectiva') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Asistente De Recursos Humanos') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Aprendiz Universitario') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Auxiliar De Servicios Generales') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Jefe Sgi') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Jefe De A&b Y Eventos') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Hseq Relevante') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.positions (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Chef Ejecutivo') ON CONFLICT (company_id, name) DO NOTHING;

-- Operation Centers
INSERT INTO public.operation_centers (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Principal') ON CONFLICT (company_id, name) DO NOTHING;

-- EPS
INSERT INTO public.catalog_eps (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Salud Total Eps S.a.') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_eps (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Eps Sanitas') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_eps (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Eps Sura') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_eps (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Nueva Eps') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_eps (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Coosalud Eps-s') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_eps (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Cajacopi Eps') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_eps (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Asmet Salud Eps Sas') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_eps (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Salud Mia') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_eps (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Famisanar') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_eps (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Mutual Ser') ON CONFLICT (company_id, name) DO NOTHING;

-- AFP
INSERT INTO public.catalog_afp (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Porvenir') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_afp (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Protección') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_afp (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Fondo Nacional Del Ahorro (fna)') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_afp (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Colfondos') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_afp (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Null') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_afp (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Administradora Colombiana De Pensiones Colpensiones') ON CONFLICT (company_id, name) DO NOTHING;

-- ARL
INSERT INTO public.catalog_arl (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Compañía De Seguros Bolívar S.a.') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_arl (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Colmena Riesgos Profesionales') ON CONFLICT (company_id, name) DO NOTHING;

-- CCF
INSERT INTO public.catalog_ccf (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Caja De Compensación Familiar Cesar') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_ccf (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Cajasan') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_ccf (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Null') ON CONFLICT (company_id, name) DO NOTHING;

-- Banks
INSERT INTO public.catalog_banks (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Bbva Colombia') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_banks (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Bancolombia') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_banks (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Banco Caja Social Bcsc Sa') ON CONFLICT (company_id, name) DO NOTHING;
INSERT INTO public.catalog_banks (company_id, name) VALUES ('11a12ece-a130-4682-9a8a-cba4325dadf0', 'Banco Av Villas') ON CONFLICT (company_id, name) DO NOTHING;
