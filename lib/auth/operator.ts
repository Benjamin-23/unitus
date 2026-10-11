// Unitus operators (staff) can view the platform wallet. Read-only: operators
// can't move money; only automated server jobs do (docs/payments-architecture.md §3).

const allowlist = () =>
  (process.env.UNITUS_OPERATOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * True when the member may view the Unitus wallet. With no allowlist set,
 * development is open to every signed-in member (with a warning on the page);
 * production is closed.
 */
export function isOperator(email: string | null | undefined) {
  const list = allowlist();
  if (list.length === 0) return process.env.NODE_ENV !== "production";
  return Boolean(email && list.includes(email.toLowerCase()));
}

export const operatorAllowlistConfigured = () => allowlist().length > 0;
