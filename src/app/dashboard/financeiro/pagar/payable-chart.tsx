"use client";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CATEGORY_LABELS: Record<string, string> = {
  prolabore: "Pró-labore",
  consignado_insumo: "Consignado de insumos",
  custo_mensal: "Custo mensal",
  outro: "Outro",
};
const CATEGORY_COLORS: Record<string, string> = {
  prolabore: "bg-amber",
  consignado_insumo: "bg-accent-blue",
  custo_mensal: "bg-accent-pink",
  outro: "bg-ink-muted",
};

type Payable = { category: string; total_amount: number };

export function PayableChart({ payables }: { payables: Payable[] }) {
  if (payables.length === 0) return null;

  const byCategory = new Map<string, number>();
  for (const p of payables) {
    byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + Number(p.total_amount));
  }
  const total = [...byCategory.values()].reduce((sum, v) => sum + v, 0);
  if (total <= 0) return null;

  const rows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="border border-line bg-surface rounded-2xl p-5 mb-6">
      <p className="text-sm font-medium text-ink mb-4">Despesas por categoria</p>
      <div className="h-3 rounded-full overflow-hidden flex bg-paper mb-3">
        {rows.map(([cat, value]) => (
          <div
            key={cat}
            className={CATEGORY_COLORS[cat] || "bg-ink-muted"}
            style={{ width: `${(value / total) * 100}%` }}
            title={CATEGORY_LABELS[cat] || cat}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {rows.map(([cat, value]) => (
          <span key={cat} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat] || "bg-ink-muted"}`} />
            {CATEGORY_LABELS[cat] || cat}: <span className="text-ink font-spec">{money(value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
