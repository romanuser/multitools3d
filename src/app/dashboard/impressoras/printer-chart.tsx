"use client";

const PALETTE = ["bg-amber", "bg-accent-blue", "bg-accent-pink", "bg-good", "bg-warn"];

type Printer = { id: string; name: string };
type Job = { printer_id: string; planned_grams: number | null };

export function PrinterChart({ printers, completedJobs }: { printers: Printer[]; completedJobs: Job[] }) {
  if (printers.length === 0 || completedJobs.length === 0) return null;

  const rows = printers
    .map((p, i) => {
      const jobs = completedJobs.filter((j) => j.printer_id === p.id);
      const grams = jobs.reduce((sum, j) => sum + (j.planned_grams || 0), 0);
      return { name: p.name, count: jobs.length, grams, color: PALETTE[i % PALETTE.length] };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  if (rows.length === 0) return null;

  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="border border-line bg-surface rounded-2xl p-5 mb-6">
      <p className="text-sm font-medium text-ink mb-4">Produção por impressora — últimos 30 dias</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-ink">{r.name}</span>
              <span className="text-ink-muted font-spec">
                {r.count} peça{r.count === 1 ? "" : "s"} · {(r.grams / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}kg
              </span>
            </div>
            <div className="h-2 rounded-full bg-paper overflow-hidden">
              <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.count / maxCount) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
