import Anthropic from "@anthropic-ai/sdk";
import { askAssistant, chamaContext, MAX_QUESTION_LENGTH, MAX_TURNS } from "@/lib/assistant";
import { getSession } from "@/lib/auth/session";
import { getChamaDashboard } from "@/lib/dashboard";

type Turn = { role: "user" | "assistant"; content: string };

/** The conversation so far, checked: alternating turns that start and end with the member. */
function readHistory(body: unknown): Turn[] | null {
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_TURNS) return null;
  const turns: Turn[] = [];
  for (const [i, m] of messages.entries()) {
    const role = i % 2 === 0 ? "user" : "assistant";
    const content = (m as { content?: unknown })?.content;
    if ((m as { role?: unknown })?.role !== role || typeof content !== "string" || !content.trim()) return null;
    if (role === "user" && content.length > MAX_QUESTION_LENGTH) return null;
    turns.push({ role, content: content.slice(0, 8000) });
  }
  return turns.at(-1)?.role === "user" ? turns : null;
}

/** Answers a member's question about their chama, streamed as plain text. */
export async function POST(request: Request, ctx: RouteContext<"/api/chamas/[chamaId]/assistant">) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Please log in again." }, { status: 401 });
  const { chamaId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(chamaId)) return Response.json({ error: "Chama not found." }, { status: 404 });

  const history = readHistory(await request.json().catch(() => null));
  if (!history) {
    return Response.json({ error: `Ask a question of up to ${MAX_QUESTION_LENGTH} characters.` }, { status: 400 });
  }

  // Only the chama's members and admin can see its records, so only they can ask about them.
  const dashboard = await getChamaDashboard(chamaId, session.memberId);
  if (!dashboard) return Response.json({ error: "Chama not found." }, { status: 404 });

  const stream = askAssistant(chamaContext(dashboard, session.name ?? "Member"), history);
  const events = stream[Symbol.asyncIterator]();

  // Wait for the first event, so a failed request returns an error status instead of an empty answer.
  let first: IteratorResult<Anthropic.Beta.BetaRawMessageStreamEvent>;
  try {
    first = await events.next();
  } catch (error) {
    // A rejected key, or no key at all (the SDK fails before sending anything).
    const notSetUp =
      error instanceof Anthropic.AuthenticationError || (error instanceof Anthropic.AnthropicError && !(error instanceof Anthropic.APIError));
    if (notSetUp) {
      console.error("[assistant] Anthropic credentials missing or invalid:", (error as Error).message);
      return Response.json({ error: "The assistant isn't set up yet." }, { status: 503 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "The assistant is busy. Please try again in a minute." }, { status: 429 });
    }
    console.error("[assistant] request failed:", (error as Error).message);
    return Response.json({ error: "The assistant couldn't answer. Please try again." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Anthropic.Beta.BetaRawMessageStreamEvent) => {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      };
      try {
        if (!first.done) send(first.value);
        for (let e = await events.next(); !e.done; e = await events.next()) send(e.value);
        const message = await stream.finalMessage();
        if (message.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\nSorry, I can't help with that. Try asking about your payments, loans or rounds."));
        }
      } catch (error) {
        console.error("[assistant] stream failed:", (error as Error).message);
        controller.enqueue(encoder.encode("\n\nSorry, the answer was cut off. Please ask again."));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
