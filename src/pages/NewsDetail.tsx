import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import { newsArticles } from "@/data/news";

const NewsDetail = () => {
  const { id } = useParams();
  const article = newsArticles.find((a) => a.id === id);

  if (!article) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="heading-lg text-foreground">Article Not Found</h1>
          <Link to="/news" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to News
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="section-padding">
        <div className="container max-w-3xl">
          <Link to="/news" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to News
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(article.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              <span className="rounded-full bg-accent/15 px-3 py-0.5 text-xs font-semibold text-accent-foreground">
                {article.category}
              </span>
            </div>
            <h1 className="heading-xl text-foreground">{article.title}</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="mt-8 overflow-hidden rounded-xl">
              <img
                src={article.image}
                alt={article.title}
                className="w-full object-cover"
              />
            </div>
            <div className="mt-8 space-y-4 text-lg leading-relaxed text-muted-foreground">
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
