"use client";

import { Brand } from "./brand";
import { Icon } from "./icons";
import { formatDeliveryEstimate } from "@/lib/store/delivery-estimate";

type ReceiptItem = {
  description: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
};

const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Número de recibo "humano" a partir do id do pedido — curto, sem precisar
// de uma coluna nova no banco.
function receiptNumber(orderId: string) {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function ReceiptView({
  orderId,
  storeName,
  customerName,
  customerEmail,
  items,
  total,
  shippingLabel,
  shippingPrice,
  createdAt,
  status,
  productionMinutes,
  shippingDays,
  isPickup,
  paymentTransactionNsu,
  paymentInvoiceSlug,
}: {
  orderId: string;
  storeName: string;
  customerName: string | null;
  customerEmail: string | null;
  items: ReceiptItem[];
  total: number;
  shippingLabel?: string | null;
  shippingPrice?: number | null;
  createdAt: string;
  status: string;
  productionMinutes?: number | null;
  shippingDays?: number | null;
  isPickup?: boolean | null;
  paymentTransactionNsu?: string | null;
  paymentInvoiceSlug?: string | null;
}) {
  const deliveryEstimate = formatDeliveryEstimate(productionMinutes || 0, shippingDays ?? null, !!isPickup);
  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={() => window.history.back()} className="text-sm text-ink-muted hover:text-ink">
          ← Voltar
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-surface-raised transition-colors"
        >
          <Icon name="quote" size={14} />
          Imprimir / salvar PDF
        </button>
      </div>

      <div className="border border-line bg-surface rounded-2xl p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-line">
          <div>
            <Brand size={26} />
            <p className="text-sm text-ink-muted mt-2">{storeName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-muted">Comprovante</p>
            <p className="font-spec text-ink">#{receiptNumber(orderId)}</p>
            <p className="text-xs text-ink-muted mt-1">{new Date(createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8 text-sm">
          <div>
            <p className="text-xs text-ink-muted mb-1">Cliente</p>
            <p className="text-ink">{customerName || "—"}</p>
            {customerEmail && <p className="text-ink-muted">{customerEmail}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-ink-muted mb-1">Status do pedido</p>
            <p className="text-ink">{status}</p>
          </div>
        </div>

        {deliveryEstimate && (
          <p className="text-sm text-ink mb-6 -mt-4 flex items-center gap-1.5">
            <span className="text-amber">⏱</span> {deliveryEstimate}
          </p>
        )}

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-xs text-ink-muted border-b border-line">
              <th className="pb-2 font-normal">Item</th>
              <th className="pb-2 font-normal text-center">Qtd.</th>
              <th className="pb-2 font-normal text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-line/60">
                <td className="py-2.5 text-ink">{item.description}</td>
                <td className="py-2.5 text-center text-ink-muted">{item.quantity}</td>
                <td className="py-2.5 text-right font-spec text-ink">
                  {item.total != null ? money(item.total) : "—"}
                </td>
              </tr>
            ))}
            {shippingLabel && (
              <tr>
                <td className="py-2.5 text-ink-muted" colSpan={2}>
                  Frete · {shippingLabel}
                </td>
                <td className="py-2.5 text-right font-spec text-ink">{money(shippingPrice || 0)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="flex items-baseline gap-3">
            <span className="text-sm text-ink-muted">Total pago</span>
            <span className="font-spec text-xl text-amber font-medium">{money(total)}</span>
          </div>
        </div>

        {(paymentTransactionNsu || paymentInvoiceSlug) && (
          <div className="pt-4 border-t border-line text-xs text-ink-muted space-y-0.5">
            <p className="font-medium text-ink mb-1">Comprovante de pagamento (InfinitePay)</p>
            {paymentTransactionNsu && <p>Transação: {paymentTransactionNsu}</p>}
            {paymentInvoiceSlug && <p>Fatura: {paymentInvoiceSlug}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

