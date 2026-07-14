import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteLogo } from "@/hooks/useSiteLogo";

const Footer = () => {
  const { t } = useTranslation();
  const wbuLogo = useSiteLogo();

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="mb-5 flex items-center">
              <img
                src={wbuLogo}
                alt="WBU — Western Balkans University"
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-sm leading-relaxed text-primary-foreground/70">{t("footer.description")}</p>
          </div>

          <div>
            <h4 className="mb-5 font-display text-lg font-semibold">{t("footer.quickLinks")}</h4>
            <ul className="space-y-3 text-sm">
              {[
                { to: "/about", key: "footer.aboutUs" },
                { to: "/programs", key: "nav.programs" },
                { to: "/admissions", key: "nav.admissions" },
                { to: "/news", key: "nav.news" },
                { to: "/contact", key: "footer.contact" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-primary-foreground/60 transition-colors hover:text-primary-foreground">{t(l.key)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-display text-lg font-semibold">{t("footer.faculties")}</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/60">
              <li>{t("footer.facultyEngineering")}</li>
              <li>{t("footer.facultyEconomics")}</li>
              <li>{t("footer.facultyLaw")}</li>
              <li>{t("footer.facultyMedicine")}</li>
              <li>{t("footer.facultyArts")}</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-display text-lg font-semibold">{t("footer.contact")}</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/60">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Highway Tiranë–Durrës, KM 7, Kashar, Tirana, Albania</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-accent" />
                <span>+355 67 60 20 600</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-accent" />
                <span>info@wbu.edu.al</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-primary-foreground/10 pt-8 text-center text-sm text-primary-foreground/40">
          © 2026 Western Balkan University. {t("footer.rights")} Kleo Jahollari.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
