import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, BookOpen, Briefcase, ArrowRight, GraduationCap, Layers } from "lucide-react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import HonorListSection from "@/components/HonorListSection";

const ProgramDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();

  const { data: program, isLoading } = useQuery({
    queryKey: ["program", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").eq("slug", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: adminCourses = [] } = useQuery({
    queryKey: ["program-courses", program?.slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, year, semester, ects")
        .eq("program", program!.slug)
        .order("year")
        .order("semester")
        .order("code");
      if (error) throw error;
      return data || [];
    },
    enabled: !!program?.slug,
  });


  if (isLoading) return <Layout><div className="container py-20 text-center text-muted-foreground">{t("programs.loading")}</div></Layout>;

  if (!program) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="heading-lg text-foreground">{t("programs.notFound")}</h1>
          <Link to="/programs" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> {t("programs.backToPrograms")}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="relative overflow-hidden bg-primary py-24 text-primary-foreground md:py-32">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/8 blur-3xl" />
        <div className="container relative">
          <Link to="/programs" className="mb-6 inline-flex items-center gap-2 text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("programs.allPrograms")}
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">{program.degree}</span>
              <span className="flex items-center gap-1.5 text-sm text-primary-foreground/60"><Clock className="h-3.5 w-3.5" /> {program.duration}</span>
            </div>
            <h1 className="heading-xl">{program.title}</h1>
            <p className="mt-3 text-lg text-primary-foreground/70">{program.faculty}</p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <h2 className="heading-md text-foreground">{t("programs.programOverview")}</h2>
              <div className="mt-3 h-1 w-12 rounded-full bg-accent" />
              <p className="mt-5 leading-relaxed text-muted-foreground">{program.overview}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <h2 className="heading-md text-foreground flex items-center gap-2"><BookOpen className="h-6 w-6 text-accent" /> {t("programs.keyCourses")}</h2>
              {adminCourses.length === 0 ? (
                <p className="mt-5 rounded-xl border border-dashed border-border bg-secondary/30 px-5 py-6 text-sm text-muted-foreground">
                  {t("programs.noCoursesYet", "No courses have been added for this program yet.")}
                </p>
              ) : (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {adminCourses.map((c) => (
                    <li key={c.id} className="glass-card flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-foreground">
                      {c.code && (
                        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">{c.code}</span>
                      )}
                      <span className="truncate">{c.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            {adminCourses.length > 0 && (() => {
              const groupedByYear: Record<number, Record<number, typeof adminCourses>> = {};
              adminCourses.forEach((c) => {
                groupedByYear[c.year] = groupedByYear[c.year] || {};
                groupedByYear[c.year][c.semester] = groupedByYear[c.year][c.semester] || [];
                groupedByYear[c.year][c.semester].push(c);
              });
              const years = Object.keys(groupedByYear).map(Number).sort((a, b) => a - b);
              const totalEcts = adminCourses.reduce((sum, c) => sum + (c.ects || 0), 0);
              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}>
                  <div className="flex items-end justify-between gap-4 flex-wrap">
                    <h2 className="heading-md text-foreground flex items-center gap-2">
                      <GraduationCap className="h-6 w-6 text-accent" /> {t("programs.curriculum", "Recommended Curriculum")}
                    </h2>
                    <span className="text-sm font-medium text-muted-foreground">
                      {totalEcts} ECTS {t("programs.total", "total")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
                    {t("programs.curriculumDesc", "Suggested study plan organized by year and semester.")}
                  </p>

                  <div className="mt-6 space-y-8">
                    {years.map((year) => {
                      const semesters = Object.keys(groupedByYear[year]).map(Number).sort((a, b) => a - b);
                      const yearEcts = semesters.reduce(
                        (acc, s) => acc + groupedByYear[year][s].reduce((sum, c) => sum + (c.ects || 0), 0), 0
                      );
                      return (
                        <div key={year}>
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground font-display text-sm font-bold">
                              {year}
                            </div>
                            <h3 className="font-display text-xl font-semibold text-foreground">
                              {t("programs.year", "Year")} {year}
                            </h3>
                            <span className="ml-auto text-xs font-medium text-muted-foreground">{yearEcts} ECTS</span>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            {semesters.map((semNum) => {
                              const courses = groupedByYear[year][semNum];
                              const semEcts = courses.reduce((sum, c) => sum + (c.ects || 0), 0);
                              return (
                                <div key={`${year}-${semNum}`} className="glass-card overflow-hidden p-0">
                                  <div className="flex items-center justify-between border-b border-border/50 bg-secondary/40 px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <Layers className="h-4 w-4 text-accent" />
                                      <span className="text-sm font-semibold text-foreground">
                                        {t("programs.semester", "Semester")} {semNum}
                                      </span>
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">{semEcts} ECTS</span>
                                  </div>
                                  <ul className="divide-y divide-border/40">
                                    {courses.map((c) => (
                                      <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                                        {c.code && (
                                          <span className="mt-0.5 shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                                            {c.code}
                                          </span>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium text-foreground leading-snug">{c.name}</p>
                                          <span className="mt-1 inline-block text-[11px] font-medium text-muted-foreground">{c.ects} ECTS</span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })()}


            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <h2 className="heading-md text-foreground flex items-center gap-2"><Briefcase className="h-6 w-6 text-accent" /> {t("programs.careerPaths")}</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {program.careers?.map((c: string) => (
                  <span key={c} className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">{c}</span>
                ))}
              </div>
            </motion.div>
          </div>

          <div>
            <div className="glass-card sticky top-24 p-7">
              <h3 className="font-display text-lg font-semibold text-foreground">{t("programs.quickFacts")}</h3>
              <dl className="mt-5 space-y-4 text-sm">
                <div><dt className="text-muted-foreground">{t("programs.degree")}</dt><dd className="font-semibold text-foreground">{program.degree}</dd></div>
                <div><dt className="text-muted-foreground">{t("programs.duration")}</dt><dd className="font-semibold text-foreground">{program.duration}</dd></div>
                <div><dt className="text-muted-foreground">{t("programs.faculty")}</dt><dd className="font-semibold text-foreground">{program.faculty}</dd></div>
              </dl>
              <Link to="/admissions" className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all duration-200 hover:shadow-xl hover:scale-105">
                {t("programs.applyNow")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <HonorListSection programSlug={program.slug} programTitle={program.title} />
    </Layout>
  );
};

export default ProgramDetail;
