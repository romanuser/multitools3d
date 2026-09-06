"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Printer = { id: string; name: string; model: string | null; status: string; photo_url: string | null };
type Filament = {
  id: string;
  material: string;
  color: string;
  color_hex: string | null;
  brand: string | null;
  spool_weight_g: number;
  current_grams: number;
  low_stock_alert_g: number;
};
type Job = {
  id: string;
  name: string;
  printer_id: string;
  status: string;
  planned_grams: number;
  estimated_time_min: number | null;
  started_at: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  livre: "Livre",
  imprimindo: "Imprimindo",
  manutencao: "Em manutenção",
};

const STATUS_COLORS: Record<string, string> = {
  livre: "text-good",
  imprimindo: "text-amber",
  manutencao: "text-danger",
};

type StoreStats = {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  productCount: number;
  lowStockProducts: number;
  salesByDay: { label: string; total: number }[];
};

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OverviewBoard({
  printers,
  filaments,
  jobs,
  storeStats,
}: {
  printers: Printer[];
  filaments: Filament[];
  jobs: Job[];
  storeStats: StoreStats | null;
}) {
  const activeJobByPrinter = new Map(jobs.filter((j) => j.status === "imprimindo").map((j) => [j.printer_id, j]));
  const failedJobs = jobs.filter((j) => j.status === "falha");
  const queuedCount = jobs.filter((j) => j.status === "fila").length;
  const lowStockFilaments = filaments.filter((f) => f.current_grams <= f.low_stock_alert_g);
  const maintenancePrinters = printers.filter((p) => p.status === "manutencao");

  const hasAlerts = lowStockFilaments.length > 0 || maintenancePrinters.length > 0 || failedJobs.length > 0;

  return (
    <div className="space-y-10">
      {hasAlerts && (
        <section>
          <h2 className="font-display text-lg text-ink mb-3">Avisos</h2>
          <div className="space-y-2">
            {failedJobs.map((job) => (
              <Alert key={job.id} href="/dashboard/fila" tone="danger">
                <strong>{job.name}</strong> falhou e está aguardando a pesagem do resíduo.
              </Alert>
            ))}
            {maintenancePrinters.map((p) => (
              <Alert key={p.id} href="/dashboard/impressoras" tone="amber">
                <strong>{p.name}</strong> está em manutenção.
              </Alert>
            ))}
            {lowStockFilaments.map((f) => (
              <Alert key={f.id} href="/dashboard/estoque" tone="amber">
                Estoque baixo: <strong>{f.material} · {f.color}</strong> ({f.current_grams}g restantes).
              </Alert>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg text-ink">Impressoras</h2>
          {queuedCount > 0 && (
            <Link href="/dashboard/fila" className="text-xs text-amber hover:underline underline-offset-2">
              {queuedCount} na fila
            </Link>
          )}
        </div>
        {printers.length === 0 ? (
          <EmptyState href="/dashboard/impressoras" label="Cadastrar impressora" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {printers.map((printer) => (
              <PrinterCard key={printer.id} printer={printer} job={activeJobByPrinter.get(printer.id) ?? null} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg text-ink mb-3">Estoque de filamento</h2>
        {filaments.length === 0 ? (
          <EmptyState href="/dashboard/estoque" label="Cadastrar filamento" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filaments.map((f) => (
              <FilamentCard key={f.id} filament={f} />
            ))}
          </div>
        )}
      </section>

      {storeStats && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-ink">Loja</h2>
            <Link href="/dashboard/loja" className="text-xs text-amber hover:underline underline-offset-2">
              Ver loja
            </Link>
          </div>
          <div className="grid sm:grid-cols-4 gap-4 mb-4">
            <StatCard label="Faturado (pago)" value={money(storeStats.revenue)} />
            <StatCard label="Pedidos" value={String(storeStats.totalOrders)} sub={`${storeStats.pendingOrders} aguardando pagamento`} />
            <StatCard label="Produtos" value={String(storeStats.productCount)} />
            <StatCard
              label="Estoque baixo"
              value={String(storeStats.lowStockProducts)}
              tone={storeStats.lowStockProducts > 0 ? "danger" : undefined}
            />
          </div>
          <div className="border border-line bg-surface rounded-2xl p-4">
            <p className="text-xs text-ink-muted mb-3">Vendas pagas nos últimos 7 dias</p>
            <div className="flex items-end gap-2 h-24">
              {storeStats.salesByDay.map((day) => {
                const max = Math.max(1, ...storeStats.salesByDay.map((d) => d.total));
                const height = Math.max(4, (day.total / max) * 100);
                return (
                  <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-paper rounded-t-md overflow-hidden flex items-end" style={{ height: "80px" }}>
                      <div className="w-full bg-amber rounded-t-md" style={{ height: `${height}%` }} />
                    </div>
                    <span className="text-xs text-ink-muted capitalize">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "danger" }) {
  return (
    <div className="border border-line bg-surface rounded-2xl p-4">
      <p className="text-xs text-ink-muted mb-1">{label}</p>
      <p className={`font-display text-xl ${tone === "danger" ? "text-danger" : "text-ink"}`}>{value}</p>
      {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Alert({ children, href, tone }: { children: React.ReactNode; href: string; tone: "danger" | "amber" }) {
  return (
    <Link
      href={href}
      className={`block text-sm rounded-xl px-4 py-3 border transition-colors ${
        tone === "danger"
          ? "border-danger/30 bg-danger/10 text-ink hover:border-danger/50"
          : "border-amber/30 bg-amber-soft text-ink hover:border-amber/50"
      }`}
    >
      {children}
    </Link>
  );
}

function EmptyState({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6 hover:border-amber hover:text-ink transition-colors"
    >
      {label} →
    </Link>
  );
}

function PrinterCard({ printer, job }: { printer: Printer; job: Job | null }) {
  const [now, setNow] = useState(() => Date.now());
  const hasTimer = !!job?.estimated_time_min && !!job?.started_at;

  useEffect(() => {
    if (!hasTimer) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasTimer]);

  const elapsedMin = hasTimer ? (now - new Date(job!.started_at!).getTime()) / 60000 : 0;
  const percent = hasTimer ? Math.min(100, (elapsedMin / job!.estimated_time_min!) * 100) : 0;
  const remainingMin = hasTimer ? Math.max(0, Math.ceil(job!.estimated_time_min! - elapsedMin)) : 0;

  return (
    <div className="border border-line bg-surface rounded-2xl p-4 flex gap-4">
      {printer.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={printer.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-line shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-paper border border-line flex items-center justify-center text-ink-muted text-xs shrink-0">
          sem foto
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-ink truncate">{printer.name}</p>
          <span className={`text-xs font-medium shrink-0 ${STATUS_COLORS[printer.status] || "text-ink-muted"}`}>
            {STATUS_LABELS[printer.status] || printer.status}
          </span>
        </div>
        <p className="text-xs text-ink-muted">{printer.model || "—"}</p>

        {job && (
          <div className="mt-2">
            <p className="text-xs text-ink truncate">{job.name}</p>
            {hasTimer ? (
              <>
                <div className="h-1.5 rounded-full bg-paper overflow-hidden mt-1">
                  <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-xs text-ink-muted font-spec mt-1">
                  {percent >= 100 ? "concluindo…" : `${remainingMin} min restantes`}
                </p>
              </>
            ) : (
              <p className="text-xs text-ink-muted mt-1">sem estimativa de tempo</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilamentCard({ filament }: { filament: Filament }) {
  const percent = Math.min(100, Math.max(0, (filament.current_grams / filament.spool_weight_g) * 100));
  const low = filament.current_grams <= filament.low_stock_alert_g;

  return (
    <div className="border border-line bg-surface rounded-2xl p-4 flex gap-3 items-center">
      <span
        className="w-6 h-6 rounded-full border border-line shrink-0"
        style={{ backgroundColor: filament.color_hex || "#8d919c" }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink truncate">
          {filament.material} · {filament.color}
        </p>
        <div className="h-1.5 rounded-full bg-paper overflow-hidden mt-1.5">
          <div className={`h-full rounded-full ${low ? "bg-danger" : "bg-amber"}`} style={{ width: `${percent}%` }} />
        </div>
        <p className={`text-xs mt-1 font-spec ${low ? "text-danger" : "text-ink-muted"}`}>
          {filament.current_grams.toLocaleString("pt-BR")}g de {filament.spool_weight_g.toLocaleString("pt-BR")}g
        </p>
      </div>
    </div>
  );
}
