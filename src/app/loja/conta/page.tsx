import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { OrderTimeline } from "@/components/order-timeline";
import { OrderChat } from "@/components/order-chat";

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGAMENTO_CONFIRMADO: "Pagamento confirmado",
  EM_PRODUCAO: "Em produção",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const money = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type OrderItem = { description: string; quantity: number };

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) redirect("/loja/conta/entrar");

  // Graças à política de RLS "store_orders_customer_select", o cliente
  // já consegue ler os próprios pedidos com o cliente normal — sem
  // precisar de nenhum privilégio especial.
  const { data: orders } = await supabase
    .from("store_orders")
    .select("id, account_id, items, total, status, created_at")
    .order("created_at", { ascending: false });

  const accountIds = [...new Set((orders ?? []).map((o) => o.account_id))];
  const { data: accounts } = accountIds.length
    ? await supabase.from("accounts").select("id, company_name, store_slug").in("id", accountIds)
    : { data: [] };

  const { data: allMessages } = orders?.length
    ? await supabase
        .from("order_messages")
        .select("id, order_id, sender_role, sender_name, text, created_at")
        .in(
          "order_id",
          orders.map((o) => o.id)
        )
        .order("created_at", { ascending: true })
    : { data: [] };

  const storeName = (accountId: string) => accounts?.find((a) => a.id === accountId)?.company_name || "Loja";
  const storeSlug = (accountId: string) => accounts?.find((a) => a.id === accountId)?.store_slug;
  const messagesFor = (orderId: string) => (allMessages ?? []).filter((m) => m.order_id === orderId);

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl text-ink">Meus pedidos</h1>
            <p className="text-sm text-ink-muted">{user.email}</p>
          </div>
          <form action={signOut}>
            <button className="text-sm text-ink-muted border border-line rounded-full px-4 py-2 hover:border-ink hover:text-ink transition-colors">
              Sair
            </button>
          </form>
        </div>

        {!orders || orders.length === 0 ? (
          <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
            Nenhum pedido encontrado com esse e-mail ainda.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border border-line bg-surface rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-medium text-ink">{storeName(order.account_id)}</p>
                    <p className="text-xs text-ink-muted">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-sm font-spec text-ink">{money(order.total)}</p>
                </div>

                <div className="mb-4 space-y-0.5">
                  {((order.items as OrderItem[]) || []).map((item, i) => (
                    <p key={i} className="text-xs text-ink-muted">
                      {item.quantity}x {item.description}
                    </p>
                  ))}
                </div>

                <div className="mb-4 overflow-x-auto">
                  <div className="min-w-[420px]">
                    <OrderTimeline status={order.status} />
                  </div>
                </div>

                <OrderChat orderId={order.id} initialMessages={messagesFor(order.id)} role="cliente" />

                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      order.status === "PAGAMENTO_CONFIRMADO" ? "text-good" : "text-ink-muted"
                    }`}
                  >
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                  {storeSlug(order.account_id) && (
                    <a
                      href={`/loja/${storeSlug(order.account_id)}`}
                      className="text-xs text-amber hover:underline underline-offset-2"
                    >
                      Ver loja
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
