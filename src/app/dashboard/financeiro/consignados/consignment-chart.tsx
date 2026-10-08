"use client";

type Consignment = { quantity_delivered: number; quantity_remaining: number; status: string };

export function ConsignmentChart({ consignments }: { consignments: Consignment[] }) {
  if (consignments.length === 0) return null;

  const totalDelivered = consignments.reduce((sum, c) => sum + c.quantity_delivered, 0);
  const totalRemaining = consignments.reduce((sum, c) => sum + c.quantity_remaining, 0);
  const totalMoved = totalDelivered - totalRemaining; // vendido + recolhido, juntos

  if (totalDelivered <= 0) return null;

  const segments = [
    { label: "Ainda em consignação", value: totalRemaining, color: "bg-accent-blue" },
    { label: "Já acertado (vendido ou recolhido)", value: totalMoved, color: "bg-amber" },
  ].filter((s) => s.value > 0);

  return (
    <div className="border border-line bg-surface rounded-2xl p-5 mb-6">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-medium text-ink">Panorama geral</p>
        <p className="text-sm text-ink-muted font-spec">{totalDelivered} unidade(s) entregues no total</p>
      </div>
      <div className="h-3 rounded-full overflow-hidden flex bg-paper mb-3">
        {segments.map((s) => (
          <div key={s.label} className={s.color} style={{ width: `${(s.value / totalDelivered) * 100}%` }} title={s.label} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            {s.label}: <span className="text-ink font-spec">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
