"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createJob,
  startJob,
  completeJob,
  failJob,
  recalcFailure,
  deleteJob,
  startPart,
  completePart,
  failPart,
  setPartFilament,
} from "@/lib/print-jobs/actions";
import { FilamentRowsPicker } from "@/components/filament-rows-picker";
import { PartsEditor } from "@/components/parts-editor";

type JobFilamentRow = { filament_stock_id: string; planned_grams: number; actual_grams: number | null };

type JobPart = {
  id: string;
  position: number;
  name: string;
  filament_stock_id: string | null;
  planned_grams: number | null;
  actual_grams: number | null;
  estimated_time_min: number | null;
  status: string;
  started_at: string | null;
  cost_snapshot: number | null;
  failure_count: number;
};

type Job = {
  id: string;
  sequence_number: number;
  name: string;
  printer_id: string;
  filament_stock_id: string | null;
  planned_grams: number | null;
  actual_grams: number | null;
  waste_grams: number | null;
  status: string;
  estimated_time_min: number | null;
  started_at: string | null;
  sell_price: number | null;
  cost_snapshot: number | null;
  profit: number | null;
  filaments: JobFilamentRow[];
  parts: JobPart[];
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
  const filamentLabel = (id: string | null) => filaments.find((f) => f.id === id)?.label ?? "—";

  const fila = jobs.filter((j) => j.status === "fila");
  const imprimindo = jobs.filter((j) => j.status === "imprimindo");
  const finalizadas = jobs.filter((j) => j.status === "concluida" || j.status === "falha" || j.status === "falha_recalculada");

  // Produto multipartes tem um card próprio (uma parte de cada vez).
  const renderJob = (job: Job) =>
    job.parts.length > 0 ? (
      <MultipartJobCard key={job.id} job={job} printerName={printerName(job.printer_id)} filaments={filaments} />
    ) : (
      <JobCard
        key={job.id}
        job={job}
        printerName={printerName(job.printer_id)}
        filamentLabel={filamentLabel(job.filament_stock_id)}
        filaments={filaments}
      />
    );

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
          {fila.map(renderJob)}
        </Column>
        <Column title="Imprimindo" count={imprimindo.length}>
          {imprimindo.map(renderJob)}
        </Column>
        <Column title="Finalizadas" count={finalizadas.length}>
          {finalizadas.map(renderJob)}
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

function JobCard({
  job,
  printerName,
  filamentLabel,
  filaments,
}: {
  job: Job;
  printerName: string;
  filamentLabel: string;
  filaments: FilamentOption[];
}) {
  const isMulti = job.filaments.length > 0;
  const totalPlanned = isMulti
    ? job.filaments.reduce((sum, f) => sum + Number(f.planned_grams), 0)
    : job.planned_grams ?? 0;

  const [pending, setPending] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showRecalc, setShowRecalc] = useState(false);
  const [actualGrams, setActualGrams] = useState(job.planned_grams ?? 0);
  const [multiActuals, setMultiActuals] = useState<Record<string, number>>(() =>
    Object.fromEntries(job.filaments.map((f) => [f.filament_stock_id, f.planned_grams]))
  );
  const [wasteGrams, setWasteGrams] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const autoCompletedRef = useRef(false);

  function labelFor(id: string) {
    return filaments.find((f) => f.id === id)?.label ?? "—";
  }

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
      if (isMulti) {
        run(() =>
          completeJob(
            job.id,
            job.filaments.map((f) => ({ filamentStockId: f.filament_stock_id, actualGrams: Number(f.planned_grams) }))
          )
        );
      } else {
        run(() => completeJob(job.id, job.planned_grams ?? 0));
      }
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
      <p className="text-xs text-ink-muted mt-1">
        {printerName} · {isMulti ? `${job.filaments.length} filamentos` : filamentLabel}
      </p>
      {isMulti && (
        <ul className="text-xs text-ink-muted font-spec mt-1 space-y-0.5">
          {job.filaments.map((f) => (
            <li key={f.filament_stock_id}>
              {labelFor(f.filament_stock_id)} · {f.planned_grams}g
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-muted font-spec mt-1">
        {totalPlanned}g planejados{job.estimated_time_min ? ` · ${job.estimated_time_min} min` : ""}
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
          {isMulti ? (
            job.filaments.map((f) => (
              <Row key={f.filament_stock_id} label={labelFor(f.filament_stock_id)} value={`${f.actual_grams ?? f.planned_grams}g`} />
            ))
          ) : (
            <Row label="Usado" value={`${job.actual_grams ?? job.planned_grams}g`} />
          )}
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
          {isMulti ? (
            job.filaments.map((f) => (
              <label key={f.filament_stock_id} className="block">
                <span className="block text-xs text-ink-muted mb-1">{labelFor(f.filament_stock_id)} — gramas usadas</span>
                <input
                  type="number"
                  min="0"
                  value={multiActuals[f.filament_stock_id] ?? f.planned_grams}
                  onChange={(e) =>
                    setMultiActuals((prev) => ({ ...prev, [f.filament_stock_id]: Number(e.target.value) }))
                  }
                  className="input font-spec"
                />
              </label>
            ))
          ) : (
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
          )}
          <div className="flex gap-2">
            <ActionButton
              onClick={() =>
                run(() =>
                  isMulti
                    ? completeJob(
                        job.id,
                        job.filaments.map((f) => ({
                          filamentStockId: f.filament_stock_id,
                          actualGrams: multiActuals[f.filament_stock_id] ?? f.planned_grams,
                        }))
                      )
                    : completeJob(job.id, actualGrams)
                )
              }
              pending={pending}
            >
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

const PART_STATUS: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Aguardando", cls: "text-ink-muted border-line" },
  imprimindo: { label: "Imprimindo", cls: "text-amber border-amber/40 bg-amber-soft" },
  concluida: { label: "Pronta", cls: "text-good border-good/40" },
};

// ---------------------------------------------------------------------
// Card do produto multipartes: um card só na fila, com as partes dentro.
// Uma parte de cada vez — cada uma tem seu próprio iniciar/concluir/falha,
// e o estoque é descontado parte a parte (pelo gatilho do banco).
// ---------------------------------------------------------------------
function MultipartJobCard({
  job,
  printerName,
  filaments,
}: {
  job: Job;
  printerName: string;
  filaments: FilamentOption[];
}) {
  const [pending, setPending] = useState(false);
  const done = job.parts.filter((p) => p.status === "concluida").length;
  const total = job.parts.length;
  const someonePrinting = job.parts.some((p) => p.status === "imprimindo");
  const finished = job.status === "concluida";
  const totalPlanned = job.parts.reduce((sum, p) => sum + Number(p.planned_grams || 0), 0);

  async function run(fn: () => Promise<{ error?: string }>) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (result.error) alert(result.error);
  }

  return (
    <div className="border border-line bg-surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-ink-muted font-spec">
            #{job.sequence_number} · <span className="text-amber">multipartes</span>
          </p>
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
      <p className="text-xs text-ink-muted mt-1">
        {printerName} · {total} partes · {totalPlanned}g planejados
        {job.estimated_time_min ? ` · ${job.estimated_time_min} min` : ""}
      </p>

      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-ink-muted">Partes prontas</span>
          <span className="text-ink font-spec">
            {done} de {total}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-paper overflow-hidden">
          <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>

      <ol className="mt-3 space-y-2">
        {job.parts.map((part) => (
          <PartRow
            key={part.id}
            part={part}
            filaments={filaments}
            locked={finished}
            canStart={!someonePrinting}
            pending={pending}
            run={run}
          />
        ))}
      </ol>

      {finished && (
        <div className="mt-3 pt-3 border-t border-line text-xs space-y-1">
          <Row label="Usado" value={`${job.actual_grams ?? totalPlanned}g`} />
          {job.cost_snapshot != null && <Row label="Custo" value={money(job.cost_snapshot)} />}
          {job.profit != null && <Row label="Lucro" value={money(job.profit)} good />}
        </div>
      )}
    </div>
  );
}

function PartRow({
  part,
  filaments,
  locked,
  canStart,
  pending,
  run,
}: {
  part: JobPart;
  filaments: FilamentOption[];
  locked: boolean;
  canStart: boolean;
  pending: boolean;
  run: (fn: () => Promise<{ error?: string }>) => Promise<void>;
}) {
  const [mode, setMode] = useState<"none" | "complete" | "fail">("none");
  const [grams, setGrams] = useState(Number(part.planned_grams || 0));
  const [waste, setWaste] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const status = PART_STATUS[part.status] ?? PART_STATUS.pendente;
  const filamentLabel = filaments.find((f) => f.id === part.filament_stock_id)?.label;

  const hasTimer = part.status === "imprimindo" && !!part.estimated_time_min && !!part.started_at;
  useEffect(() => {
    if (!hasTimer) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasTimer]);
  const elapsedMin = hasTimer ? (now - new Date(part.started_at!).getTime()) / 60000 : 0;
  const percent = hasTimer ? Math.min(100, (elapsedMin / part.estimated_time_min!) * 100) : 0;
  const remainingMin = hasTimer ? Math.max(0, Math.ceil(part.estimated_time_min! - elapsedMin)) : 0;

  return (
    <li className="border border-line rounded-xl px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink truncate">
          <span className="text-ink-muted font-spec text-xs mr-1.5">{part.position + 1}.</span>
          {part.name}
        </p>
        <span className={`text-[11px] border rounded-full px-2 py-0.5 shrink-0 ${status.cls}`}>
          {part.status === "concluida" ? "✓ " : ""}
          {status.label}
        </span>
      </div>
      <p className="text-xs text-ink-muted font-spec mt-0.5">
        {filamentLabel ?? <span className="text-warn">sem filamento</span>} ·{" "}
        {part.status === "concluida" ? `${part.actual_grams}g usados` : `${part.planned_grams ?? 0}g`}
        {part.estimated_time_min ? ` · ${part.estimated_time_min} min` : ""}
        {part.failure_count > 0 && (
          <span className="text-danger">
            {" "}
            · {part.failure_count} {part.failure_count === 1 ? "falha" : "falhas"}
          </span>
        )}
      </p>

      {!locked && part.status === "pendente" && !part.filament_stock_id && (
        <select
          defaultValue=""
          onChange={(e) => e.target.value && run(() => setPartFilament(part.id, e.target.value))}
          className="input mt-2 text-xs"
          aria-label={`Filamento da parte ${part.name}`}
        >
          <option value="">Escolha o rolo dessa parte…</option>
          {filaments.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      )}

      {hasTimer && (
        <div className="mt-2">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-ink-muted">
              {percent >= 100 ? "Tempo estimado esgotado — confirme" : `${remainingMin} min restantes`}
            </span>
            <span className="text-ink-muted font-spec">{percent.toFixed(0)}%</span>
          </div>
          <div className="h-1 rounded-full bg-paper overflow-hidden">
            <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {!locked && mode === "none" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {part.status === "pendente" && (
            <ActionButton
              onClick={() => run(() => startPart(part.id))}
              pending={pending || !canStart || !part.filament_stock_id}
            >
              {part.failure_count > 0 ? "Reimprimir" : "Iniciar"}
            </ActionButton>
          )}
          {part.status === "imprimindo" && (
            <>
              <ActionButton onClick={() => setMode("complete")} pending={pending}>
                Concluir parte
              </ActionButton>
              <ActionButton onClick={() => setMode("fail")} pending={pending} variant="danger">
                Falhou
              </ActionButton>
            </>
          )}
        </div>
      )}

      {mode === "complete" && (
        <div className="mt-2 space-y-2">
          <label className="block">
            <span className="block text-xs text-ink-muted mb-1">Gramas realmente usadas</span>
            <input
              type="number"
              min="0"
              value={grams}
              onChange={(e) => setGrams(Number(e.target.value))}
              className="input font-spec"
            />
          </label>
          <div className="flex gap-2">
            <ActionButton
              onClick={() => run(() => completePart(part.id, grams)).then(() => setMode("none"))}
              pending={pending}
            >
              Confirmar
            </ActionButton>
            <button type="button" onClick={() => setMode("none")} className="text-xs text-ink-muted hover:text-ink">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mode === "fail" && (
        <div className="mt-2 space-y-2">
          <label className="block">
            <span className="block text-xs text-ink-muted mb-1">
              Peso do resíduo (g) — a parte volta pra fila pra reimprimir
            </span>
            <input
              type="number"
              min="0"
              value={waste}
              onChange={(e) => setWaste(Number(e.target.value))}
              className="input font-spec"
            />
          </label>
          <div className="flex gap-2">
            <ActionButton
              onClick={() => run(() => failPart(part.id, waste)).then(() => setMode("none"))}
              pending={pending}
              variant="danger"
            >
              Registrar falha
            </ActionButton>
            <button type="button" onClick={() => setMode("none")} className="text-xs text-ink-muted hover:text-ink">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
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
        variant === "danger" ? "text-danger border border-danger/30 hover:bg-danger/10" : "bg-amber text-on-accent"
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
  const [multipart, setMultipart] = useState(false);

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
        <label className="sm:col-span-2 flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="multipart"
            checked={multipart}
            onChange={(e) => setMultipart(e.target.checked)}
            className="accent-amber mt-0.5"
          />
          <span>
            Produto em várias partes
            <span className="block text-xs text-ink-muted">
              Cada parte é impressa separada, uma de cada vez. O produto só fica pronto quando todas as partes forem
              concluídas.
            </span>
          </span>
        </label>
        <div className="sm:col-span-2">
          {multipart ? (
            <>
              <span className="block text-sm text-ink-muted mb-1">Partes (filamento · gramas · minutos)</span>
              <PartsEditor
                name="partsJson"
                filamentOptions={filaments.map((f) => ({ value: `stock:${f.id}`, label: f.label }))}
              />
            </>
          ) : (
            <>
              <span className="block text-sm text-ink-muted mb-1">Filamento(s)</span>
              <FilamentRowsPicker name="filamentsJson" filaments={filaments} gramsLabel="Gramas" />
            </>
          )}
        </div>
        {!multipart && (
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Tempo estimado (min, opcional)</span>
            <input type="number" name="estimatedTimeMin" min="0" className="input font-spec" />
          </label>
        )}
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
          className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
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
