REVOKE EXECUTE ON FUNCTION public.submit_professor_feedback(uuid, uuid, smallint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_professor_feedback(uuid, uuid, smallint, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_professor_feedback(uuid, uuid, smallint, text) TO authenticated;