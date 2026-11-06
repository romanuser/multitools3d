"use client";

import { useActionState, useState, useTransition } from "react";
import { saveFilament, deleteFilament, adjustFilament, mudarSituacaoCarretel } from "@/lib/filament/actions";
import { NOME_SITUACAO, ordenarCarreteis, tipoCarretel, type SituacaoCarretel } from "@/lib/filament/rotulo";

type Filament = {
  id: string;
  material: string;
  color: string;
  color_hex: string | null;
  brand: string | null;
  spool_weight_g: number;
  current_grams: number;
  cost_per_kg: number;
  low_stock_alert_g: number;
  numero: number | null;
  status: SituacaoCarretel;
  acabado_em: string | null;
};

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const g = (v: number) => `${Math.round(v).toLocaleString("pt-BR")} g`;
const COR_SITUACAO: Record<SituacaoCarretel, string> = {
  em_uso: "bg-amber-soft text-amber border-amber/40",
  lacrado: "bg-paper text-ink-muted border-line",
  acabado: "bg-paper text-ink-muted border-line",
};

export function FilamentList({ filaments }: { filaments: Filament[] }) {
  const [editing, setEditing] = useState<Filament | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const ativos = ordenarCarreteis(filaments.filter((f) => f.status !== "acabado"));
  const acabados = filaments.filter((f) => f.status === "acabado").sort((a, b) => String(b.acabado_em ?? "").localeCompare(String(a.acabado_em ?? "")));
  // agrupa por tipo (material + cor + marca)
  const grupos: { chave: string; itens: Filament[] }[] = [];
  for (const f of ativos) {
    const k = tipoCarretel(f); const gr = grupos.find((x) => x.chave === k);
    if (gr) gr.itens.push(f); else grupos.push({ chave: k, itens: [f] });
  }
  const editar = (f: Filament) => { setEditing(f); setShowForm(true); };

  return (
    <div className="space-y-4">
      {ativos.length === 0 && (
        <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
          Nenhum filamento no estoque{acabados.length ? " (os acabados estão lá embaixo)" : ""}.
        </p>
      )}

      {grupos.map(({ chave, itens }) => {
        const f0 = itens[0];
        const total = itens.reduce((s, f) => s + Number(f.current_grams), 0);
        const alerta = Math.max(...itens.map((f) => Number(f.low_stock_alert_g)));
        const baixo = total <= alerta;                                          // alerta pelo TOTAL do tipo
        const lacrados = itens.filter((f) => f.status === "lacrado").length;
        return (
          <div key={chave} className="border border-line bg-surface rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-line shrink-0" style={{ backgroundColor: f0.color_hex || "#8d919c" }} />
                <div>
                  <p className="font-medium text-ink">{f0.material} · {f0.color}</p>
                  <p className="text-xs text-ink-muted">{f0.brand || "sem marca"} · {money(Number(f0.cost_per_kg))}/kg</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-spec ${baixo ? "text-danger font-medium" : "text-ink"}`}>{g(total)}</p>
                <p className="text-xs text-ink-muted">
                  {itens.length} {itens.length === 1 ? "carretel" : "carretéis"}{lacrados ? ` · ${lacrados} lacrado${lacrados > 1 ? "s" : ""}` : ""}{baixo ? " · estoque baixo" : ""}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {itens.map((f) => {
                const percent = Math.min(100, Math.max(0, (Number(f.current_grams) / Number(f.spool_weight_g)) * 100));
                return (
                  <div key={f.id} className="border-t border-line pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-spec text-sm text-ink">#{f.numero ?? "?"}</span>
                        <span className={`text-[11px] uppercase tracking-wide border rounded-full px-2 py-0.5 ${COR_SITUACAO[f.status]}`}>{NOME_SITUACAO[f.status]}</span>
                        <span className="text-xs text-ink-muted font-spec">{g(Number(f.current_grams))} de {g(Number(f.spool_weight_g))}</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {f.status === "lacrado" && <SituacaoButton id={f.id} situacao="em_uso" texto="Abrir" />}
                        {f.status === "em_uso" && <SituacaoButton id={f.id} situacao="acabado" texto="Acabou" confirmar="Marcar esse carretel como acabado? O saldo que sobrou é zerado." />}
                        <button type="button" onClick={() => setAdjustingId(adjustingId === f.id ? null : f.id)} className="text-xs text-amber hover:underline underline-offset-2">Ajustar</button>
                        <button type="button" onClick={() => editar(f)} className="text-xs text-ink-muted hover:text-ink underline underline-offset-2">Editar</button>
                        <DeleteButton filamentId={f.id} />
                      </div>
                    </div>
                    {f.status !== "lacrado" && (
                      <div className="h-1.5 rounded-full bg-paper overflow-hidden mt-2">
                        <div className={`h-full rounded-full ${baixo ? "bg-danger" : "bg-amber"}`} style={{ width: `${percent}%` }} />
                      </div>
                    )}
                    {adjustingId === f.id && <AdjustForm filament={f} onDone={() => setAdjustingId(null)} />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {!showForm && (
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 hover:bg-amber-soft transition-colors"
        >
          + Novo filamento
        </button>
      )}

      {showForm && <FilamentForm key={editing?.id ?? "new"} filament={editing} onDone={() => setShowForm(false)} />}

      {acabados.length > 0 && (
        <details className="border border-line rounded-2xl p-5 bg-surface">
          <summary className="cursor-pointer text-sm text-ink">Acabados ({acabados.length})</summary>
          <p className="text-xs text-ink-muted mt-2">Carretéis que zeraram. Não aparecem mais pra escolher na fila, na loja e nos orçamentos.</p>
          <div className="mt-3 space-y-3">
            {acabados.map((f) => (
              <div key={f.id} className="border-t border-line pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-4 h-4 rounded-full border border-line shrink-0" style={{ backgroundColor: f.color_hex || "#8d919c" }} />
                    <span className="text-ink">{f.material} · {f.color}{f.brand ? ` · ${f.brand}` : ""} #{f.numero ?? "?"}</span>
                    {f.acabado_em && <span className="text-xs text-ink-muted">acabou em {new Date(f.acabado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setAdjustingId(adjustingId === f.id ? null : f.id)} className="text-xs text-amber hover:underline underline-offset-2">Restaurar</button>
                    <DeleteButton filamentId={f.id} />
                  </div>
                </div>
                {adjustingId === f.id && <AdjustForm filament={f} onDone={() => setAdjustingId(null)} />}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function SituacaoButton({ id, situacao, texto, confirmar }: { id: string; situacao: "em_uso" | "acabado"; texto: string; confirmar?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => { if (confirmar && !confirm(confirmar)) return; start(async () => { await mudarSituacaoCarretel(id, situacao); }); }}
      className="text-xs text-ink hover:underline underline-offset-2 disabled:opacity-50"
    >
      {pending ? "…" : texto}
    </button>
  );
}

function DeleteButton({ filamentId }: { filamentId: string }) {
  const [pending, setPending] = useState(false);
  async function onClick() {
    if (!confirm("Apagar esse filamento?")) return;
    setPending(true);
    await deleteFilament(filamentId);
    setPending(false);
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs text-danger hover:underline underline-offset-2 disabled:opacity-50"
    >
      {pending ? "Apagando…" : "Apagar"}
    </button>
  );
}

function AdjustForm({ filament, onDone }: { filament: Filament; onDone: () => void }) {
  const [value, setValue] = useState(filament.current_grams);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function onSave() {
    setPending(true);
    await adjustFilament(filament.id, value, note);
    setPending(false);
    onDone();
  }

  return (
    <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="block text-xs text-ink-muted mb-1">Novo saldo (g)</span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="input w-32 font-spec"
        />
      </label>
      <label className="block flex-1 min-w-[160px]">
        <span className="block text-xs text-ink-muted mb-1">Motivo (opcional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex: comprei um rolo novo"
          className="input"
        />
      </label>
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="bg-amber text-on-accent text-sm font-medium rounded-full px-4 py-2.5 disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Confirmar"}
      </button>
      <button type="button" onClick={onDone} className="text-sm text-ink-muted hover:text-ink">
        Cancelar
      </button>
    </div>
  );
}

function FilamentForm({ filament, onDone }: { filament: Filament | null; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(saveFilament, undefined);

  if (state !== undefined && !state.error && !pending) {
    queueMicrotask(onDone);
  }

  return (
    <form action={formAction} className="border border-line bg-surface rounded-2xl p-6 space-y-4">
      <input type="hidden" name="filamentId" value={filament?.id ?? ""} />
      <p className="font-display text-lg text-ink">{filament ? "Editar filamento" : "Novo filamento"}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Material</span>
          <select name="material" defaultValue={filament?.material ?? "PLA"} className="input">
            <option value="PLA">PLA</option>
            <option value="PETG">PETG</option>
            <option value="ABS">ABS</option>
            <option value="TPU">TPU</option>
            <option value="Outro">Outro</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Cor</span>
          <input name="color" defaultValue={filament?.color} required className="input" placeholder="Ex: Preto" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Cor (amostra visual, opcional)</span>
          <input type="color" name="colorHex" defaultValue={filament?.color_hex ?? "#8d919c"} className="input h-10 p-1" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Marca (opcional)</span>
          <input name="brand" defaultValue={filament?.brand ?? ""} className="input" placeholder="Ex: 3D Fila" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Peso do rolo (g)</span>
          <input
            type="number"
            name="spoolWeightG"
            min="1"
            defaultValue={filament?.spool_weight_g ?? 1000}
            className="input font-spec"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Quantidade atual (g){filament ? "" : " — se já aberto"}</span>
          <input
            type="number"
            name="currentGrams"
            min="0"
            defaultValue={filament?.current_grams ?? 1000}
            className="input font-spec"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Preço por kg (R$)</span>
          <input
            type="number"
            step="0.01"
            name="costPerKg"
            min="0"
            defaultValue={filament?.cost_per_kg ?? 99}
            className="input font-spec"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Avisar quando restar (g)</span>
          <input
            type="number"
            name="lowStockAlertG"
            min="0"
            defaultValue={filament?.low_stock_alert_g ?? 100}
            className="input font-spec"
          />
        </label>
      </div>

      {!filament && (
        <div className="grid sm:grid-cols-2 gap-4 border-t border-line pt-4">
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Quantos carretéis iguais?</span>
            <input type="number" name="quantidade" min="1" max="20" defaultValue={1} className="input font-spec" />
            <span className="block text-xs text-ink-muted mt-1">Cada um ganha o seu número (#1, #2…).</span>
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Situação</span>
            <select name="situacao" defaultValue="lacrado" className="input">
              <option value="lacrado">Lacrado (ainda fechado)</option>
              <option value="em_uso">Já está aberto (em uso)</option>
            </select>
            <span className="block text-xs text-ink-muted mt-1">Lacrado entra cheio. Os descontos da fila vão sempre pro aberto.</span>
          </label>
        </div>
      )}

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-ink-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}
