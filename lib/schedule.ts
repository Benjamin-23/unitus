// How often a chama's rounds run. Pure functions, shared by the server and the UI.

export const FREQUENCIES = {
  "30min": { label: "Every 30 minutes", short: "30 min", per: "round", testOnly: true },
  daily: { label: "Daily", short: "day", per: "day", testOnly: false },
  "3days": { label: "Every 3 days", short: "3 days", per: "3 days", testOnly: false },
  weekly: { label: "Weekly", short: "week", per: "week", testOnly: false },
  "2weeks": { label: "Every 2 weeks", short: "2 weeks", per: "2 weeks", testOnly: false },
  monthly: { label: "Monthly", short: "month", per: "month", testOnly: false },
} as const;

export type Frequency = keyof typeof FREQUENCIES;

export const isFrequency = (v: unknown): v is Frequency => typeof v === "string" && v in FREQUENCIES;

/** "$100 / week". */
export const perRound = (frequency: Frequency) => FREQUENCIES[frequency].per;

/** The time `n` rounds after `from`. Monthly keeps the same day of the month (capped at 28). */
export function addRounds(from: Date, frequency: Frequency, n = 1) {
  const d = new Date(from);
  switch (frequency) {
    case "30min":
      return new Date(d.getTime() + n * 30 * 60_000);
    case "daily":
      return new Date(d.getTime() + n * 86_400_000);
    case "3days":
      return new Date(d.getTime() + n * 3 * 86_400_000);
    case "weekly":
      return new Date(d.getTime() + n * 7 * 86_400_000);
    case "2weeks":
      return new Date(d.getTime() + n * 14 * 86_400_000);
    case "monthly": {
      const out = new Date(d);
      out.setUTCDate(Math.min(d.getUTCDate(), 28));
      out.setUTCMonth(out.getUTCMonth() + n);
      return out;
    }
  }
}

/**
 * When the round after `previousDue` is due. If the scheduler fell behind by
 * more than a round, the next round runs now rather than catching up several
 * rounds at once (each round charges every member).
 */
export function nextDue(previousDue: Date, frequency: Frequency, now = new Date()) {
  const next = addRounds(previousDue, frequency);
  return addRounds(next, frequency) <= now ? now : next;
}

/** "Thu 15 Oct, 14:30" — times matter for short rounds. */
export function formatDue(iso: string | Date, frequency: Frequency) {
  const d = new Date(iso);
  const withTime = frequency === "30min" || frequency === "daily";
  return d.toLocaleString("en-GB", {
    weekday: withTime ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: withTime ? undefined : "numeric",
    hour: withTime ? "2-digit" : undefined,
    minute: withTime ? "2-digit" : undefined,
  });
}
