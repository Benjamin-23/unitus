// Server-only: the merry-go-round engine. The scheduler (app/api/cron/tick)
// calls runScheduler() every minute. Each step is idempotent, so a re-run or a
// crash halfway through never charges or pays anyone twice:
//   * a round is claimed by inserting its row (unique per chama and number),
//   * deductions use a PayPal-Request-Id per round and member,
//   * payouts use the round id as PayPal's batch id.
import type { ChamaRow } from "@/lib/chamas";
import { db, getVaultId, recordPayment, savePayerDetails } from "@/lib/db";
import { postPayment } from "@/lib/ledger";
import { chargeRoundDeduction } from "@/lib/paypal/orders";
import { checkPayout, sendPayout } from "@/lib/paypal/payouts";
import { PayPalError } from "@/lib/paypal/server";
import { isFrequency, nextDue, type Frequency } from "@/lib/schedule";

export type RoundStatus = "collecting" | "paying" | "paid" | "no_pot" | "payout_failed";

export type RoundRow = {
  id: string;
  chama_id: string;
  number: number;
  cycle: number;
  due_at: string;
  recipient_id: string;
  status: RoundStatus;
  pot: number | null;
  payout_batch_id: string | null;
  payout_item_id: string | null;
  payout_status: string | null;
  payout_fee: number | null;
  created_at: string;
  completed_at: string | null;
};

type Membership = { member_id: string; joining_fee_paid_at: string | null; members: { email: string | null; paypal_payer_id: string | null } | null };

/** A chama needs this many members who've paid the joining fee before a round can run. */
export const MIN_MEMBERS_TO_RUN = 2;

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

const frequencyOf = (c: ChamaRow): Frequency => (isFrequency(c.frequency) ? c.frequency : "monthly");

export async function listRounds(chamaId: string) {
  return check(await db().from("chama_rounds").select("*").eq("chama_id", chamaId).order("number")) as RoundRow[];
}

/**
 * Members who take part in a round: joining fee paid by `at`, and PayPal saved
 * for automatic payments (otherwise they can't be charged).
 */
async function activeMembers(chamaId: string, at: Date) {
  const rows = check(
    await db()
      .from("chama_members")
      .select("member_id, joining_fee_paid_at, members(email, paypal_payer_id)")
      .eq("chama_id", chamaId)
      .not("joining_fee_paid_at", "is", null),
  ) as unknown as Membership[];
  const paid = rows.filter((m) => new Date(m.joining_fee_paid_at!) <= at);
  const ready = await membersWithSavedPayPal(paid.map((m) => m.member_id));
  return paid.filter((m) => ready.has(m.member_id));
}

export async function membersWithSavedPayPal(memberIds: string[]) {
  if (memberIds.length === 0) return new Set<string>();
  const rows = check(await db().from("paypal_vaults").select("member_id").in("member_id", memberIds)) as { member_id: string }[];
  return new Set(rows.map((r) => r.member_id));
}

/** A round counts as the recipient's turn unless nothing was collected for it. */
export const usedTurn = (r: Pick<RoundRow, "status">) => r.status !== "no_pot";

/** When the chama's next round is due, given the rounds so far. */
export function nextRoundDue(chama: ChamaRow, rounds: RoundRow[], now = new Date()) {
  const last = rounds.at(-1);
  return last ? nextDue(new Date(last.due_at), frequencyOf(chama), now) : new Date(chama.starts_at);
}

/**
 * Who pays into a round. Everyone active except the recipient, minus members
 * who received earlier this cycle before the recipient joined: the recipient
 * never paid them, so they don't pay the recipient (until the next cycle).
 */
export function contributorsFor(round: Pick<RoundRow, "cycle" | "recipient_id">, members: Membership[], rounds: RoundRow[]) {
  const recipientJoined = new Date(members.find((m) => m.member_id === round.recipient_id)?.joining_fee_paid_at ?? 0);
  const receivedBeforeRecipientJoined = new Set(
    rounds.filter((r) => r.cycle === round.cycle && usedTurn(r) && new Date(r.created_at) < recipientJoined).map((r) => r.recipient_id),
  );
  return members.filter((m) => m.member_id !== round.recipient_id && !receivedBeforeRecipientJoined.has(m.member_id)).map((m) => m.member_id);
}

function randomPick<T>(items: T[]) {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return items[n % items.length];
}

type Log = (line: string) => void;

/** Charges every active member their share of the round, then pays the pot to the recipient. */
async function collectAndPay(chama: ChamaRow, round: RoundRow, log: Log) {
  const label = `Round ${round.number}`;
  const members = await activeMembers(chama.id, new Date(round.created_at));
  const rounds = await listRounds(chama.id);
  const contributors = new Set(contributorsFor(round, members, rounds));
  const contribution = Number(chama.monthly_contribution);
  const savings = Number(chama.monthly_savings);

  const existing = check(
    await db().from("payments").select("member_id, status").eq("round_id", round.id),
  ) as { member_id: string; status: string }[];
  const done = new Set(existing.filter((p) => p.status === "COMPLETED" || p.status === "PENDING").map((p) => p.member_id));

  for (const m of members) {
    if (done.has(m.member_id)) continue;
    const share = { contribution: contributors.has(m.member_id) ? contribution : 0, savings };
    if (share.contribution + share.savings <= 0) continue;
    const vaultId = await getVaultId(m.member_id);
    if (!vaultId) {
      log(`${chama.name} ${label}: member ${m.member_id.slice(0, 6)} has no saved PayPal, skipped`);
      continue;
    }
    try {
      const result = await chargeRoundDeduction(vaultId, chama, { memberId: m.member_id, roundId: round.id, label, ...share });
      await recordPayment({
        memberId: m.member_id,
        chamaId: chama.id,
        kind: "monthly_deduction",
        reference: label,
        roundId: round.id,
        contribution: share.contribution,
        orderId: result.orderId,
        captureId: result.captureId,
        amount: Number(result.amount),
        principal: result.charge.principal,
        feeCharged: result.charge.fee,
        paypalFee: result.paypalFee,
        netAmount: result.netAmount,
        status: result.status,
      });
      if (result.status === "COMPLETED") {
        await postPayment(result.orderId);
        await savePayerDetails(m.member_id, { country: result.payerCountry, payerId: result.payerId });
      }
      log(`${chama.name} ${label}: charged ${m.member_id.slice(0, 6)} $${result.amount} (${result.status})`);
    } catch (error) {
      // A declined member doesn't stop the round; their share is missing from the pot.
      const issue = error instanceof PayPalError ? (error.issue ?? error.message) : (error as Error).message;
      log(`${chama.name} ${label}: charge for ${m.member_id.slice(0, 6)} failed: ${issue}`);
    }
  }

  const paid = check(
    await db().from("payments").select("contribution").eq("round_id", round.id).eq("status", "COMPLETED"),
  ) as { contribution: number | null }[];
  const pot = Math.round(paid.reduce((s, p) => s + Number(p.contribution ?? 0), 0) * 100) / 100;

  if (pot <= 0) {
    await updateRound(round.id, { status: "no_pot", pot: 0, completed_at: new Date().toISOString() });
    log(`${chama.name} ${label}: nothing collected for the pot`);
    return;
  }

  const recipient = members.find((m) => m.member_id === round.recipient_id)?.members;
  const receiver = recipient?.paypal_payer_id ? { payerId: recipient.paypal_payer_id } : recipient?.email ? { email: recipient.email } : null;
  if (!receiver) {
    await updateRound(round.id, { status: "payout_failed", pot, payout_status: "NO_RECEIVER" });
    log(`${chama.name} ${label}: recipient has no PayPal to pay; pot of $${pot} stays in the chama`);
    return;
  }
  try {
    const payout = await sendPayout({ roundId: round.id, amount: pot, receiver, note: `${chama.name} · ${label} merry-go-round payout` });
    await updateRound(round.id, { status: "paying", pot, payout_batch_id: payout.batchId, payout_status: payout.status });
    log(`${chama.name} ${label}: payout of $${pot} sent (${payout.status})`);
  } catch (error) {
    await updateRound(round.id, { status: "payout_failed", pot, payout_status: (error as Error).message.slice(0, 200) });
    log(`${chama.name} ${label}: payout failed: ${(error as Error).message}`);
  }
}

async function updateRound(id: string, patch: Partial<RoundRow>) {
  check(await db().from("chama_rounds").update(patch).eq("id", id));
}

/** Checks payouts in flight; posts the ones PayPal has sent to the ledger. */
async function settlePayouts(log: Log) {
  const paying = check(await db().from("chama_rounds").select("*").eq("status", "paying")) as RoundRow[];
  for (const r of paying) {
    if (!r.payout_batch_id) continue;
    try {
      const p = await checkPayout(r.payout_batch_id);
      if (p.outcome === "pending") continue;
      if (p.outcome === "sent") {
        await updateRound(r.id, { status: "paid", payout_status: p.status, payout_fee: p.fee, payout_item_id: p.itemId ?? null, completed_at: new Date().toISOString() });
        const { error } = await db().rpc("ledger_post_payout", { p_round: r.id });
        if (error) console.error(`[ledger] could not post payout for round ${r.id}: ${error.message}`);
        log(`Round ${r.number}: payout ${p.status} (PayPal fee $${p.fee.toFixed(2)})`);
      } else {
        await updateRound(r.id, { status: "payout_failed", payout_status: p.status });
        log(`Round ${r.number}: payout ${p.status}${p.error ? `: ${p.error}` : ""}; pot stays in the chama`);
      }
    } catch (error) {
      log(`Round ${r.number}: couldn't check payout: ${(error as Error).message}`);
    }
  }
}

/** Starts the next round for one chama if it's due (or `force`d in the sandbox). */
async function runChama(chama: ChamaRow, now: Date, force: boolean, log: Log) {
  const rounds = await listRounds(chama.id);
  const last = rounds.at(-1);
  if (last?.status === "collecting") {
    // A previous run stopped halfway: finish it.
    await collectAndPay(chama, last, log);
    return;
  }
  const due = nextRoundDue(chama, rounds, now);
  if (!force && due > now) return;

  const members = await activeMembers(chama.id, now);
  if (members.length < MIN_MEMBERS_TO_RUN) {
    log(
      `${chama.name}: round due but only ${members.length} member${members.length === 1 ? "" : "s"} with automatic payments ready; waiting for ${MIN_MEMBERS_TO_RUN}`,
    );
    return;
  }

  // Draw from members who haven't received this cycle; when everyone has, a new cycle starts.
  let cycle = last?.cycle ?? 1;
  const received = new Set(rounds.filter((r) => r.cycle === cycle && usedTurn(r)).map((r) => r.recipient_id));
  let eligible = members.filter((m) => !received.has(m.member_id));
  if (eligible.length === 0) {
    cycle += 1;
    eligible = members;
  }
  const recipient = randomPick(eligible);

  const { data, error } = await db()
    .from("chama_rounds")
    .insert({ chama_id: chama.id, number: (last?.number ?? 0) + 1, cycle, due_at: (force && due > now ? now : due).toISOString(), recipient_id: recipient.member_id })
    .select("*")
    .single<RoundRow>();
  if (error) {
    // Another run claimed this round first.
    if (/duplicate|unique/i.test(error.message)) return;
    throw new Error(`Database error: ${error.message}`);
  }
  if (chama.status === "open") check(await db().from("chamas").update({ status: "active" }).eq("id", chama.id));
  log(`${chama.name}: round ${data.number} (cycle ${cycle}) drew ${recipient.member_id.slice(0, 6)} from ${eligible.length} eligible`);
  await collectAndPay(chama, data, log);
}

/**
 * One scheduler tick: settle payouts in flight, then run every round that's due.
 * `forceChamaId` (sandbox only) runs that chama's next round now.
 */
export async function runScheduler({ now = new Date(), forceChamaId }: { now?: Date; forceChamaId?: string } = {}) {
  const lines: string[] = [];
  const log: Log = (line) => {
    lines.push(line);
    console.info(`[scheduler] ${line}`);
  };

  await settlePayouts(log);
  const chamas = check(await db().from("chamas").select("*").in("status", ["open", "active"])) as ChamaRow[];
  for (const chama of chamas) {
    try {
      await runChama(chama, now, chama.id === forceChamaId, log);
    } catch (error) {
      log(`${chama.name}: ${(error as Error).message}`);
    }
  }
  return lines;
}
