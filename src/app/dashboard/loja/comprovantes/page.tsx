import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const money = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function receiptNumber(orderId: string) {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export default async function LojaComprovantesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("store_orders")
    .select("id, customer_name, customer_email, total, status, created_at")
    .eq("account_id", user.id)
    .not("status", "in", "(AGUARDANDO_PAGAMENTO,CANCELADO)")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard/loja" className="text-sm text-ink-muted hover:text-ink">
          ← Loja virtual
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Comprovantes</h1>
        <p className="text-sm text-ink-muted mb-8">
          Um comprovante é gerado automaticamente pra cada venda com pagamento confirmado.
        </p>

        {!orders || orders.length === 0 ? (
          <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
            Nenhuma venda com pagamento confirmado ainda.
          </p>
        ) : (
          <div className="border border-line rounded-2xl overflow-hidden">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/loja/comprovantes/${order.id}`}
                className="flex items-center justify-between px-5 py-4 border-b border-line last:border-b-0 hover:bg-surface-raised/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink font-medium truncate">{order.customer_name || "Cliente"}</p>
                  <p className="text-xs text-ink-muted">
                    #{receiptNumber(order.id)} · {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <p className="font-spec text-sm text-ink shrink-0">{money(order.total)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
