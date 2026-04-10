interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
}

const SectionHeading = ({ title, subtitle, centered = true }: SectionHeadingProps) => (
  <div className={`mb-12 md:mb-16 ${centered ? "text-center" : ""}`}>
    <h2 className="heading-lg text-foreground">{title}</h2>
    {subtitle && (
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
    )}
    <div className={`mt-5 h-1 w-16 rounded-full bg-accent ${centered ? "mx-auto" : ""}`} />
  </div>
);

export default SectionHeading;
