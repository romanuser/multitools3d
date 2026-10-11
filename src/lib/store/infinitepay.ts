import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/plans/infinitepay";
import { methodFromCapture } from "@/lib/sales/types";

const API_BASE = "https://api.checkout.infinitepay.io";

export function moneyToCents(value: number) {
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

// ---------------------------------------------------------------------
// Link de pagamento genérico, pra cobrar qualquer valor avulso — usado
// pelo módulo financeiro (contas a receber: consignado e venda fiado).
// Igual ao checkout da loja, avisa o webhook quando o cliente paga, e a
// conta a receber recebe baixa sozinha (confirmReceivablePayment). Links
// antigos, criados sem webhook, continuam com baixa manual.
// ---------------------------------------------------------------------
export async function createGenericPaymentLink(input: {
  handle: string;
  description: string;
  amount: number;
  referenceId: string;
}) {
  const handle = input.handle.replace(/^\$/, "").trim();
  if (!handle) throw new Error("Configure sua InfiniteTag antes de gerar um link de cobrança.");

  const body = {
    handle,
    redirect_url: `${getSiteUrl()}/api/payments/infinitepay/return`,
    webhook_url: `${getSiteUrl()}/api/payments/infinitepay/webhook`,
    order_nsu: `receivable_${input.referenceId}`,
    items: [
      {
        quantity: 1,
        price: moneyToCents(input.amount),
        description: input.description.slice(0, 120),
      },
    ],
  };

  const response = await fetch(`${API_BASE}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.url) {
    throw new Error(result?.message || "Não foi possível criar o link de cobrança.");
  }
  return String(result.url);
}

export async function checkPayment(input: { orderNsu: string; transactionNsu: string; slug: string; handle: string }) {
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
    .select("id, account_id, total, status, items")
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

  // A peça já entrou na fila na hora em que o pedido foi feito (não
  // espera mais o pagamento confirmar) — não cria de novo aqui.

  return { paid: true };
}

// ---------------------------------------------------------------------
// Baixa automática de uma conta a receber paga pelo link de cobrança.
// Chamado pelo webhook/retorno quando order_nsu começa com "receivable_".
//
// Segurança: nunca confia só no que chegou no webhook — consulta a
// própria InfinitePay (payment_check) com a InfiniteTag do dono da conta.
// Registra o recebimento com a forma de pagamento que a InfinitePay
// informou (Pix ou cartão + parcelas). A mesma transação nunca é contada
// duas vezes: o banco recusa um segundo recebimento com o mesmo
// transaction_nsu.
// ---------------------------------------------------------------------
export async function confirmReceivablePayment(input: {
  receivableId: string;
  transactionNsu: string;
  slug: string;
  captureMethod?: string | null;
  installments?: number | null;
  receiptUrl?: string | null;
}) {
  const admin = createAdminClient();

  const { data: receivable } = await admin
    .from("accounts_receivable")
    .select("id, account_id, total_amount, status")
    .eq("id", input.receivableId)
    .maybeSingle();
  if (!receivable) throw new Error("Conta a receber não encontrada.");

  const { data: already } = await admin
    .from("receivable_payments")
    .select("id")
    .eq("transaction_nsu", input.transactionNsu)
    .maybeSingle();
  if (already) return { paid: true };
  if (receivable.status === "pago") return { paid: true };

  const { data: account } = await admin
    .from("accounts")
    .select("infinitepay_handle")
    .eq("id", receivable.account_id)
    .maybeSingle();
  const handle = (account?.infinitepay_handle || "").replace(/^\$/, "").trim();
  if (!handle) throw new Error("Conta sem InfiniteTag configurada.");

  const verification = (await checkPayment({
    orderNsu: `receivable_${receivable.id}`,
    transactionNsu: input.transactionNsu,
    slug: input.slug,
    handle,
  })) as Awaited<ReturnType<typeof checkPayment>> & { capture_method?: string; installments?: number };
  if (!verification.paid) return { paid: false };

  // Valor do link (sem juros de parcelamento, que ficam com o cliente).
  const received = Number(verification.amount || 0) / 100;
  if (!(received > 0)) throw new Error("InfinitePay confirmou o pagamento sem valor.");

  // Forma de pagamento: a consulta à InfinitePay manda; se não mandar,
  // usa o que veio no webhook.
  const capture = verification.capture_method || input.captureMethod || null;
  const installments = Number(verification.installments || input.installments || 0) || null;

  const { error: insertError } = await admin.from("receivable_payments").insert({
    receivable_id: receivable.id,
    account_id: receivable.account_id,
    amount: received,
    method: methodFromCapture(capture),
    source: "link",
    installments,
    transaction_nsu: input.transactionNsu,
    receipt_url: input.receiptUrl || null,
  });
  if (insertError) {
    if (insertError.code === "23505") return { paid: true }; // já contado (chegou duas vezes ao mesmo tempo)
    throw new Error(insertError.message);
  }

  await addToReceivable(admin, receivable.id, received);
  return { paid: true };
}

// Soma o valor recebido no total pago da conta. Soma (em vez de
// recalcular pelos recebimentos) pra não perder valores pagos antes de
// existir a tabela de recebimentos (ex: acertos de consignado antigos).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addToReceivable(client: any, receivableId: string, received: number) {
  const { data: row } = await client
    .from("accounts_receivable")
    .select("total_amount, paid_amount")
    .eq("id", receivableId)
    .maybeSingle();
  if (!row) return;
  const total = Number(row.total_amount);
  const paidAmount = Math.min(total, Math.round((Number(row.paid_amount || 0) + received) * 100) / 100);
  const status = paidAmount >= total ? "pago" : "parcial";
  await client
    .from("accounts_receivable")
    .update({ paid_amount: paidAmount, status, settled_at: status === "pago" ? new Date().toISOString() : null })
    .eq("id", receivableId);
}
