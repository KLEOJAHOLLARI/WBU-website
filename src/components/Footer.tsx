import { Link } from "react-router-dom";
import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-7 w-7" />
              <span className="font-display text-xl font-bold">
                WBU<span className="text-accent">.</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed opacity-80">{t("footer.description")}</p>
          </div>

          <div>
            <h4 className="mb-4 font-display text-lg font-semibold">{t("footer.quickLinks")}</h4>
            <ul className="space-y-2 text-sm opacity-80">
              {[
                { to: "/about", key: "footer.aboutUs" },
                { to: "/programs", key: "nav.programs" },
                { to: "/admissions", key: "nav.admissions" },
                { to: "/news", key: "nav.news" },
                { to: "/contact", key: "footer.contact" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="transition-opacity hover:opacity-100">{t(l.key)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display text-lg font-semibold">{t("footer.faculties")}</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>{t("footer.facultyEngineering")}</li>
              <li>{t("footer.facultyEconomics")}</li>
              <li>{t("footer.facultyLaw")}</li>
              <li>{t("footer.facultyMedicine")}</li>
              <li>{t("footer.facultyArts")}</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display text-lg font-semibold">{t("footer.contact")}</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Highway Tiranë–Durrës, KM 7, Kashar, Tirana, Albania</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span>+355 67 60 20 600</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span>info@wbu.edu.al</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-primary-foreground/20 pt-6 text-center text-sm opacity-60">
          © {new Date().getFullYear()} Western Balkan University. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
