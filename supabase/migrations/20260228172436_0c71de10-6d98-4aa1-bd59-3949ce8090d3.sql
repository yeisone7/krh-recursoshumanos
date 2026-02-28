
ALTER TABLE evaluation_templates
  ADD COLUMN position_id UUID REFERENCES positions(id) ON DELETE SET NULL;

ALTER TABLE evaluation_criteria
  ADD COLUMN level_4_description TEXT,
  ADD COLUMN level_3_description TEXT,
  ADD COLUMN level_2_description TEXT,
  ADD COLUMN level_1_description TEXT;

ALTER TABLE evaluation_templates
  ADD COLUMN qualitative_questions JSONB DEFAULT '["¿Qué aportes ha hecho usted a la empresa, área o campo donde se desempeña?", "¿En qué aspectos opina usted que debe mejorar?", "Teniendo en cuenta los aspectos en donde la calificación no es muy buena, ¿Qué compromisos va a adquirir para mejorar?"]'::jsonb,
  ADD COLUMN rating_scale JSONB DEFAULT '[{"label":"Sobresaliente","min":91,"max":100,"description":"Mantener el compromiso hasta ahora alcanzado"},{"label":"Bueno","min":75,"max":90,"description":"Trabajar en mejora continua"},{"label":"Aceptable","min":60,"max":74,"description":"Requiere capacitación continua"},{"label":"Deficiente","min":0,"max":59,"description":"Requiere cumplimiento inmediato"}]'::jsonb;
