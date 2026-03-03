
CREATE OR REPLACE FUNCTION public.get_profesiogramas_with_items(_company_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(prof_row ORDER BY prof_row.created_at DESC), '[]'::json)
  FROM (
    SELECT 
      p.id,
      p.company_id,
      p.operation_center_id,
      p.position_id,
      p.created_at,
      p.updated_at,
      json_build_object('id', oc.id, 'name', oc.name) AS operation_centers,
      json_build_object('id', pos.id, 'name', pos.name) AS positions,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', pi.id,
          'profesiograma_id', pi.profesiograma_id,
          'dotation_item_type_id', pi.dotation_item_type_id,
          'quantity', pi.quantity,
          'notes', pi.notes,
          'is_required', pi.is_required,
          'dotation_item_types', json_build_object(
            'id', dit.id,
            'name', dit.name,
            'code', dit.code,
            'category', dit.category,
            'requires_size', dit.requires_size,
            'sizes_available', dit.sizes_available,
            'default_validity_months', dit.default_validity_months
          )
        ))
        FROM dotation_profesiograma_items pi
        JOIN dotation_item_types dit ON dit.id = pi.dotation_item_type_id
        WHERE pi.profesiograma_id = p.id),
        '[]'::json
      ) AS items
    FROM dotation_profesiograma p
    LEFT JOIN operation_centers oc ON oc.id = p.operation_center_id
    LEFT JOIN positions pos ON pos.id = p.position_id
    WHERE p.company_id = _company_id
  ) prof_row
$$;
