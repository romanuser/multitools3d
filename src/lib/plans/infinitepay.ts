import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const API_BASE = "https://api.checkout.infinitepay.io";

const PLAN_PRICES: Record<"vip_mensal", number> = {
  vip_mensal: 29.9,
};

const PLAN_LABELS: Record<"vip_mensal", string> = {
  vip_mensal: "Multiferramenta 3D · Plano VIP mensal",
};

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function moneyToCents(value: number) {
  return Math.round(Number(value || 0) * 100);
}

// ---------------------------------------------------------------------
// Gera o link de pagamento pra assinatura VIP. Usa a InfiniteTag DO DONO
// da plataforma (INFINITEPAY_HANDLE) — é você que recebe essa cobrança,
// não o assinante.
// order_nsu usa o prefixo "plan_" pra o webhook saber que é uma compra de
// plano (e não uma venda da lojinha de algum assinante).
// ---------------------------------------------------------------------
export async function createPlanCheckoutLink(input: {
  purchaseId: string;
  plan: "vip_mensal";
  customerName: string;
  customerEmail: string;
}) {
  const handle = (process.env.INFINITEPAY_HANDLE || "").replace(/^\$/, "").trim();
  if (!handle) throw new Error("INFINITEPAY_HANDLE não configurada no .env.local.");

  const price = PLAN_PRICES[input.plan];

  const body = {
    handle,
    redirect_url: `${getSiteUrl()}/api/payments/infinitepay/return`,
    webhook_url: `${getSiteUrl()}/api/payments/infinitepay/webhook`,
    order_nsu: `plan_${input.purchaseId}`,
    customer: { name: input.customerName, email: input.customerEmail },
    items: [{ quantity: 1, price: moneyToCents(price), description: PLAN_LABELS[input.plan] }],
  };

  const response = await fetch(`${API_BASE}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.url) {
    throw new Error(result?.message || "Não foi possível criar o link de pagamento.");
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
// Chamado pelo webhook/retorno da InfinitePay quando order_nsu começa com
// "plan_". Confirma o pagamento, marca a compra como paga e ativa o plano
// na conta do assinante.
// ---------------------------------------------------------------------
export async function confirmPlanPurchase(input: {
  purchaseId: string;
  transactionNsu: string;
  slug: string;
}) {
  const handle = (process.env.INFINITEPAY_HANDLE || "").replace(/^\$/, "").trim();
  const admin = createAdminClient();

  const { data: purchase, error: findError } = await admin
    .from("plan_purchases")
    .select("id, account_id, plan, amount, status")
    .eq("id", input.purchaseId)
    .maybeSingle();

  if (findError || !purchase) throw new Error("Compra de plano não encontrada.");
  if (purchase.status === "paid") return { paid: true };

  const verification = await checkPayment({
    orderNsu: `plan_${purchase.id}`,
    transactionNsu: input.transactionNsu,
    slug: input.slug,
    handle,
  });

  if (!verification.paid) return { paid: false };

  const expectedCents = moneyToCents(purchase.amount);
  if (Number(verification.amount) !== expectedCents) {
    throw new Error("Valor confirmado pela InfinitePay não bate com o valor do plano.");
  }

  await admin
    .from("plan_purchases")
    .update({
      status: "paid",
      payment_transaction_nsu: input.transactionNsu,
      payment_invoice_slug: input.slug,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", purchase.id);

  const planExpiresAt =
    purchase.plan === "vip_mensal"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  await admin
    .from("accounts")
    .update({ plan: purchase.plan, plan_expires_at: planExpiresAt })
    .eq("id", purchase.account_id);

  return { paid: true };
}
