"use client";

import { useState } from "react";
import { Icon } from "./icons";

// ---------------------------------------------------------------------
// Lista de partes de um produto multipartes: nome, filamento, gramas e
// tempo de cada parte. Serializa tudo num <input type="hidden"> em JSON,
// igual ao FilamentRowsPicker — o formulário por fora lê um campo só.
//
// O valor do filamento vem com prefixo:
//   "stock:<id>"     -> um rolo específico do estoque
//   "color:<PLA>"    -> usa a cor que o cliente escolher, nesse material
// ---------------------------------------------------------------------
export type PartRow = { name: string; filament: string; grams: string; timeMin: string };
export type PartFilamentOption = { value: string; label: string };

const emptyRow = (): PartRow => ({ name: "", filament: "", grams: "", timeMin: "" });

export function PartsEditor({
  name,
  filamentOptions,
  colorOptions = [],
  initialRows,
}: {
  name: string;
  filamentOptions: PartFilamentOption[];
  colorOptions?: PartFilamentOption[];
  initialRows?: PartRow[];
}) {
  const [rows, setRows] = useState<PartRow[]>(
    initialRows && initialRows.length ? initialRows : [emptyRow(), emptyRow()]
  );

  function updateRow(i: number, patch: Partial<PartRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function move(i: number, dir: -1 | 1) {
    setRows((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const totalGrams = rows.reduce((sum, r) => sum + (Number(r.grams) || 0), 0);
  const totalTime = rows.reduce((sum, r) => sum + (Number(r.timeMin) || 0), 0);

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="border border-line rounded-xl p-3 bg-paper/40">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-spec text-ink-muted w-14 shrink-0">Parte {i + 1}</span>
              <input
                value={row.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                placeholder="Nome da parte (ex: Cabeça)"
                className="input flex-1"
                aria-label={`Nome da parte ${i + 1}`}
              />
              <div className="flex shrink-0">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Mover parte pra cima"
                  className="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  <Icon name="chevron" size={14} className="-rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  aria-label="Mover parte pra baixo"
                  className="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  <Icon name="chevron" size={14} className="rotate-90" />
                </button>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Remover parte"
                    className="p-1.5 text-ink-muted hover:text-danger"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] gap-2">
              <select
                value={row.filament}
                onChange={(e) => updateRow(i, { filament: e.target.value })}
                className="input min-w-0"
                aria-label={`Filamento da parte ${i + 1}`}
              >
                <option value="">Filamento…</option>
                {colorOptions.length > 0 && (
                  <optgroup label="Cor escolhida pelo cliente">
                    {colorOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {colorOptions.length > 0 ? (
                  <optgroup label="Rolo fixo do estoque">
                    {filamentOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  filamentOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))
                )}
              </select>
              <input
                type="number"
                min="0.1"
                step="0.1"
                placeholder="Gramas"
                value={row.grams}
                onChange={(e) => updateRow(i, { grams: e.target.value })}
                className="input font-spec"
                aria-label={`Gramas da parte ${i + 1}`}
              />
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={row.timeMin}
                onChange={(e) => updateRow(i, { timeMin: e.target.value })}
                className="input font-spec"
                aria-label={`Tempo em minutos da parte ${i + 1}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="text-xs text-amber hover:underline underline-offset-2"
        >
          + Adicionar parte
        </button>
        <span className="text-xs text-ink-muted font-spec">
          {rows.length} partes · {totalGrams}g{totalTime ? ` · ${totalTime} min` : ""}
        </span>
      </div>
    </div>
  );
}
