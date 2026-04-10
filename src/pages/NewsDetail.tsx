import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const NewsDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();

  const { data: article, isLoading } = useQuery({
    queryKey: ["news-article", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("news_articles").select("*").eq("slug", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <Layout><div className="container py-20 text-center text-muted-foreground">{t("news.loading")}</div></Layout>;

  if (!article) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="heading-lg text-foreground">{t("news.notFound")}</h1>
          <Link to="/news" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> {t("news.backToNews")}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="section-padding">
        <div className="container max-w-3xl">
          <Link to="/news" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("news.backToNews")}
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-5 flex items-center gap-3 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(article.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              <span className="rounded-full bg-accent/10 px-3 py-0.5 text-xs font-semibold text-accent">{article.category}</span>
            </div>
            <h1 className="heading-xl text-foreground">{article.title}</h1>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            {article.image_url && (
              <div className="mt-8 overflow-hidden rounded-2xl shadow-lg">
                <img src={article.image_url} alt={article.title} className="w-full object-cover" />
              </div>
            )}
            <div className="mt-10 space-y-5 text-lg leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">{article.excerpt}</p>
              <p>{article.content}</p>
            </div>
          </motion.div>
        </div>
      </article>
    </Layout>
  );
};

export default NewsDetail;
