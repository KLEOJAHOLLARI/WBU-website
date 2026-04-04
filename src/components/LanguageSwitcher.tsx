import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("sq") ? "sq" : "en";

  const toggle = () => {
    i18n.changeLanguage(current === "en" ? "sq" : "en");
  };

  return (
    <button
      onClick={toggle}
      className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
      aria-label="Switch language"
    >
      {current === "en" ? "🇦🇱 SQ" : "🇬🇧 EN"}
    </button>
  );
};

export default LanguageSwitcher;
