import { motion } from "framer-motion";

interface PageHeroProps {
  title: string;
  subtitle?: string;
}

const PageHero = ({ title, subtitle }: PageHeroProps) => (
  <section className="relative overflow-hidden bg-primary py-24 text-primary-foreground md:py-32">
    {/* Ambient shapes */}
    <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/8 blur-3xl" />
    <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-accent/5 blur-3xl" />

    <div className="container relative">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="heading-xl"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 max-w-2xl text-lg leading-relaxed text-primary-foreground/70"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  </section>
);

export default PageHero;
