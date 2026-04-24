import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, ArrowRight, Calendar, Clock, LogIn, Users, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import bgImage from "@/assets/students-corner.jpg";

const StudentsCorner = () => {
  const { t } = useTranslation();

  const items = [
    { key: "academicCalendar", to: "/academic-calendar", icon: Calendar },
    { key: "timetable", to: "/timetable", icon: Clock },
    { key: "smartWBU", to: "/portal/login", icon: LogIn, highlight: true },
    { key: "deanOfStudents", to: "/about#dean-of-students", icon: Users },
    { key: "registrarOffice", to: "/contact#registrar", icon: FileText },
  ] as const;

  return (
    <section className="relative isolate overflow-hidden">
      {/* Background image */}
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={1536}
        height={1024}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      <div className="container relative z-10 py-16 md:py-24 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-3 text-primary-foreground">
            <GraduationCap className="h-7 w-7 text-accent md:h-8 md:w-8" strokeWidth={1.75} />
            <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              {t("home.studentsCorner", "Student's Corner")}
            </h2>
          </div>
          <p className="mt-3 max-w-md text-sm text-primary-foreground/70 sm:text-base">
            {t("home.studentsCornerSub", "Quick access to academic life, schedules and the student portal")}
          </p>

          <ul className="mt-8 max-w-xl divide-y divide-primary-foreground/15 border-t border-primary-foreground/15">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.li
                  key={item.key}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                >
                  <Link
                    to={item.to}
                    className="group flex items-center gap-4 py-4 text-primary-foreground transition-colors hover:text-accent sm:py-5"
                  >
                    <Icon
                      className="h-5 w-5 shrink-0 text-primary-foreground/70 transition-colors group-hover:text-accent"
                      strokeWidth={1.75}
                    />
                    <span className="flex-1 text-base font-medium tracking-wide sm:text-lg">
                      {t(`home.${item.key}`, item.key)}
                    </span>
                    {item.highlight && (
                      <span className="hidden rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent sm:inline-block">
                        {t("home.smartWBUTag", "Login")}
                      </span>
                    )}
                    <ArrowRight
                      className="h-5 w-5 shrink-0 text-primary-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-accent"
                      strokeWidth={2}
                    />
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </motion.div>
      </div>
    </section>
  );
};

export default StudentsCorner;
