export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Cartão de débito" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "outro", label: "Outro" },
  { value: "a_receber", label: "Fiado (recebe depois)" },
  { value: "link", label: "Link de cobrança" },
] as const;

// Recebidas na hora, com baixa manual do vendedor.
export const PAID_NOW_METHODS = ["pix", "dinheiro", "debito", "credito", "outro"] as const;
// Fiado: baixa manual depois, em Contas a receber.
export const ON_CREDIT = "a_receber";
// Link de cobrança InfinitePay: baixa automática quando o cliente paga.
export const PAYMENT_LINK = "link";

// Vendas que ainda não foram recebidas — viram conta a receber e só
// entram no faturamento quando forem quitadas.
export function isPendingMethod(method: string | null | undefined) {
  return method === ON_CREDIT || method === PAYMENT_LINK;
}

export type SaleReceivable = {
  id?: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  payment_link_url: string | null;
};

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateBR = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR");

// Situação do pagamento de uma venda, em texto. Venda fiado acompanha a
// conta a receber ligada a ela (pendente, parcial, quitada).
// Um recebimento de conta a receber (receivable_payments).
export type ReceivablePayment = {
  amount: number;
  method: string;
  source: string; // manual | link
  installments: number | null;
  paid_at: string;
};

// InfinitePay -> nossas formas de pagamento.
export function methodFromCapture(capture: string | null | undefined) {
  const c = String(capture || "").toLowerCase();
  if (c.includes("pix")) return "pix";
  if (c.includes("debit")) return "debito";
  if (c.includes("credit") || c.includes("card")) return "credito";
  return "link";
}

// "Cartão de crédito 3x · pelo link", "Dinheiro", …
export function describePayment(p: Pick<ReceivablePayment, "method" | "source" | "installments">) {
  const base = p.method === "link" ? "InfinitePay" : paymentLabel(p.method);
  const parcels = p.method === "credito" && p.installments && p.installments > 1 ? ` ${p.installments}x` : "";
  return `${base}${parcels}${p.source === "link" ? " · pelo link" : ""}`;
}

export function paymentLines(payments: ReceivablePayment[] | null | undefined) {
  return (payments ?? []).map(
    (p) => `${new Date(p.paid_at).toLocaleDateString("pt-BR")} · ${describePayment(p)} · ${brl(Number(p.amount))}`
  );
}

export function salePaymentStatus(
  paymentMethod: string,
  receivable: SaleReceivable | null | undefined,
  payments?: ReceivablePayment[] | null
) {
  if (!isPendingMethod(paymentMethod)) {
    return { label: `Pago · ${paymentLabel(paymentMethod)}`, balance: 0, settled: true };
  }
  const isLink = paymentMethod === PAYMENT_LINK;
  const name = isLink ? "Link de cobrança" : "Fiado";
  if (!receivable) return { label: name, balance: 0, settled: false };
  const total = Number(receivable.total_amount);
  const paid = Number(receivable.paid_amount || 0);
  if (receivable.status === "pago") {
    // Forma(s) de pagamento de verdade: pelo link vem da InfinitePay
    // (Pix/cartão), na baixa manual o lojista escolheu.
    const methods = [...new Set((payments ?? []).map((p) => describePayment(p)))];
    const how = methods.length ? ` · ${methods.join(" + ")}` : "";
    return { label: `${isLink ? "Pago" : "Fiado quitado"}${how}`, balance: 0, settled: true };
  }
  if (receivable.status === "baixado_sem_pagar") return { label: `${name} · baixado`, balance: 0, settled: true };
  const balance = Math.max(0, total - paid);
  const due = dateBR(receivable.due_date);
  if (isLink) {
    return {
      label: paid > 0 ? `Aguardando pagamento · ${brl(paid)} já pago` : "Aguardando pagamento pelo link",
      balance,
      settled: false,
    };
  }
  if (paid > 0) return { label: `Fiado · ${brl(paid)} pago · vence ${due}`, balance, settled: false };
  return { label: `Fiado · a receber até ${due}`, balance, settled: false };
}

export function paymentLabel(value: string | null | undefined) {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value ?? "—";
}

export function saleNumberLabel(n: number | null | undefined) {
  return `V-${String(n ?? 0).padStart(4, "0")}`;
}

export type SaleItemInput = {
  kind: "catalog" | "manual";
  productId?: string | null;
  description: string;
  color?: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  grams: number;
  timeMin: number | null;
  filamentStockId?: string | null;
  saveAsProduct?: boolean;
};

export type DirectSaleInput = {
  // forma de pagamento da ENTRADA do fiado (se tiver entrada)
  downPaymentMethod?: string;
  customer: { name: string; phone: string; document: string; email: string; address: string };
  items: SaleItemInput[];
  discount: number;
  paymentMethod: string;
  notes: string;
  sendToQueue: boolean;
  manualPrinterId: string | null;
  // Venda não recebida na hora: fiado (baixa manual depois) ou link de
  // cobrança (baixa automática). dueDate = prazo pra pagar.
  credit?: { dueDate: string; downPayment: number };
};

// Como cada item fica guardado em direct_sales.items (mesmo formato
// básico dos pedidos da loja: description/quantity/unitPrice/total).
export type StoredSaleItem = {
  productId?: string | null;
  description: string;
  color?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  unitCost?: number;
  grams?: number;
  timeMin?: number | null;
};
