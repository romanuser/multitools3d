import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const money = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function receiptNumber(orderId: string) {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export default async function ComprovantesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/loja/conta/entrar");

  const { data: orders } = await supabase
    .from("store_orders")
    .select("id, account_id, total, status, created_at")
    .not("status", "in", "(AGUARDANDO_PAGAMENTO,CANCELADO)")
    .order("created_at", { ascending: false });

  const accountIds = [...new Set((orders ?? []).map((o) => o.account_id))];
  const { data: accounts } = accountIds.length
    ? await supabase.from("accounts").select("id, company_name").in("id", accountIds)
    : { data: [] };
  const storeName = (accountId: string) => accounts?.find((a) => a.id === accountId)?.company_name || "Loja";

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mb-1">Comprovantes</h1>
      <p className="text-sm text-ink-muted mb-8">Um comprovante é gerado pra cada compra com pagamento confirmado.</p>

      {!orders || orders.length === 0 ? (
        <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6 max-w-lg">
          Nenhum comprovante ainda — eles aparecem aqui assim que uma compra tiver o pagamento confirmado.
        </p>
      ) : (
        <div className="max-w-lg space-y-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/loja/conta/comprovantes/${order.id}`}
              className="flex items-center justify-between border border-line bg-surface rounded-xl px-4 py-3 hover:border-amber/30 transition-colors"
            >
              <div>
                <p className="text-sm text-ink font-medium">{storeName(order.account_id)}</p>
                <p className="text-xs text-ink-muted">
                  #{receiptNumber(order.id)} · {new Date(order.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <p className="font-spec text-sm text-ink">{money(order.total)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
