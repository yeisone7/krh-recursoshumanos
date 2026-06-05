-- Supabase default privileges can grant EXECUTE to anon explicitly on new
-- public functions. Keep chat permission helpers authenticated-only.

REVOKE EXECUTE ON FUNCTION public.is_chat_participant(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_chat_in_company(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_chat_unread_count(UUID) FROM anon;

REVOKE ALL ON FUNCTION public.is_chat_participant(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_chat_in_company(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_chat_unread_count(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_chat_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_chat_in_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_unread_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_chat_in_company(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_chat_unread_count(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
