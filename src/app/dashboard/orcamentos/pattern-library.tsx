"use client";

import { useActionState, useState } from "react";
import { savePattern, deletePattern } from "@/lib/quotes/actions";
import type { PatternAccessory, QuotePattern } from "@/lib/quotes/types";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PatternLibrary({ patterns }: { patterns: QuotePattern[] }) {
  const [editing, setEditing] = useState<QuotePattern | null>(null);
  const [showForm, setShowForm] = useState(false);

  function startEdit(pattern: QuotePattern) {
    setEditing(pattern);
    setShowForm(true);
  }

  function startNew() {
    setEditing(null);
    setShowForm(true);
  }

  return (
    <div className="grid md:grid-cols-[1fr_360px] gap-8 items-start">
      <div className="space-y-3">
        {patterns.length === 0 && (
          <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
            Nenhum padrão cadastrado ainda. Padrões guardam as medidas típicas de uma peça (ex:
            chaveiro padrão) pra você consultar rápido na hora de orçar.
          </p>
        )}
        {patterns.map((pattern) => (
          <div key={pattern.id} className="border border-line bg-surface rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-lg text-ink">{pattern.name}</p>
                <div className="grid grid-cols-3 gap-3 font-spec text-xs text-ink-muted mt-2 max-w-sm">
                  <Spec label="Tamanho" value={pattern.dimensions} />
                  <Spec label="Peso" value={pattern.weight} />
                  <Spec label="Tempo" value={pattern.production_time} />
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(pattern)}
                  className="text-xs text-ink-muted hover:text-ink underline underline-offset-2"
                >
                  Editar
                </button>
                <DeleteButton patternId={pattern.id} />
              </div>
            </div>
            {pattern.accessories?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-line space-y-1 text-sm">
                {pattern.accessories.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-ink-muted">{item.name}</span>
                    <span className="font-spec tabular-nums text-ink">
                      {money(item.unitPrice)} / un.
                    </span>
                  </div>
                ))}
              </div>
            )}
            {pattern.notes && <p className="text-sm text-ink-muted mt-3">{pattern.notes}</p>}
          </div>
        ))}

        {!showForm && (
          <button
            type="button"
            onClick={startNew}
            className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 hover:bg-amber-soft transition-colors"
          >
            + Novo padrão de peça
          </button>
        )}
      </div>

      {showForm && (
        <PatternForm
          key={editing?.id ?? "new"}
          pattern={editing}
          onDone={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p>{label}</p>
      <p className="text-ink">{value || "—"}</p>
    </div>
  );
}

function DeleteButton({ patternId }: { patternId: string }) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!confirm("Apagar esse padrão de peça?")) return;
    setPending(true);
    await deletePattern(patternId);
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

function PatternForm({
  pattern,
  onDone,
}: {
  pattern: QuotePattern | null;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(savePattern, undefined);
  const [accessories, setAccessories] = useState<PatternAccessory[]>(pattern?.accessories ?? []);

  if (state?.success && !pending) {
    // fecha o formulário automaticamente depois de salvar com sucesso
    queueMicrotask(onDone);
  }

  function addAccessory() {
    setAccessories((list) => [
      ...list,
      { id: crypto.randomUUID(), name: "", unitPrice: 0 },
    ]);
  }

  function updateAccessory(id: string, patch: Partial<PatternAccessory>) {
    setAccessories((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function removeAccessory(id: string) {
    setAccessories((list) => list.filter((a) => a.id !== id));
  }

  return (
    <form action={formAction} className="border border-line bg-surface rounded-2xl p-6 space-y-4">
      <input type="hidden" name="patternId" value={pattern?.id ?? ""} />
      <input type="hidden" name="accessoriesJson" value={JSON.stringify(accessories)} />

      <p className="font-display text-lg text-ink">
        {pattern ? "Editar padrão" : "Novo padrão de peça"}
      </p>

      <Field label="Nome">
        <input name="name" defaultValue={pattern?.name} required className="input" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Dimensões">
          <input name="dimensions" defaultValue={pattern?.dimensions ?? ""} className="input" placeholder="5 a 7 cm" />
        </Field>
        <Field label="Peso">
          <input name="weight" defaultValue={pattern?.weight ?? ""} className="input" placeholder="20 a 40 g" />
        </Field>
        <Field label="Tempo">
          <input name="productionTime" defaultValue={pattern?.production_time ?? ""} className="input" placeholder="1h30 a 2h" />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">Custos auxiliares</span>
          <button type="button" onClick={addAccessory} className="text-xs text-amber underline underline-offset-2">
            + adicionar
          </button>
        </div>
        <div className="space-y-2">
          {accessories.map((item) => (
            <div key={item.id} className="flex gap-2 items-center">
              <input
                value={item.name}
                onChange={(e) => updateAccessory(item.id, { name: e.target.value })}
                placeholder="Nome (ex: Argola prata)"
                className="input flex-1"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.unitPrice}
                onChange={(e) => updateAccessory(item.id, { unitPrice: Number(e.target.value) })}
                className="input w-24 font-spec"
              />
              <button
                type="button"
                onClick={() => removeAccessory(item.id)}
                className="text-ink-muted hover:text-danger text-sm px-1"
                aria-label="Remover"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <Field label="Observações">
        <textarea name="notes" defaultValue={pattern?.notes ?? ""} rows={2} className="input" />
      </Field>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-white font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar padrão"}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-ink-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink-muted mb-1">{label}</span>
      {children}
    </label>
  );
}
