import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowRight, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const faculties = [
  "Faculty of Engineering",
  "Faculty of Economics",
  "Faculty of Law",
  "Faculty of Medicine",
  "Faculty of Arts & Sciences",
];
const degrees = ["Bachelor", "Master", "PhD"];

const Programs = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("");
  const [degree, setDegree] = useState("");

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("title");
      if (error) throw error;
      return data;
    },
  });

  const filtered = programs.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesFaculty = !faculty || p.faculty === faculty;
    const matchesDegree = !degree || p.degree === degree;
    return matchesSearch && matchesFaculty && matchesDegree;
  });

  return (
    <Layout>
      <PageHero title={t("programs.title")} subtitle={t("programs.subtitle")} />

      <section className="section-padding">
        <div className="container">
          <div className="mb-10 flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder={t("programs.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
            </div>
            <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow">
              <option value="">{t("programs.allFaculties")}</option>
              {faculties.map((f) => (<option key={f} value={f}>{f}</option>))}
            </select>
            <select value={degree} onChange={(e) => setDegree(e.target.value)} className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow">
              <option value="">{t("programs.allDegrees")}</option>
              {degrees.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground">{t("programs.loading")}</div>
          ) : filtered.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">{t("programs.noResults")}</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.05 }}>
                  <Link to={`/programs/${p.slug}`} className="glass-card group flex h-full flex-col p-7">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-full bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">{p.degree}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {p.duration}</span>
                    </div>
                    <h3 className="font-display text-xl font-semibold text-foreground transition-colors group-hover:text-primary">{p.title}</h3>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">{p.faculty}</p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground/80">{p.description}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-all group-hover:gap-2.5">{t("programs.learnMore")} <ArrowRight className="h-3.5 w-3.5" /></span>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Programs;
