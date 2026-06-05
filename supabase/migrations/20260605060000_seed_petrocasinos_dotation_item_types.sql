-- Seed dotation item types for Petrocasinos.
-- Idempotent by company + item name, matching the table constraint.

WITH target_company AS (
  SELECT id
  FROM public.companies
  WHERE nit = '800119647-1'
     OR name = 'Petrocasinos S.A.'
  ORDER BY created_at
  LIMIT 1
),
items (name, code, category, description) AS (
  VALUES
    ('BATA VISITANTE *UND', '282', 'calzado', 'BLANCO'),
    ('BOTA DE CUERO CON PUNT *UND', '1813', 'calzado', 'CAFE'),
    ('BOTA PLASTICA SIN PUNT X UND', '1838', 'calzado', 'AMARILLO'),
    ('BRAGA DE DRILL M/C X UND', '281', 'uniforme', 'BLANCO'),
    ('BRAGA TECNICOS MANTENIMIENTO', '25931', 'uniforme', 'NARANJA-AZUL'),
    ('BUZO PARA PLANTA DE CONCENTRADO X UND', '24005', 'uniforme', 'NARANJA-AZUL'),
    ('CAMIBUSO X UND', '284', 'uniforme', 'BLANCO'),
    ('CAMISA ADMINISTRATIVA CABALLERO X UND', '5051', 'uniforme', 'VARIOS'),
    ('CAMISA ADMINISTRATIVA DAMA*UND', '5050', 'uniforme', 'BLANCO'),
    ('CAMISA AUX COCINA CABALLERO*UND', '1804', 'uniforme', 'BLANCO'),
    ('CAMISA CHEF UNISEX X UND', '3003', 'uniforme', 'BLANCO'),
    ('CAMISA COCINERO UNISEX *UND', '285', 'uniforme', 'BLANCO'),
    ('CAMISA DRILL X UND', '1799', 'uniforme', 'KAKY'),
    ('CAMISA JEAN DAMA X UND', '26009', 'uniforme', 'JEAN'),
    ('CAMISA MESERA DAMA*UND', '1807', 'uniforme', 'BLANCO'),
    ('CAMISA MESERO CABALLERO*UND', '1826', 'uniforme', 'BLANCO'),
    ('CAMISETA PLANTA DE CONCENTRADO X UND', '26030', 'uniforme', 'VARIOS'),
    ('CAMISETA X UND', '25280', 'uniforme', 'BLANCO'),
    ('CHULECOS EMP *UND', '1820', 'uniforme', 'AZUL'),
    ('CONJUNTO ANTIFLUIDO CLINICAS', '24937', 'uniforme', 'CELESTE'),
    ('CONJUNTO ASEO BLANCO CON AZUL*UND', '1824', 'uniforme', 'BLANCO'),
    ('CONJUNTO AUXILIAR DE COCINA*UND', '1808', 'uniforme', 'BLANCO'),
    ('CONJUNTO DE FRIO BLANCO X UND', '26010', 'uniforme', 'BLANCO'),
    ('DELANTAL "MICOS" *UND', '1817', 'uniforme', 'BLANCO'),
    ('DELANTAL MESERO*UND', '1818', 'uniforme', 'NEGRO'),
    ('DELANTAL SABOREANDO X UND', '25321', 'uniforme', 'VARIOS'),
    ('FALDA X UND', '25674', 'uniforme', 'VARIOS'),
    ('GORRA DRILL X UND', '2796', 'uniforme', 'AZUL'),
    ('GORROS PIRATA *UND', '1819', 'uniforme', 'NEGRO'),
    ('PANTALON ADMINISTRATIVO DAMA*UND', '5251', 'uniforme', 'VARIOS'),
    ('PANTALON ADMINISTRATIVO CABALLERO *UND', '5253', 'uniforme', 'VARIOS'),
    ('PANTALON ENCAUCHADO X UND', '1803', 'uniforme', 'BLANCO'),
    ('PANTALON JEAN CABALLERO', '1800', 'uniforme', 'JEAN'),
    ('PANTALON JEAN DAMA*UND', '1801', 'uniforme', 'JEAN'),
    ('PANTALON LINOFLEX CABALLERO X UND', '1810', 'uniforme', 'NEGRO'),
    ('PANTALON LINOFLEX DAMA X UND', '1809', 'uniforme', 'AZUL'),
    ('POLO UNISEX X UND', '280', 'uniforme', 'BLANCO'),
    ('ZAPATO TENIS CABALLERO COLOR NEGRO X UND', '26057', 'calzado', 'NEGRO'),
    ('ZAPATO TENIS DAMA COLOR NEGRO X UND', '26056', 'calzado', 'NEGRO'),
    ('ZUECO ANTIDESLIZANTE * UND', '3671', 'calzado', 'BLANCO')
)
INSERT INTO public.dotation_item_types (
  company_id,
  name,
  code,
  category,
  default_validity_months,
  requires_size,
  sizes_available,
  description,
  is_active
)
SELECT
  target_company.id,
  items.name,
  items.code,
  items.category,
  12,
  true,
  ARRAY['Todas']::text[],
  items.description,
  true
FROM target_company
CROSS JOIN items
ON CONFLICT (company_id, name) DO UPDATE
SET
  code = EXCLUDED.code,
  category = EXCLUDED.category,
  default_validity_months = EXCLUDED.default_validity_months,
  requires_size = EXCLUDED.requires_size,
  sizes_available = EXCLUDED.sizes_available,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();
