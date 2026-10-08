import { CarIcon, GraduationCapIcon, SmartphoneIcon, SofaIcon, SproutIcon, TvIcon } from "lucide-react";
import type { OfferCategory } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

const ICONS = {
  Electronics: { icon: TvIcon, tone: "bg-sky/20 text-sky" },
  Vehicles: { icon: CarIcon, tone: "bg-clay/20 text-clay" },
  Home: { icon: SofaIcon, tone: "bg-accent/25 text-accent-foreground dark:text-accent" },
  Phones: { icon: SmartphoneIcon, tone: "bg-primary/15 text-primary" },
  Education: { icon: GraduationCapIcon, tone: "bg-chart-5/20 text-chart-5" },
  Farming: { icon: SproutIcon, tone: "bg-primary/15 text-primary" },
} satisfies Record<OfferCategory, { icon: React.ComponentType<{ className?: string }>; tone: string }>;

/** Product image stand-in until merchants upload photos. */
export function CategoryTile({ category, className }: { category: OfferCategory; className?: string }) {
  const { icon: Icon, tone } = ICONS[category];
  return (
    <div className={cn("flex items-center justify-center rounded-2xl", tone, className)}>
      <Icon className="size-1/3" />
    </div>
  );
}

export function CategoryIcon({ category, className }: { category: OfferCategory; className?: string }) {
  const Icon = ICONS[category].icon;
  return <Icon className={className} />;
}
