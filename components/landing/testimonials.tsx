import { QuoteIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "./section-heading";

// Placeholder quotes for the demo. Replace them with real member feedback before launch.
const QUOTES = [
  {
    quote: "My sisters and I live on three continents. Unitus is the first time our chama has actually run on time.",
    name: "Amina O.",
    place: "London · family chama",
    initials: "AO",
    tone: "bg-accent text-accent-foreground",
  },
  {
    quote: "The random draw ended the arguments about whose turn it is. Everyone can see the result straight away.",
    name: "Joseph M.",
    place: "Dubai · workmates chama",
    initials: "JM",
    tone: "bg-primary text-primary-foreground",
  },
  {
    quote: "I took a loan for my shop's stock at the rate we agreed, and the interest went back to the group.",
    name: "Faith N.",
    place: "Nairobi · church group",
    initials: "FN",
    tone: "bg-clay text-white",
  },
];

export function Testimonials() {
  return (
    <section className="bg-secondary/40 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading className="reveal" eyebrow="Member stories" title="Groups that stay close, wherever they live" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {QUOTES.map((q) => (
            <Card key={q.name} className="rounded-3xl">
              <CardContent className="flex h-full flex-col gap-6 p-6">
                <QuoteIcon className="size-8 text-accent" />
                <p className="flex-1 font-heading text-lg leading-relaxed">{q.quote}</p>
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback className={`font-semibold ${q.tone}`}>{q.initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-semibold">{q.name}</p>
                    <p className="text-muted-foreground">{q.place}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
