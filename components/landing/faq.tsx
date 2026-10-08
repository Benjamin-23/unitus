import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SectionHeading } from "./section-heading";

const FAQS = [
  {
    q: "What is a chama?",
    a: "A chama is an informal savings group, popular across East Africa, where members pool money regularly to support each other. Unitus brings the same idea online so members can take part from anywhere.",
  },
  {
    q: "How is the monthly merry-go-round winner chosen?",
    a: "Once every member has paid that month's contribution, Unitus draws one member at random from those who haven't received a payout yet in the current cycle. The result and its timestamp are added to the group's ledger for everyone to see.",
  },
  {
    q: "Where is the money kept?",
    a: "In the PayPal account your group connects when it's created. Unitus records every movement, but contributions and payouts go through PayPal.",
  },
  {
    q: "When are savings shared out?",
    a: "Your group picks mid-year or year end when it's created. On the share-out date, each member receives their own savings plus their share of the interest earned from member loans.",
  },
  {
    q: "How much can I borrow, and at what interest?",
    a: "Your limit is your total savings multiplied by the group's loan multiplier (for example 3×). The interest rate is set when the group is created and applies equally to every member.",
  },
  {
    q: "Can the rules be changed after the chama starts?",
    a: "No. Contributions, savings, the joining fee and loan terms are locked when the chama is created, so nobody can change them later. If members want different rules, they start a new chama once the current one is closed.",
  },
  {
    q: "Can an admin take money out of the chama?",
    a: "No. Nobody can withdraw from the chama account, admins included. Money only leaves through the payouts the rules define: the monthly winner, the savings share-out, approved loans, and a leaving member's savings after the cycle ends.",
  },
  {
    q: "What are partner offers?",
    a: "Member-only deals from verified businesses, ranked by how well they fit your payout. You pay the business with your own PayPal, businesses never see your details, and you can turn offers off at any time.",
  },
  {
    q: "What happens if a member misses a contribution?",
    a: "Unitus sends reminders before and after the due date, and the group admins can see who's outstanding. The draw waits until the pot is complete, so nobody loses out because of a late payment.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading
          align="left"
          eyebrow="FAQ"
          title="Questions members ask"
          description="Can't find an answer? Ask your group admin or write to us. We read everything."
        />
        <Accordion defaultValue={["faq-0"]} className="rounded-3xl border bg-card px-6">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`faq-${i}`}>
              <AccordionTrigger className="py-5 text-base hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="pb-5 text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
