import {
  paymentLines,
  salePaymentStatus,
  saleNumberLabel,
  type ReceivablePayment,
  type SaleReceivable,
  type StoredSaleItem,
} from "./types";

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type DirectSaleRow = {
  id: string;
  sale_number: number | null;
  customer_name: string;
  customer_phone: string | null;
  customer_document: string | null;
  customer_email: string | null;
  items: StoredSaleItem[] | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
};

export const RECEIVABLE_COLUMNS = "id, status, total_amount, paid_amount, due_date, payment_link_url";
export const PAYMENT_COLUMNS = "amount, method, source, installments, paid_at";

export const DIRECT_SALE_COLUMNS =
  "id, sale_number, customer_name, customer_phone, customer_document, customer_email, items, subtotal, discount, total, payment_method, notes, created_at";

function formatPhone(digits: string | null) {
  const d = (digits || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d || null;
}

// Converte uma venda direta nas props do ReceiptSwitcher (recibo bonito + cupom).
export function directSaleReceiptProps(
  sale: DirectSaleRow,
  storeName: string,
  receivable?: SaleReceivable | null,
  payments?: ReceivablePayment[] | null
) {
  const discount = Number(sale.discount || 0);
  const payment = salePaymentStatus(sale.payment_method, receivable, payments);
  const lines = paymentLines(payments);
  return {
    orderId: sale.id,
    storeName,
    number: saleNumberLabel(sale.sale_number),
    customerName: sale.customer_name,
    customerEmail: sale.customer_email,
    customerPhone: formatPhone(sale.customer_phone),
    customerDocument: sale.customer_document,
    items: (sale.items ?? []).map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
    extraLines: discount > 0 ? [{ label: "Desconto", value: -discount }] : [],
    total: Number(sale.total),
    createdAt: sale.created_at,
    statusLabel: "Pagamento",
    status: payment.label,
    notes: sale.notes,
    thermalTitle: "Venda",
    totalLabel: payment.settled ? "Total pago" : "Total",
    balanceDue: payment.balance,
    paymentLines: lines,
    thermalFooter:
      [...lines, payment.balance > 0 ? `Saldo a pagar: ${brl(payment.balance)}` : ""].filter(Boolean).join("\n") ||
      undefined,
  };
}
