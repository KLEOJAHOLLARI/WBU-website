import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const Faculty = () => {
  const { t } = useTranslation();

  const { data: professors = [], isLoading } = useQuery({
    queryKey: ["professors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professors")
        .select("*")
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const departments = [...new Set(professors.map((p) => p.department))];

  return (
    <Layout>
      <PageHero title={t("faculty.title")} subtitle={t("faculty.subtitle")} />

      <section className="section-padding">
        <div className="container">
          {isLoading ? (
            <p className="text-center text-muted-foreground">{t("faculty.loading")}</p>
          ) : professors.length === 0 ? (
            <p className="text-center text-muted-foreground">{t("faculty.empty")}</p>
          ) : (
            departments.map((dept) => (
              <div key={dept} className="mb-14 last:mb-0">
                <h2 className="mb-2 font-display text-2xl font-semibold text-foreground">{dept}</h2>
                <div className="mb-7 h-1 w-12 rounded-full bg-accent" />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {professors
                    .filter((p) => p.department === dept)
                    .map((p, i) => (
                      <motion.div
                        key={p.id}
                        {...stagger}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                        className="glass-card overflow-hidden"
                      >
                        <div className="aspect-[3/4] overflow-hidden bg-secondary">
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt={p.name}
                              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-5xl font-bold text-muted-foreground/20">
                              {p.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="font-display text-base font-semibold text-foreground">{p.name}</h3>
                          <p className="mt-0.5 text-sm font-medium text-accent">{p.title}</p>
                          {p.bio && (
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">{p.bio}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Faculty;
