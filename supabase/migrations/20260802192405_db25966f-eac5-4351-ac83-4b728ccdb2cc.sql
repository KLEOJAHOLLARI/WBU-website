CREATE TABLE public.course_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_threads TO authenticated;
GRANT ALL ON public.course_threads TO service_role;

ALTER TABLE public.course_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threads_read_enrolled_or_prof"
  ON public.course_threads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = course_threads.course_id AND e.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_threads.course_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "threads_insert_enrolled_or_prof"
  ON public.course_threads FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (
      EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id = course_threads.course_id AND e.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_threads.course_id AND c.professor_id = auth.uid()
      )
    )
  );

CREATE POLICY "threads_update_owner"
  ON public.course_threads FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "threads_update_prof_pin_lock"
  ON public.course_threads FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_threads.course_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_threads.course_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "threads_delete_owner"
  ON public.course_threads FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "threads_delete_prof"
  ON public.course_threads FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_threads.course_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );


CREATE TABLE public.thread_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.course_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  parent_reply_id uuid REFERENCES public.thread_replies(id) ON DELETE CASCADE,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_replies TO authenticated;
GRANT ALL ON public.thread_replies TO service_role;

ALTER TABLE public.thread_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "replies_read_enrolled_or_prof"
  ON public.thread_replies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_threads t
      JOIN public.enrollments e ON e.course_id = t.course_id AND e.user_id = auth.uid()
      WHERE t.id = thread_replies.thread_id
    )
    OR EXISTS (
      SELECT 1 FROM public.course_threads t
      JOIN public.courses c ON c.id = t.course_id
      WHERE t.id = thread_replies.thread_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "replies_insert_enrolled_or_prof"
  ON public.thread_replies FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (
      EXISTS (
        SELECT 1 FROM public.course_threads t
        JOIN public.enrollments e ON e.course_id = t.course_id AND e.user_id = auth.uid()
        WHERE t.id = thread_replies.thread_id
      )
      OR EXISTS (
        SELECT 1 FROM public.course_threads t
        JOIN public.courses c ON c.id = t.course_id
        WHERE t.id = thread_replies.thread_id AND c.professor_id = auth.uid()
      )
    )
  );

CREATE POLICY "replies_update_owner"
  ON public.thread_replies FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "replies_update_prof_pin"
  ON public.thread_replies FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_threads t
      JOIN public.courses c ON c.id = t.course_id
      WHERE t.id = thread_replies.thread_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_threads t
      JOIN public.courses c ON c.id = t.course_id
      WHERE t.id = thread_replies.thread_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "replies_delete_owner"
  ON public.thread_replies FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "replies_delete_prof"
  ON public.thread_replies FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_threads t
      JOIN public.courses c ON c.id = t.course_id
      WHERE t.id = thread_replies.thread_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );


CREATE TABLE public.thread_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.course_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.thread_upvotes TO authenticated;
GRANT ALL ON public.thread_upvotes TO service_role;

ALTER TABLE public.thread_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upvotes_read_enrolled_or_prof"
  ON public.thread_upvotes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_threads t
      JOIN public.enrollments e ON e.course_id = t.course_id AND e.user_id = auth.uid()
      WHERE t.id = thread_upvotes.thread_id
    )
    OR EXISTS (
      SELECT 1 FROM public.course_threads t
      JOIN public.courses c ON c.id = t.course_id
      WHERE t.id = thread_upvotes.thread_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "upvotes_insert_own"
  ON public.thread_upvotes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.course_threads t
        JOIN public.enrollments e ON e.course_id = t.course_id AND e.user_id = auth.uid()
        WHERE t.id = thread_upvotes.thread_id
      )
      OR EXISTS (
        SELECT 1 FROM public.course_threads t
        JOIN public.courses c ON c.id = t.course_id
        WHERE t.id = thread_upvotes.thread_id AND c.professor_id = auth.uid()
      )
    )
  );

CREATE POLICY "upvotes_delete_own"
  ON public.thread_upvotes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE public.course_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_chat_messages TO authenticated;
GRANT ALL ON public.course_chat_messages TO service_role;

ALTER TABLE public.course_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_read_enrolled_or_prof"
  ON public.course_chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = course_chat_messages.course_id AND e.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_chat_messages.course_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "chat_insert_enrolled_or_prof"
  ON public.course_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (
      EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id = course_chat_messages.course_id AND e.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_chat_messages.course_id AND c.professor_id = auth.uid()
      )
    )
  );

CREATE POLICY "chat_delete_owner"
  ON public.course_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "chat_delete_prof"
  ON public.course_chat_messages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_chat_messages.course_id AND c.professor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "chat_update_owner"
  ON public.course_chat_messages FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.course_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_threads;