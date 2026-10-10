"use client";

import { useState } from "react";
import { CheckCircle2Icon, Loader2Icon, PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/chama";

type Choice = { id: string; name: string };

/**
 * Sandbox helper: charges this month's deduction to the saved PayPal right now.
 * In production a scheduler does this on the deduction day.
 */
export function RunDeduction() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [choices, setChoices] = useState<Choice[] | null>(null);

  async function run(chamaId?: string) {
    setState("running");
    setMessage(null);
    try {
      const res = await fetch("/api/paypal/deductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chamaId ? { chamaId } : {}),
      });
      const data = await res.json();
      if (res.status === 400 && data.chamas) {
        // Member of several chamas: ask which one.
        setChoices(data.chamas);
        setState("idle");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "The deduction failed.");
      setChoices(null);
      const fee = data.charge ? ` (${money(data.charge.principal)} + ${money(data.charge.fee)} PayPal fee)` : "";
      setMessage(`${money(Number(data.amount))} collected for ${data.chama} (${data.period})${fee}${data.captureId ? ` · ref ${data.captureId}` : ""}`);
      setState("done");
    } catch (e) {
      setMessage((e as Error).message);
      setState("idle");
    }
  }

  const buttonClass = "w-fit bg-band-foreground/15 text-band-foreground hover:bg-band-foreground/25";

  return (
    <div className="mt-1 flex flex-col gap-2">
      {choices ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-band-foreground/85">Which chama?</p>
          <div className="flex flex-wrap gap-1.5">
            {choices.map((c) => (
              <Button key={c.id} size="sm" variant="secondary" className={buttonClass} disabled={state === "running"} onClick={() => run(c.id)}>
                {c.name}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => run()} disabled={state === "running" || state === "done"} className={buttonClass}>
          {state === "running" ? <Loader2Icon className="animate-spin" /> : state === "done" ? <CheckCircle2Icon /> : <PlayIcon />}
          {state === "done" ? "Collected" : "Run it now (sandbox)"}
        </Button>
      )}
      {message && <p className="text-xs text-band-foreground/85">{message}</p>}
    </div>
  );
}
