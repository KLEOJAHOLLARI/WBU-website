ALTER TABLE public.applications REPLICA IDENTITY FULL;
ALTER TABLE public.tuition_charges REPLICA IDENTITY FULL;
ALTER TABLE public.tuition_payments REPLICA IDENTITY FULL;
ALTER TABLE public.enrollment_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.applications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tuition_charges; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tuition_payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollment_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;