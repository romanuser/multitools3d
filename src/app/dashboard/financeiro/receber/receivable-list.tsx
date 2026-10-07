"use client";

import { useState } from "react";
import { markReceivablePaid } from "@/lib/finance/actions";
import { ThermalReceipt } from "@/components/thermal-receipt";

const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");

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
};

export function ReceivableList({ receivables }: { receivables: Receivable[] }) {
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

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line">
              {r.payment_link_url && !isSettled && (
                <a
                  href={r.payment_link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber hover:underline"
                >
                  Ver link de cobrança
                </a>
              )}
              {!isSettled && <MarkPaidButton receivable={r} />}
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

function MarkPaidButton({ receivable: r }: { receivable: Receivable }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(r.total_amount - r.paid_amount));
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-good hover:underline">
        Marcar como pago
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="input font-spec w-28 py-1 text-xs"
      />
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await markReceivablePaid(r.id, Number(amount));
          setPending(false);
          setOpen(false);
        }}
        className="text-xs bg-amber text-on-accent rounded-full px-3 py-1.5 disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Confirmar"}
      </button>
    </div>
  );
}
