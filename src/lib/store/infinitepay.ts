import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/plans/infinitepay";

const API_BASE = "https://api.checkout.infinitepay.io";

function moneyToCents(value: number) {
  return Math.round(Number(value || 0) * 100);
}

// ---------------------------------------------------------------------
// Gera o link de pagamento usando a InfiniteTag DO DONO DA LOJA (não a
// da plataforma) — é ele quem recebe o dinheiro dessa venda.
// order_nsu usa o prefixo "order_" pra o webhook saber que é uma venda
// de loja (e não uma compra de plano).
// ---------------------------------------------------------------------
export async function createStoreCheckoutLink(input: {
  orderId: string;
  handle: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: { description: string; quantity: number; price: number }[];
}) {
  const handle = input.handle.replace(/^\$/, "").trim();
  if (!handle) throw new Error("Essa loja ainda não configurou a InfiniteTag.");

  const phone = String(input.customerPhone || "").replace(/\D/g, "");
  const normalizedPhone = phone ? `+${phone.startsWith("55") ? phone : `55${phone}`}` : undefined;

  const body = {
    handle,
    redirect_url: `${getSiteUrl()}/api/payments/infinitepay/return`,
    webhook_url: `${getSiteUrl()}/api/payments/infinitepay/webhook`,
    order_nsu: `order_${input.orderId}`,
    customer: {
      name: input.customerName,
      email: input.customerEmail,
      ...(normalizedPhone ? { phone_number: normalizedPhone } : {}),
    },
    items: input.items.map((item) => ({
      quantity: item.quantity,
      price: moneyToCents(item.price),
      description: item.description.slice(0, 120),
    })),
  };

  const response = await fetch(`${API_BASE}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.url) {
    throw new Error(result?.message || "Não foi possível criar o link de pagamento da loja.");
  }
  return String(result.url);
}

async function checkPayment(input: { orderNsu: string; transactionNsu: string; slug: string; handle: string }) {
  const response = await fetch(`${API_BASE}/payment_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: input.handle,
      order_nsu: input.orderNsu,
      transaction_nsu: input.transactionNsu,
      slug: input.slug,
    }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || "Não foi possível consultar o pagamento na InfinitePay.");
  }
  return result as { success: boolean; paid: boolean; amount: number; paid_amount: number };
}

// ---------------------------------------------------------------------
// Chamado pelo webhook/retorno quando order_nsu começa com "order_".
// Usa a service_role key porque o cliente que compra na loja não tem
// nenhuma sessão logada no Supabase.
// ---------------------------------------------------------------------
export async function confirmStoreOrder(input: { orderId: string; transactionNsu: string; slug: string }) {
  const admin = createAdminClient();

  const { data: order, error: findError } = await admin
    .from("store_orders")
    .select("id, account_id, total, status")
    .eq("id", input.orderId)
    .maybeSingle();

  if (findError || !order) throw new Error("Pedido não encontrado.");
  if (order.status === "PAGAMENTO_CONFIRMADO") return { paid: true };

  const { data: account } = await admin
    .from("accounts")
    .select("infinitepay_handle")
    .eq("id", order.account_id)
    .maybeSingle();

  const handle = (account?.infinitepay_handle || "").replace(/^\$/, "").trim();
  if (!handle) throw new Error("Loja sem InfiniteTag configurada.");

  const verification = await checkPayment({
    orderNsu: `order_${order.id}`,
    transactionNsu: input.transactionNsu,
    slug: input.slug,
    handle,
  });

  if (!verification.paid) return { paid: false };

  const expectedCents = moneyToCents(order.total);
  if (Number(verification.amount) !== expectedCents) {
    throw new Error("Valor confirmado pela InfinitePay não bate com o total do pedido.");
  }

  await admin
    .from("store_orders")
    .update({
      status: "PAGAMENTO_CONFIRMADO",
      payment_transaction_nsu: input.transactionNsu,
      payment_invoice_slug: input.slug,
      payment_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  return { paid: true };
}
