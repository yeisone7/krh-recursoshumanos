-- Supabase default privileges may grant roles EXECUTE independently of PUBLIC.
-- Recalculation is internal and must never be callable directly from a client.
REVOKE ALL ON FUNCTION public.time_clock_recalculate_day(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.time_clock_self_can_access_point(uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA time_clock_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA time_clock_private FROM PUBLIC, anon, authenticated;
