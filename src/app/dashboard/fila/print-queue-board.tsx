"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createJob, startJob, completeJob, failJob, recalcFailure, deleteJob } from "@/lib/print-jobs/actions";

type Job = {
  id: string;
  sequence_number: number;
  name: string;
  printer_id: string;
  filament_stock_id: string;
  planned_grams: number;
  actual_grams: number | null;
  waste_grams: number | null;
  status: string;
  estimated_time_min: number | null;
  started_at: string | null;
  sell_price: number | null;
  cost_snapshot: number | null;
  profit: number | null;
};

type Printer = { id: string; name: string };
type FilamentOption = { id: string; label: string };

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PrintQueueBoard({
  jobs,
  printers,
  filaments,
}: {
  jobs: Job[];
  printers: Printer[];
  filaments: FilamentOption[];
}) {
  const [showForm, setShowForm] = useState(false);
  const printerName = (id: string) => printers.find((p) => p.id === id)?.name ?? "—";
  const filamentLabel = (id: string) => filaments.find((f) => f.id === id)?.label ?? "—";

  const fila = jobs.filter((j) => j.status === "fila");
  const imprimindo = jobs.filter((j) => j.status === "imprimindo");
  const finalizadas = jobs.filter((j) => j.status === "concluida" || j.status === "falha" || j.status === "falha_recalculada");

  return (
    <div>
      <div className="mb-6">
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={!printers.length || !filaments.length}
            className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 hover:bg-amber-soft transition-colors disabled:opacity-40"
          >
            + Nova impressão
          </button>
        ) : (
          <NewJobForm printers={printers} filaments={filaments} onDone={() => setShowForm(false)} />
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Column title="Fila" count={fila.length}>
          {fila.map((job) => (
            <JobCard key={job.id} job={job} printerName={printerName(job.printer_id)} filamentLabel={filamentLabel(job.filament_stock_id)} />
          ))}
        </Column>
        <Column title="Imprimindo" count={imprimindo.length}>
          {imprimindo.map((job) => (
            <JobCard key={job.id} job={job} printerName={printerName(job.printer_id)} filamentLabel={filamentLabel(job.filament_stock_id)} />
          ))}
        </Column>
        <Column title="Finalizadas" count={finalizadas.length}>
          {finalizadas.map((job) => (
            <JobCard key={job.id} job={job} printerName={printerName(job.printer_id)} filamentLabel={filamentLabel(job.filament_stock_id)} />
          ))}
        </Column>
      </div>
    </div>
  );
}

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-ink-muted mb-3">
        {title} <span className="text-xs">({count})</span>
      </p>
      <div className="space-y-3">
        {count === 0 && <p className="text-xs text-ink-muted border border-dashed border-line rounded-xl p-4">Vazio</p>}
        {children}
      </div>
    </div>
  );
}

function JobCard({ job, printerName, filamentLabel }: { job: Job; printerName: string; filamentLabel: string }) {
  const [pending, setPending] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showRecalc, setShowRecalc] = useState(false);
  const [actualGrams, setActualGrams] = useState(job.planned_grams);
  const [wasteGrams, setWasteGrams] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const autoCompletedRef = useRef(false);

  const hasTimer = job.status === "imprimindo" && !!job.estimated_time_min && !!job.started_at;

  useEffect(() => {
    if (!hasTimer) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasTimer]);

  const elapsedMin = hasTimer ? (now - new Date(job.started_at!).getTime()) / 60000 : 0;
  const percent = hasTimer ? Math.min(100, (elapsedMin / job.estimated_time_min!) * 100) : 0;
  const remainingMin = hasTimer ? Math.max(0, Math.ceil(job.estimated_time_min! - elapsedMin)) : 0;

  async function run(fn: () => Promise<{ error?: string }>) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (result.error) alert(result.error);
  }

  useEffect(() => {
    if (hasTimer && percent >= 100 && !autoCompletedRef.current) {
      autoCompletedRef.current = true;
      run(() => completeJob(job.id, job.planned_grams));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTimer, percent]);

  return (
    <div className="border border-line bg-surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-ink-muted font-spec">#{job.sequence_number}</p>
          <p className="font-medium text-ink">{job.name}</p>
        </div>
        {job.status === "fila" && (
          <button
            type="button"
            onClick={() => run(() => deleteJob(job.id))}
            className="text-xs text-ink-muted hover:text-danger"
            aria-label="Remover"
          >
            ×
          </button>
        )}
      </div>
      <p className="text-xs text-ink-muted mt-1">{printerName} · {filamentLabel}</p>
      <p className="text-xs text-ink-muted font-spec mt-1">
        {job.planned_grams}g planejados{job.estimated_time_min ? ` · ${job.estimated_time_min} min` : ""}
      </p>

      {hasTimer && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-ink-muted">
              {percent >= 100 ? "Concluindo…" : `${remainingMin} min restantes`}
            </span>
            <span className="text-ink-muted font-spec">{percent.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-paper overflow-hidden">
            <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {job.status === "concluida" && (
        <div className="mt-3 pt-3 border-t border-line text-xs space-y-1">
          <Row label="Usado" value={`${job.actual_grams ?? job.planned_grams}g`} />
          {job.cost_snapshot != null && <Row label="Custo" value={money(job.cost_snapshot)} />}
          {job.profit != null && <Row label="Lucro" value={money(job.profit)} good />}
        </div>
      )}
      {job.status === "falha" && (
        <p className="text-xs text-danger mt-2">Falhou — aguardando pesagem do resíduo</p>
      )}
      {job.status === "falha_recalculada" && (
        <p className="text-xs text-danger mt-2">Falhou · {job.waste_grams}g de resíduo</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {job.status === "fila" && (
          <ActionButton onClick={() => run(() => startJob(job.id))} pending={pending}>
            Iniciar impressão
          </ActionButton>
        )}
        {job.status === "imprimindo" && !showComplete && (
          <>
            <ActionButton onClick={() => setShowComplete(true)} pending={pending}>
              {job.estimated_time_min ? "Concluir agora" : "Concluir"}
            </ActionButton>
            <ActionButton onClick={() => run(() => failJob(job.id))} pending={pending} variant="danger">
              Registrar falha
            </ActionButton>
          </>
        )}
        {job.status === "falha" && !showRecalc && (
          <ActionButton onClick={() => setShowRecalc(true)} pending={pending}>
            Registrar resíduo
          </ActionButton>
        )}
      </div>

      {showComplete && (
        <div className="mt-3 pt-3 border-t border-line space-y-2">
          <label className="block">
            <span className="block text-xs text-ink-muted mb-1">Gramas realmente usadas</span>
            <input
              type="number"
              min="0"
              value={actualGrams}
              onChange={(e) => setActualGrams(Number(e.target.value))}
              className="input font-spec"
            />
          </label>
          <div className="flex gap-2">
            <ActionButton onClick={() => run(() => completeJob(job.id, actualGrams))} pending={pending}>
              Confirmar
            </ActionButton>
            <button type="button" onClick={() => setShowComplete(false)} className="text-xs text-ink-muted hover:text-ink">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showRecalc && (
        <div className="mt-3 pt-3 border-t border-line space-y-2">
          <label className="block">
            <span className="block text-xs text-ink-muted mb-1">Peso do resíduo (g)</span>
            <input
              type="number"
              min="0"
              value={wasteGrams}
              onChange={(e) => setWasteGrams(Number(e.target.value))}
              className="input font-spec"
            />
          </label>
          <div className="flex gap-2">
            <ActionButton onClick={() => run(() => recalcFailure(job.id, wasteGrams))} pending={pending}>
              Confirmar
            </ActionButton>
            <button type="button" onClick={() => setShowRecalc(false)} className="text-xs text-ink-muted hover:text-ink">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className={`font-spec ${good ? "text-good" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  pending,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  pending: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`text-xs font-medium rounded-full px-3 py-1.5 disabled:opacity-50 ${
        variant === "danger" ? "text-danger border border-danger/30 hover:bg-danger/10" : "bg-amber text-white"
      }`}
    >
      {children}
    </button>
  );
}

function NewJobForm({
  printers,
  filaments,
  onDone,
}: {
  printers: Printer[];
  filaments: FilamentOption[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(createJob, undefined);

  if (state !== undefined && !state.error && !pending) {
    queueMicrotask(onDone);
  }

  return (
    <form action={formAction} className="border border-line bg-surface rounded-2xl p-6 space-y-4 max-w-xl">
      <p className="font-display text-lg text-ink">Nova impressão</p>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Nome da peça</span>
        <input name="name" required className="input" placeholder="Ex: Suporte de celular" />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Impressora</span>
          <select name="printerId" required className="input">
            <option value="">Selecione…</option>
            {printers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Filamento</span>
          <select name="filamentStockId" required className="input">
            <option value="">Selecione…</option>
            {filaments.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Gramagem planejada</span>
          <input type="number" name="plannedGrams" min="1" required className="input font-spec" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Tempo estimado (min, opcional)</span>
          <input type="number" name="estimatedTimeMin" min="0" className="input font-spec" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Preço de venda (opcional)</span>
          <input type="number" step="0.01" name="sellPrice" min="0" className="input font-spec" />
        </label>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-white font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {pending ? "Criando…" : "Adicionar à fila"}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-ink-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}
