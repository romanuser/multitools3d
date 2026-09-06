import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type OrderItem = { description: string; quantity: number };

export default async function PedidoConfirmacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ pagamento?: string }>;
}) {
  const { orderId } = await params;
  const { pagamento } = await searchParams;

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("store_orders")
    .select("id, customer_name, total, status, account_id, items")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const { data: account } = await admin
    .from("accounts")
    .select("company_name, store_slug, whatsapp_number")
    .eq("id", order.account_id)
    .maybeSingle();

  const confirmed = order.status === "PAGAMENTO_CONFIRMADO";

  const items = (order.items as OrderItem[]) || [];
  const itemsText = items.map((i) => `${i.quantity}x ${i.description}`).join(", ");
  const shortId = order.id.slice(0, 8).toUpperCase();
  const whatsappMessage = `Olá, sou o cliente ${order.customer_name} e efetuei a compra de ${itemsText} (pedido #${shortId}). Vamos combinar a entrega e o prazo. Obrigado!`;
  const whatsappNumber = account?.whatsapp_number?.replace(/\D/g, "");
  const normalizedWhatsapp = whatsappNumber
    ? whatsappNumber.startsWith("55")
      ? whatsappNumber
      : `55${whatsappNumber}`
    : null;

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-surface border border-line rounded-2xl p-8 text-center">
        <div className="text-3xl mb-3">{confirmed ? "✅" : "⏳"}</div>
        <h1 className="font-display text-xl text-ink mb-2">
          {confirmed ? "Pagamento confirmado!" : "Aguardando confirmação"}
        </h1>
        <p className="text-sm text-ink-muted mb-1">
          Pedido #{shortId} de {order.customer_name} · {money(order.total)}
        </p>
        <p className="text-sm text-ink-muted">
          {confirmed
            ? `${account?.company_name || "A loja"} já foi avisada e vai te procurar.`
            : pagamento === "pendente"
              ? "Recebemos seu pagamento e estamos confirmando — atualize a página em instantes."
              : "Se você já pagou, atualize a página em alguns instantes."}
        </p>

        {normalizedWhatsapp && (
          <a
            href={`https://wa.me/${normalizedWhatsapp}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-amber text-white font-medium rounded-full py-2.5 text-sm mt-5"
          >
            Falar no WhatsApp com a loja
          </a>
        )}

        {account?.store_slug && (
          <a href={`/loja/${account.store_slug}`} className="text-sm text-amber hover:underline mt-4 inline-block">
            ← Voltar pra loja
          </a>
        )}
        <p className="text-xs text-ink-muted mt-4">
          <a href="/loja/conta" className="hover:underline">
            Acompanhar todos os meus pedidos →
          </a>
        </p>
      </div>
    </main>
  );
}
