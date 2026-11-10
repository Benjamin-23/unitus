"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcwIcon, SendIcon, SparklesIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };

export type ChamaAssistantProps = {
  chamaId: string;
  chamaName: string;
  suggestions: readonly string[];
  maxQuestionLength: number;
  maxTurns: number;
};

/** Ask Claude about this chama: payments, loans, rounds and the statement. */
export function ChamaAssistant({ chamaId, chamaName, suggestions, maxQuestionLength, maxTurns }: ChamaAssistantProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns]);

  // Room for one more question and its answer.
  const full = turns.length + 2 > maxTurns;

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy || full) return;
    const history: Turn[] = [...turns, { role: "user", content: q }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setQuestion("");
    setBusy(true);
    setError(null);

    let answer = "";
    try {
      const res = await fetch(`/api/chamas/${chamaId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "The assistant couldn't answer. Please try again.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (let r = await reader.read(); !r.done; r = await reader.read()) {
        answer += decoder.decode(r.value, { stream: true });
        setTurns([...history, { role: "assistant", content: answer }]);
      }
      if (!answer.trim()) throw new Error("The assistant didn't answer. Please try again.");
    } catch (err) {
      // Drop the unanswered question, so the conversation stays question, answer, question…
      setTurns(turns);
      setQuestion(q);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <SparklesIcon className="size-5" />
          </div>
          <div className="flex flex-col gap-1.5">
            <CardTitle className="font-heading text-xl">Ask about {chamaName}</CardTitle>
            <CardDescription>
              Questions about your payments, loans, rounds or statement, answered from your chama&apos;s records by Claude. It explains; it
              can&apos;t move money.
            </CardDescription>
          </div>
        </div>
        {turns.length > 0 && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setTurns([])} disabled={busy}>
            <RotateCcwIcon data-icon="inline-start" /> New chat
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {turns.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button key={s} variant="outline" className="h-auto rounded-full py-1.5 text-left whitespace-normal" onClick={() => ask(s)}>
                {s}
              </Button>
            ))}
          </div>
        ) : (
          <div ref={logRef} role="log" aria-live="polite" className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto">
            {turns.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                  t.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted",
                )}
              >
                {t.content || <span className="animate-pulse text-muted-foreground">Looking at your chama…</span>}
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {full ? (
          <p className="text-sm text-muted-foreground">This conversation is full. Start a new chat to keep asking.</p>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <Textarea
              aria-label="Your question"
              placeholder="e.g. Why was I charged $156.40 in round 3?"
              className="max-h-40 min-h-10"
              rows={1}
              maxLength={maxQuestionLength}
              value={question}
              disabled={busy}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(question);
                }
              }}
            />
            <Button type="submit" size="icon" className="size-10 shrink-0" disabled={busy || !question.trim()} aria-label="Ask">
              <SendIcon />
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
