import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import wbuLogo from "@/assets/wbu-logo.png";

const navKeys = [
  { to: "/", key: "nav.home" },
  { to: "/about", key: "nav.about" },
  { to: "/programs", key: "nav.programs" },
  { to: "/faculty", key: "nav.faculty" },
  { to: "/timetable", key: "nav.timetable" },
  { to: "/admissions", key: "nav.admissions" },
  { to: "/scholarships", key: "nav.scholarships" },
  { to: "/news", key: "nav.news" },
  { to: "/contact", key: "nav.contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navBg = scrolled || !isHome
    ? "bg-card/95 backdrop-blur-xl border-b border-border shadow-sm"
    : "bg-transparent border-b border-transparent";

  const textColor = scrolled || !isHome ? "text-foreground" : "text-primary-foreground";
  const mutedColor = scrolled || !isHome ? "text-muted-foreground" : "text-primary-foreground/70";
  const activeColor = scrolled || !isHome ? "bg-secondary text-secondary-foreground" : "bg-primary-foreground/10 text-primary-foreground";
  const logoColor = scrolled || !isHome ? "text-primary" : "text-primary-foreground";

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="container flex h-16 items-center justify-between lg:h-18">
        <Link to="/" className="flex items-center gap-2.5">
          <GraduationCap className={`h-8 w-8 ${logoColor} transition-colors`} />
          <span className={`font-display text-xl font-bold ${logoColor} transition-colors`}>
            WBU<span className="text-accent">.</span>
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {navKeys.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-secondary/80 hover:text-secondary-foreground ${
                location.pathname === l.to ? activeColor : mutedColor
              }`}
            >
              {t(l.key)}
            </Link>
          ))}
          <div className="ml-2 flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/smartwbu"
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 border ${
                scrolled || !isHome
                  ? "border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                  : "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              }`}
            >
              SmartWBU
            </Link>
            <Link
              to="/admissions"
              className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-all duration-200 hover:shadow-xl hover:shadow-accent/30 hover:scale-105"
            >
              {t("nav.applyNow")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className={`inline-flex items-center justify-center rounded-lg p-2 ${textColor} lg:hidden`}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="overflow-hidden border-t border-border bg-card lg:hidden">

            <nav className="container flex flex-col gap-1 py-4">
              {navKeys.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary ${
                    location.pathname === l.to
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {t(l.key)}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-3 px-3">
                <LanguageSwitcher />
              </div>
              <Link to="/smartwbu" onClick={() => setOpen(false)} className="mt-2 rounded-lg border border-primary/20 px-4 py-2.5 text-center text-sm font-semibold text-primary">SmartWBU</Link>
              
              <Link to="/admissions" onClick={() => setOpen(false)} className="mt-3 rounded-full bg-accent px-4 py-2.5 text-center text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/25">
                {t("nav.applyNow")}
              </Link>
            </nav>
        </div>
      )}

    </header>
  );
};

export default Navbar;
