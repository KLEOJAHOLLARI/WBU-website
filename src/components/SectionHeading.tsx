interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
}

const SectionHeading = ({ title, subtitle, centered = true }: SectionHeadingProps) => (
  <div className={`mb-10 md:mb-14 ${centered ? "text-center" : ""}`}>
    <h2 className="heading-lg text-foreground">{title}</h2>
    {subtitle && (
      <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>
    )}
    <div className={`mt-4 h-1 w-16 rounded-full bg-accent ${centered ? "mx-auto" : ""}`} />
  </div>
);

export default SectionHeading;
