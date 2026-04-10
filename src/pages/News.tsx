import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const News = () => {
  const { t } = useTranslation();
  const categories = [
    { value: "All", label: t("news.all") },
    { value: "News", label: t("news.newsCategory") },
    { value: "Event", label: t("news.event") },
    { value: "Announcement", label: t("news.announcement") },
  ];
  const [active, setActive] = useState("All");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news_articles").select("*").order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = active === "All" ? articles : articles.filter((a) => a.category === active);

  return (
    <Layout>
      <PageHero title={t("news.title")} subtitle={t("news.subtitle")} />

      <section className="section-padding">
        <div className="container">
          <div className="mb-10 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c.value} onClick={() => setActive(c.value)} className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${active === c.value ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                {c.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground">{t("news.loading")}</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.05 }}>
                  <Link to={`/news/${a.slug}`} className="glass-card group flex h-full flex-col overflow-hidden">
                    {a.image_url && (
                      <div className="aspect-video overflow-hidden">
                        <img src={a.image_url} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(a.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">{a.category}</span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{a.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{a.excerpt}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-all group-hover:gap-2.5">{t("news.readMore")} <ArrowRight className="h-3.5 w-3.5" /></span>
                    </div>
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

export default News;
