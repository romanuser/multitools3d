"use client";

import { useState } from "react";
import Link from "next/link";
import { generateReceivableLink, markReceivablePaid } from "@/lib/finance/actions";
import { ThermalReceipt } from "@/components/thermal-receipt";
import { PAID_NOW_METHODS, describePayment, paymentLabel, type ReceivablePayment } from "@/lib/sales/types";

const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Data pura ("2026-11-10") vira meio-dia local — sem isso, no fuso do
// Brasil (UTC-3) a data aparecia um dia antes.
const dateFmt = (d: string) =>
  new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR");

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  parcial: "Pago parcial",
  pago: "Pago",
  baixado_sem_pagar: "Baixado (sem cobrar o resto)",
};

type Receivable = {
  id: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  payment_link_url: string | null;
  settled_at: string | null;
  created_at: string;
  direct_sale_id?: string | null;
};

type Customer = { name: string; phone: string | null };

export function ReceivableList({
  receivables,
  customers = {},
  payments = {},
  storeName = "nossa loja",
  hasInfinitepay = false,
}: {
  receivables: Receivable[];
  customers?: Record<string, Customer>;
  payments?: Record<string, ReceivablePayment[]>;
  storeName?: string;
  hasInfinitepay?: boolean;
}) {
  const [receiptFor, setReceiptFor] = useState<Receivable | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  if (receivables.length === 0) {
    return (
      <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
        Nenhuma conta a receber ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {receivables.map((r) => {
        const isSettled = r.status === "pago" || r.status === "baixado_sem_pagar";
        const isOverdue = !isSettled && r.due_date < today;

        return (
          <div key={r.id} className="border border-line bg-surface rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-ink">{r.description}</p>
                <p className={`text-xs mt-0.5 ${isOverdue ? "text-danger" : "text-ink-muted"}`}>
                  Prazo: {dateFmt(r.due_date)} {isOverdue && "· atrasado"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-spec text-sm text-ink">{money(r.total_amount)}</p>
                <p className="text-xs text-ink-muted">
                  {r.paid_amount > 0 && r.paid_amount < r.total_amount ? `${money(r.paid_amount)} pago · ` : ""}
                  {STATUS_LABELS[r.status] || r.status}
                </p>
              </div>
            </div>

            {(payments[r.id]?.length ?? 0) > 0 && (
              <ul className="mt-2 space-y-0.5">
                {payments[r.id].map((p, i) => (
                  <li key={i} className="text-[11px] text-ink-muted font-spec">
                    {dateFmt(p.paid_at)} · {describePayment(p)} · {money(p.amount)}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-line">
              {!isSettled && (
                <ChargeActions
                  receivable={r}
                  customer={r.direct_sale_id ? customers[r.direct_sale_id] : undefined}
                  storeName={storeName}
                  hasInfinitepay={hasInfinitepay}
                  overdue={isOverdue}
                />
              )}
              {!isSettled && <MarkPaidButton receivable={r} />}
              {r.direct_sale_id && (
                <Link
                  href={`/dashboard/comprovantes/venda/${r.direct_sale_id}`}
                  className="text-xs text-ink-muted hover:text-ink hover:underline"
                >
                  Ver venda
                </Link>
              )}
              {isSettled && (
                <button type="button" onClick={() => setReceiptFor(r)} className="text-xs text-amber hover:underline">
                  Ver cupom
                </button>
              )}
            </div>
          </div>
        );
      })}

      {receiptFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setReceiptFor(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ThermalReceipt
              storeName="Comprovante financeiro"
              title="Recebimento"
              reference={receiptFor.description}
              date={dateFmt(receiptFor.settled_at || receiptFor.created_at)}
              lines={[{ label: receiptFor.description, value: receiptFor.paid_amount }]}
              total={receiptFor.paid_amount}
              footerNote="Comprovante interno — guarde para seu controle"
            />
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => setReceiptFor(null)}
                className="text-sm text-ink-muted hover:text-ink"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Cobrança: gerar o link InfinitePay do saldo, copiar, e mandar no
// WhatsApp do cliente (vendas fiado têm o número salvo). Pago pelo link,
// a conta recebe baixa sozinha pelo webhook.
// ---------------------------------------------------------------------
function ChargeActions({
  receivable: r,
  customer,
  storeName,
  hasInfinitepay,
  overdue,
}: {
  receivable: Receivable;
  customer?: Customer;
  storeName: string;
  hasInfinitepay: boolean;
  overdue: boolean;
}) {
  const [link, setLink] = useState(r.payment_link_url);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const remaining = Number(r.total_amount) - Number(r.paid_amount || 0);

  async function generate() {
    setPending(true);
    const result = await generateReceivableLink(r.id);
    setPending(false);
    if (result.error) alert(result.error);
    else if (result.url) setLink(result.url);
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copie o link de cobrança:", link);
    }
  }

  const digits = (customer?.phone || "").replace(/\D/g, "");
  const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  const firstName = customer?.name.trim().split(/\s+/)[0];
  const whatsappText =
    `Olá${firstName ? `, ${firstName}` : ""}! Aqui é da ${storeName}. ` +
    `Passando pra lembrar do pagamento de ${money(remaining)} (${r.description}), ` +
    `${overdue ? "que venceu em" : "com vencimento em"} ${dateFmt(r.due_date)}.` +
    (link ? ` Pra pagar por Pix ou cartão: ${link}` : "");

  return (
    <>
      {link ? (
        <>
          {phone && (
            <a
              href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[#1fa855] hover:underline"
            >
              Cobrar no WhatsApp
            </a>
          )}
          <button type="button" onClick={copy} className="text-xs text-amber hover:underline">
            {copied ? "Link copiado ✓" : "Copiar link de cobrança"}
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="text-xs text-ink-muted hover:text-ink hover:underline disabled:opacity-50"
            title="Gera um link novo com o saldo atual (use se o cliente pagou uma parte por fora)"
          >
            {pending ? "Gerando…" : "Refazer link"}
          </button>
        </>
      ) : hasInfinitepay ? (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="text-xs text-amber hover:underline disabled:opacity-50"
        >
          {pending ? "Gerando link…" : "Gerar link de cobrança"}
        </button>
      ) : (
        phone && (
          <a
            href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[#1fa855] hover:underline"
          >
            Lembrar no WhatsApp
          </a>
        )
      )}
    </>
  );
}

function MarkPaidButton({ receivable: r }: { receivable: Receivable }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(r.total_amount - r.paid_amount));
  const [method, setMethod] = useState<string>("pix");
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-good hover:underline">
        Marcar como pago
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-ink-muted">Recebido agora</span>
      <div className="w-40">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="input py-1 text-xs"
          aria-label="Forma de pagamento"
        >
          {PAID_NOW_METHODS.map((m) => (
            <option key={m} value={m}>
              {paymentLabel(m)}
            </option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <input
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="input font-spec py-1 text-xs"
      />
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await markReceivablePaid(r.id, Number(amount), method);
          setPending(false);
          if (result.error) alert(result.error);
          else setOpen(false);
        }}
        className="text-xs bg-amber text-on-accent rounded-full px-3 py-1.5 disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Confirmar"}
      </button>
    </div>
  );
}
