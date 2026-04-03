import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { newsArticles, type NewsArticle } from "@/data/news";

const categories = ["All", "News", "Event", "Announcement"] as const;

const News = () => {
  const [active, setActive] = useState<string>("All");

  const filtered = active === "All"
    ? newsArticles
    : newsArticles.filter((a) => a.category === active);

  return (
    <Layout>
      <PageHero
        title="News & Events"
        subtitle="Stay informed about the latest happenings at Akademia University"
      />

      <section className="section-padding">
        <div className="container">
          {/* Filter tabs */}
          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  to={`/news/${a.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={a.image}
                      alt={a.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(a.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-foreground">
                        {a.category}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary">
                      {a.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {a.excerpt}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Read more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default News;
