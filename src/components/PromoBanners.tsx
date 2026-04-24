import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PromoBanners = () => {
  const { data: banners = [] } = useQuery({
    queryKey: ["promo-banners-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (!banners.length) return null;

  const isExternal = (link: string) => /^https?:\/\//i.test(link);

  return (
    <div>
      {banners.map((b, i) => (
        <section key={b.id} className="relative isolate overflow-hidden">
          {b.image_url && (
            <img
              src={b.image_url}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {/* Gradient overlay - alternate direction for visual rhythm */}
          <div
            className={`absolute inset-0 ${
              i % 2 === 0
                ? "bg-gradient-to-r from-black/80 via-black/55 to-black/25"
                : "bg-gradient-to-l from-black/80 via-black/55 to-black/25"
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          <div className="container relative z-10 py-20 md:py-28 lg:py-32">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`max-w-xl text-primary-foreground ${
                i % 2 === 0 ? "" : "ml-auto text-right"
              }`}
            >
              <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
                {b.title}
              </h2>
              {b.description && (
                <p className="mt-5 text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
                  {b.description}
                </p>
              )}
              {b.button_text && b.button_link && (
                <div className={`mt-8 ${i % 2 === 0 ? "" : "flex justify-end"}`}>
                  {isExternal(b.button_link) ? (
                    <a
                      href={b.button_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 rounded-none bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-accent-foreground shadow-lg shadow-accent/20 transition-all duration-300 hover:bg-accent/90 hover:shadow-xl hover:shadow-accent/30"
                    >
                      {b.button_text}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  ) : (
                    <Link
                      to={b.button_link}
                      className="group inline-flex items-center gap-2 rounded-none bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-accent-foreground shadow-lg shadow-accent/20 transition-all duration-300 hover:bg-accent/90 hover:shadow-xl hover:shadow-accent/30"
                    >
                      {b.button_text}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </section>
      ))}
    </div>
  );
};

export default PromoBanners;
