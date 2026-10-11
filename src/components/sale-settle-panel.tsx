"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markReceivablePaid } from "@/lib/finance/actions";
import { PAID_NOW_METHODS, paymentLabel } from "@/lib/sales/types";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------------------------------------------------------------------
// Venda ainda não recebida (link de cobrança ou fiado): mostra a situação
// e deixa o lojista dar BAIXA MANUAL escolhendo a forma de pagamento —
// pra quando o cliente pagou por fora (dinheiro, Pix direto, maquininha).
// Pelo link, a baixa é automática e a forma vem da InfinitePay.
// ---------------------------------------------------------------------
export function SaleSettlePanel({
  receivableId,
  balance,
  statusLabel,
  byLink,
}: {
  receivableId: string;
  balance: number;
  statusLabel: string;
  byLink: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState<string>("pix");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    const result = await markReceivablePaid(receivableId, Number(String(amount).replace(",", ".")), method);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3 mb-6 text-sm print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-ink">{statusLabel}</p>
          <p className="text-xs text-ink-muted">
            Falta receber <span className="font-spec text-ink">{money(balance)}</span>
            {byLink && " · baixa automática quando o cliente pagar pelo link"}
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs rounded-full border border-line px-3 py-1.5 text-ink hover:bg-surface-raised"
          >
            {byLink ? "Pagou por fora? Dar baixa manual" : "Dar baixa manual"}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-line space-y-3">
          <div>
            <p className="text-xs text-ink-muted mb-1.5">Forma de pagamento</p>
            <div className="flex flex-wrap gap-2">
              {PAID_NOW_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  aria-pressed={method === m}
                  className={`text-xs rounded-full border px-3 py-1.5 transition-colors ${
                    method === m ? "border-amber bg-amber-soft text-ink" : "border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  {paymentLabel(m)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="block text-xs text-ink-muted mb-1">Valor recebido (R$)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="input font-spec w-36"
              />
            </label>
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className="bg-amber text-on-accent font-medium rounded-full px-4 py-2 text-xs disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Confirmar recebimento"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-muted hover:text-ink py-2">
              Cancelar
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
