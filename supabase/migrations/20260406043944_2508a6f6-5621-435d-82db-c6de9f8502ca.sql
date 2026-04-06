
-- Profiles table for student users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Documents table
CREATE TABLE public.student_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.student_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can upload documents" ON public.student_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.student_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all documents" ON public.student_documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update documents" ON public.student_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Student messages table
CREATE TABLE public.student_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_by_admin BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.student_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can mark messages read" ON public.student_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all messages" ON public.student_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can send messages" ON public.student_messages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for student documents
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', false);

CREATE POLICY "Users can upload own docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'student-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can view all docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student-documents' AND public.has_role(auth.uid(), 'admin'));

-- Link applications to user accounts
ALTER TABLE public.applications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_documents_updated_at BEFORE UPDATE ON public.student_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
