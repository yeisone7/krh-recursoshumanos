-- Restore the biological sex supplied in the original Petrocasinos employee
-- import. These employees were created before that field was persisted in
-- employees_v2, so incapacity analytics classified their cases as "Sin dato".
WITH source(document_number, gender) AS (
  VALUES
    ('1005340270', 'M'),
    ('1006414423', 'F'),
    ('1006454843', 'F'),
    ('1065238084', 'F'),
    ('1102042212', 'F'),
    ('18399590', 'M'),
    ('28313475', 'F'),
    ('37938485', 'F'),
    ('46646731', 'F'),
    ('46648311', 'F'),
    ('60420681', 'F'),
    ('8033651', 'M'),
    ('80542318', 'M')
)
UPDATE public.employees_v2 AS employee
SET gender = source.gender::public.gender_type,
    updated_at = now()
FROM source
JOIN public.companies AS company
  ON company.name = 'Petrocasinos S.A.'
WHERE employee.company_id = company.id
  AND regexp_replace(employee.document_number, '[^0-9]', '', 'g') = source.document_number
  AND employee.gender IS NULL;
