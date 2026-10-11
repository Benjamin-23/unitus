import { getSession } from "@/lib/auth/session";
import { getChamaDashboard } from "@/lib/dashboard";

const csv = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// The chama's statement as CSV. Only its admin and members can download it.
export async function GET(_request: Request, ctx: RouteContext<"/api/chamas/[chamaId]/statement">) {
  const session = await getSession();
  if (!session) return new Response("Please log in again.", { status: 401 });
  const { chamaId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(chamaId)) return new Response("Not found", { status: 404 });

  const d = await getChamaDashboard(chamaId, session.memberId);
  if (!d) return new Response("Not found", { status: 404 });

  const header = ["Date", "Description", "Member", "Account", "Account number", "Amount (USD)", "Chama balance (USD)", "PayPal fee (USD)"];
  const lines = d.account.statement.map((r) =>
    [r.date.slice(0, 10), r.description, r.member, r.account, r.accountNumber, r.amount.toFixed(2), r.balance.toFixed(2), r.paypalFee?.toFixed(2) ?? null]
      .map(csv)
      .join(","),
  );
  const body = [`# ${d.chama.name} · account ${d.account.number}`, header.join(","), ...lines].join("\n");
  const file = `${d.account.number}-statement-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store" },
  });
}
