-- Hosted projects may grant EXECUTE directly to API roles through default
-- privileges. Revoke anon explicitly from authenticated rehire operations.
REVOKE ALL ON FUNCTION public.start_employee_rehire(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_employee_v2_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_candidate_hiring(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.complete_candidate_hiring(uuid, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_employee_rehire(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_employee_v2_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_candidate_hiring(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION private.complete_candidate_hiring(uuid, jsonb) TO authenticated;

-- The token-validated public registration endpoint intentionally remains
-- callable by anonymous and signed-in users.
REVOKE ALL ON FUNCTION public.submit_employee_rehire_registration(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_employee_rehire_registration(text, jsonb) TO anon, authenticated;
