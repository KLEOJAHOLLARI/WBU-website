ALTER PUBLICATION supabase_realtime ADD TABLE public.access_logs;
ALTER TABLE public.access_logs REPLICA IDENTITY FULL;