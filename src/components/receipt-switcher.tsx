"use client";

import { useState } from "react";
import { ReceiptView } from "./receipt-view";
import { ThermalReceipt } from "./thermal-receipt";

type ReceiptItem = { description: string; quantity: number; unitPrice?: number; total?: number };

// ---------------------------------------------------------------------
// Deixa a pessoa escolher entre o recibo "bonito" (com logo, pensado pra
// imprimir em folha A4) e o recibo "cupom" (estilo impressora térmica,
// mais rápido de conferir). Os dois mostram os mesmos dados — só muda o
// visual. A escolha é lembrada no navegador, pra não perguntar de novo.
// ---------------------------------------------------------------------
export function ReceiptSwitcher({
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
  const [format, setFormat] = useState<"bonito" | "cupom">(() => {
    if (typeof window === "undefined") return "bonito";
    return localStorage.getItem("mf3d-receipt-format") === "cupom" ? "cupom" : "bonito";
  });

  function choose(f: "bonito" | "cupom") {
    setFormat(f);
    try {
      localStorage.setItem("mf3d-receipt-format", f);
    } catch {
      // sem problema se não conseguir salvar a preferência
    }
  }

  const thermalLines: { label: string; qty?: number; value?: number }[] = items.map((item) => ({
    label: item.description,
    qty: item.quantity,
    value: item.total ?? (item.unitPrice ? item.unitPrice * item.quantity : undefined),
  }));
  if (shippingLabel) thermalLines.push({ label: `Frete · ${shippingLabel}`, value: shippingPrice || 0 });

  return (
    <div>
      <div className="flex justify-center gap-2 mb-5 print:hidden">
        <button
          type="button"
          onClick={() => choose("bonito")}
          className={`text-xs rounded-full px-3.5 py-1.5 border transition-colors ${
            format === "bonito" ? "bg-amber text-on-accent border-amber" : "border-line text-ink-muted"
          }`}
        >
          Recibo
        </button>
        <button
          type="button"
          onClick={() => choose("cupom")}
          className={`text-xs rounded-full px-3.5 py-1.5 border transition-colors ${
            format === "cupom" ? "bg-amber text-on-accent border-amber" : "border-line text-ink-muted"
          }`}
        >
          Cupom
        </button>
      </div>

      {format === "bonito" ? (
        <ReceiptView
          orderId={orderId}
          storeName={storeName}
          customerName={customerName}
          customerEmail={customerEmail}
          items={items}
          total={total}
          shippingLabel={shippingLabel}
          shippingPrice={shippingPrice}
          createdAt={createdAt}
          status={status}
          productionMinutes={productionMinutes}
          shippingDays={shippingDays}
          isPickup={isPickup}
          paymentTransactionNsu={paymentTransactionNsu}
          paymentInvoiceSlug={paymentInvoiceSlug}
        />
      ) : (
        <ThermalReceipt
          storeName={storeName}
          title="Comprovante de venda"
          reference={customerName || customerEmail || undefined}
          date={new Date(createdAt).toLocaleDateString("pt-BR")}
          lines={thermalLines}
          total={total}
        />
      )}
    </div>
  );
}
