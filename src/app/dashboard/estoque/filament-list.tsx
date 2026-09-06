"use client";

import { useActionState, useState } from "react";
import { saveFilament, deleteFilament, adjustFilament } from "@/lib/filament/actions";

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
};

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FilamentList({ filaments }: { filaments: Filament[] }) {
  const [editing, setEditing] = useState<Filament | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {filaments.length === 0 && (
        <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
          Nenhum filamento cadastrado ainda.
        </p>
      )}
      {filaments.map((f) => {
        const percent = Math.min(100, Math.max(0, (f.current_grams / f.spool_weight_g) * 100));
        const low = f.current_grams <= f.low_stock_alert_g;
        return (
          <div key={f.id} className="border border-line bg-surface rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-full border border-line shrink-0"
                  style={{ backgroundColor: f.color_hex || "#8d919c" }}
                />
                <div>
                  <p className="font-medium text-ink">
                    {f.material} · {f.color}
                  </p>
                  <p className="text-xs text-ink-muted">{f.brand || "sem marca"} · {money(f.cost_per_kg)}/kg</p>
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setAdjustingId(adjustingId === f.id ? null : f.id)}
                  className="text-xs text-amber hover:underline underline-offset-2"
                >
                  Ajustar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(f);
                    setShowForm(true);
                  }}
                  className="text-xs text-ink-muted hover:text-ink underline underline-offset-2"
                >
                  Editar
                </button>
                <DeleteButton filamentId={f.id} />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className={low ? "text-danger font-medium" : "text-ink-muted"}>
                  {f.current_grams.toLocaleString("pt-BR")}g de {f.spool_weight_g.toLocaleString("pt-BR")}g
                  {low && " · estoque baixo"}
                </span>
                <span className="text-ink-muted font-spec">{percent.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-paper overflow-hidden">
                <div
                  className={`h-full rounded-full ${low ? "bg-danger" : "bg-amber"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {adjustingId === f.id && (
              <AdjustForm filament={f} onDone={() => setAdjustingId(null)} />
            )}
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

      {showForm && (
        <FilamentForm key={editing?.id ?? "new"} filament={editing} onDone={() => setShowForm(false)} />
      )}
    </div>
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
        className="bg-amber text-white text-sm font-medium rounded-full px-4 py-2.5 disabled:opacity-50"
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
          <span className="block text-sm text-ink-muted mb-1">Quantidade atual (g)</span>
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

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-white font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
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
