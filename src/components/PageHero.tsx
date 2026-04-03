import { motion } from "framer-motion";

interface PageHeroProps {
  title: string;
  subtitle?: string;
}

const PageHero = ({ title, subtitle }: PageHeroProps) => (
  <section className="relative overflow-hidden bg-primary py-20 text-primary-foreground md:py-28">
    {/* Decorative shapes */}
    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10" />
    <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-accent/5" />

    <div className="container relative">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="heading-xl"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-4 max-w-2xl text-lg opacity-80"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  </section>
);

export default PageHero;
