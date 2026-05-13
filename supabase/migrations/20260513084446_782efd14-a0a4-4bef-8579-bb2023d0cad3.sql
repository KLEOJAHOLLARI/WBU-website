REVOKE EXECUTE ON FUNCTION public.generate_deans_list(uuid, text, numeric, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.preview_deans_list(uuid, text, numeric, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_deans_list(uuid, text, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_deans_list(uuid, text, numeric, integer) TO authenticated;