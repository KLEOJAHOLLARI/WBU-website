REVOKE EXECUTE ON FUNCTION public.get_user_failed_courses(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_failed_courses(uuid) TO authenticated, service_role;