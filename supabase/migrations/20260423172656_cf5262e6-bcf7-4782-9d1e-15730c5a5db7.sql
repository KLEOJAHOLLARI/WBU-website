ALTER TABLE public.grade_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.student_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_notifications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;