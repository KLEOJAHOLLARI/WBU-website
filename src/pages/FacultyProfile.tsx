import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { ArrowLeft, Mail, Building2, GraduationCap, BookOpen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const FacultyProfile = () => {
  const { id } = useParams<{ id: string }>();

  // Fetch profile data (linked via user_id = professor_id on courses)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["faculty-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Try to match a professors table entry by name for extended bio/photo
  const { data: professorEntry } = useQuery({
    queryKey: ["faculty-professor-entry", profile?.full_name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professors")
        .select("*")
        .ilike("name", profile!.full_name)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.full_name,
  });

  // Fetch courses taught by this professor
  const { data: courses = [] } = useQuery({
    queryKey: ["faculty-courses", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code, program, year, semester")
        .eq("professor_id", id!)
        .order("year")
        .order("semester");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const photoUrl = professorEntry?.photo_url || profile?.avatar_url;
  const bio = professorEntry?.bio;
  const department = professorEntry?.department;
  const title = professorEntry?.title;
  const name = profile?.full_name || professorEntry?.name || "Professor";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (profileLoading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <p className="text-muted-foreground text-center">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Professor Not Found</h1>
          <p className="text-muted-foreground mb-6">This profile does not exist or is not accessible.</p>
          <Link to="/faculty" className="text-primary hover:underline inline-flex items-center gap-1">
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
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Faculty
        </Link>

        {/* Profile Header */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-28 w-28 border-4 border-primary/10">
              {photoUrl ? (
                <AvatarImage src={photoUrl} alt={name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{name}</h1>
              {title && (
                <p className="mt-1 text-lg text-primary font-medium">{title}</p>
              )}
              <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-3">
                {department && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> {department}
                  </span>
                )}
                {profile.email && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {profile.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {bio && (
            <div className="mt-6 pt-6 border-t border-border">
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{bio}</p>
            </div>
          )}
        </div>

        {/* Courses Taught */}
        {courses.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Courses Taught
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-xl border border-border bg-card p-4 flex items-start gap-3"
                >
                  <div className="rounded-md bg-primary/10 p-1.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{course.name}</h3>
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
