import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { ArrowLeft, Mail, Building2, GraduationCap, BookOpen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type FacultyProfileData = {
  profile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
  } | null;
  professor: {
    id: string;
    name: string;
    photo_url: string | null;
    bio: string;
    department: string;
    title: string;
  } | null;
  resolvedProfessorId: string | null;
};

const FacultyProfile = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<FacultyProfileData | null>({
    queryKey: ["faculty-profile", id],
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, email")
        .eq("user_id", id!)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data: professorById, error: professorByIdError } = await supabase
        .from("professors")
        .select("id, name, photo_url, bio, department, title")
        .eq("id", id!)
        .maybeSingle();

      if (professorByIdError) throw professorByIdError;

      let professorByName = null;
      if (profile?.full_name) {
        const { data: professorByProfileName, error: professorByNameError } = await supabase
          .from("professors")
          .select("id, name, photo_url, bio, department, title")
          .ilike("name", profile.full_name)
          .maybeSingle();

        if (professorByNameError) throw professorByNameError;
        professorByName = professorByProfileName;
      }

      const professor = professorById ?? professorByName;

      if (!profile && !professor) {
        return null;
      }

      return {
        profile,
        professor,
        resolvedProfessorId: profile?.user_id ?? null,
      };
    },
    enabled: !!id,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["faculty-courses", data?.resolvedProfessorId],
    queryFn: async () => {
      const { data: taughtCourses, error: coursesError } = await supabase
        .from("courses")
        .select("id, name, code, program, year, semester")
        .eq("professor_id", data!.resolvedProfessorId!)
        .order("year")
        .order("semester");

      if (coursesError) throw coursesError;
      return taughtCourses || [];
    },
    enabled: !!data?.resolvedProfessorId,
  });

  const profile = data?.profile;
  const professor = data?.professor;
  const photoUrl = professor?.photo_url || profile?.avatar_url;
  const bio = professor?.bio;
  const department = professor?.department;
  const title = professor?.title;
  const name = profile?.full_name || professor?.name || "Professor";
  const email = profile?.email;
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <p className="text-center text-muted-foreground">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
          <h1 className="mb-2 font-display text-2xl font-bold text-foreground">Professor Not Found</h1>
          <p className="mb-6 text-muted-foreground">This professor profile does not exist or is not accessible.</p>
          <Link to="/faculty" className="inline-flex items-center gap-1 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Faculty
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Link
          to="/faculty"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Faculty
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <Avatar className="h-28 w-28 border-4 border-primary/10">
              {photoUrl ? <AvatarImage src={photoUrl} alt={name} /> : null}
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{name}</h1>
              {title && <p className="mt-1 text-lg font-medium text-primary">{title}</p>}
              <div className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
                {department && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> {department}
                  </span>
                )}
                {email && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {bio && (
            <div className="mt-6 border-t border-border pt-6">
              <h2 className="mb-2 font-display text-lg font-semibold text-foreground">About</h2>
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{bio}</p>
            </div>
          )}
        </div>

        {courses.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <GraduationCap className="h-5 w-5 text-primary" />
              Courses Taught
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="rounded-md bg-primary/10 p-1.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{course.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {course.code} · Year {course.year} · Sem {course.semester}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FacultyProfile;
