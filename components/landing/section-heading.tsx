import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  align = "center",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("flex flex-col gap-4", align === "center" && "mx-auto items-center text-center", "max-w-2xl", className)}>
      <span className="text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</span>
      <h2 className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {description && <p className="text-lg text-pretty text-muted-foreground">{description}</p>}
    </div>
  );
}
