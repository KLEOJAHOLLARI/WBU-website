import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, BookOpen, Briefcase, ArrowRight } from "lucide-react";
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
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {program.courses?.map((c: string) => (
                  <li key={c} className="glass-card px-5 py-3.5 text-sm font-medium text-foreground">{c}</li>
                ))}
              </ul>
            </motion.div>

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
    </Layout>
  );
};

export default ProgramDetail;
