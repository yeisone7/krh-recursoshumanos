-- Apply after ai-data-assistant v2 is deployed. No application code calls this RPC.
REVOKE ALL ON FUNCTION public.execute_read_only_query(text) FROM PUBLIC,anon,authenticated,service_role;
