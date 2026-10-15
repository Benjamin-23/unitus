import { timingSafeEqual } from "node:crypto";
import { runScheduler } from "@/lib/rounds";

/**
 * Scheduler tick: runs every round that's due (charges members, pays the
 * winner) and settles payouts in flight. Call it every minute with
 * `Authorization: Bearer $CRON_SECRET` (scripts/scheduler.mjs does this locally;
 * a cron service does it when deployed).
 *
 * Body (sandbox only): { force: "<chamaId>" } runs that chama's next round now.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok = Boolean(secret) && given.length === secret!.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret!));
  if (!ok) return Response.json({ error: "Not allowed." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { force?: unknown };
  const force = typeof body.force === "string" && /^[0-9a-f-]{36}$/i.test(body.force) ? body.force : undefined;
  if (force && process.env.PAYPAL_ENVIRONMENT === "production") {
    return Response.json({ error: "Forcing a round is only allowed in the sandbox." }, { status: 403 });
  }

  const log = await runScheduler({ forceChamaId: force });
  return Response.json({ ranAt: new Date().toISOString(), log });
}
