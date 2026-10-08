"use client";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Receivable = { total_amount: number; paid_amount: number; status: string; due_date: string };

export function ReceivableChart({ receivables }: { receivables: Receivable[] }) {
  if (receivables.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const paid = receivables.reduce((sum, r) => sum + Number(r.paid_amount), 0);
  const pendingOnTime = receivables
    .filter((r) => r.status !== "pago" && r.status !== "baixado_sem_pagar" && r.due_date >= today)
    .reduce((sum, r) => sum + (Number(r.total_amount) - Number(r.paid_amount)), 0);
  const overdue = receivables
    .filter((r) => r.status !== "pago" && r.status !== "baixado_sem_pagar" && r.due_date < today)
    .reduce((sum, r) => sum + (Number(r.total_amount) - Number(r.paid_amount)), 0);

  const total = paid + pendingOnTime + overdue;
  if (total <= 0) return null;

  const segments = [
    { label: "Recebido", value: paid, color: "bg-good" },
    { label: "A vencer", value: pendingOnTime, color: "bg-accent-blue" },
    { label: "Atrasado", value: overdue, color: "bg-danger" },
  ].filter((s) => s.value > 0);

  return (
    <div className="border border-line bg-surface rounded-2xl p-5 mb-6">
      <p className="text-sm font-medium text-ink mb-4">Panorama geral</p>
      <div className="h-3 rounded-full overflow-hidden flex bg-paper mb-3">
        {segments.map((s) => (
          <div key={s.label} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} title={s.label} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            {s.label}: <span className="text-ink font-spec">{money(s.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
