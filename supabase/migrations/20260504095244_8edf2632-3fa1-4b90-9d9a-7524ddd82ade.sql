REVOKE EXECUTE ON FUNCTION public.submit_professor_feedback(uuid, uuid, smallint, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_submitted_feedback(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_professor_performance(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_all_professors_performance(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.submit_professor_feedback(uuid, uuid, smallint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_submitted_feedback(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_professor_performance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_professors_performance(uuid) TO authenticated;