"use client";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Alterna entre as 3 cores de destaque do sistema, pra dar variedade
// visual quando tem vários materiais diferentes em estoque.
const PALETTE = [
  { bar: "bg-amber", dot: "bg-amber" },
  { bar: "bg-accent-blue", dot: "bg-accent-blue" },
  { bar: "bg-accent-pink", dot: "bg-accent-pink" },
];

type Filament = { material: string; current_grams: number; cost_per_kg: number };

export function StockChart({ filaments }: { filaments: Filament[] }) {
  if (filaments.length === 0) return null;

  const byMaterial = new Map<string, { grams: number; value: number }>();
  for (const f of filaments) {
    const entry = byMaterial.get(f.material) ?? { grams: 0, value: 0 };
    entry.grams += f.current_grams;
    entry.value += (f.current_grams / 1000) * Number(f.cost_per_kg || 0);
    byMaterial.set(f.material, entry);
  }

  const rows = [...byMaterial.entries()]
    .map(([material, v], i) => ({ material, ...v, ...PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.grams - a.grams);

  const totalGrams = rows.reduce((sum, r) => sum + r.grams, 0);
  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const maxGrams = Math.max(1, ...rows.map((r) => r.grams));

  return (
    <div className="border border-line bg-surface rounded-2xl p-5 mb-6">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-medium text-ink">Estoque por material</p>
        <p className="text-sm text-ink-muted">
          {(totalGrams / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}kg · {money(totalValue)}
        </p>
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.material}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-ink">
                <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                {r.material}
              </span>
              <span className="text-ink-muted font-spec">
                {r.grams.toLocaleString("pt-BR")}g · {money(r.value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-paper overflow-hidden">
              <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${(r.grams / maxGrams) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
