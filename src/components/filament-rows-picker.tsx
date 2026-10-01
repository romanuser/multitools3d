"use client";

import { useState } from "react";
import { Icon } from "./icons";

export type FilamentRow = { filamentStockId: string; grams: string };
export type FilamentOption = { id: string; label: string };

// ---------------------------------------------------------------------
// Lista de filamentos + gramagem, com "+ adicionar outro filamento".
// Serializa tudo num <input type="hidden"> em JSON — o formulário por
// fora continua lendo um campo só (filamentsJson) no FormData, sem
// precisar saber que agora pode ter mais de uma linha.
// ---------------------------------------------------------------------
export function FilamentRowsPicker({
  name,
  filaments,
  initialRows,
  gramsLabel = "Gramas",
}: {
  name: string;
  filaments: FilamentOption[];
  initialRows?: FilamentRow[];
  gramsLabel?: string;
}) {
  const [rows, setRows] = useState<FilamentRow[]>(
    initialRows && initialRows.length ? initialRows : [{ filamentStockId: "", grams: "" }]
  );

  function updateRow(i: number, patch: Partial<FilamentRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { filamentStockId: "", grams: "" }]);
  }
  function removeRow(i: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-start">
            <select
              value={row.filamentStockId}
              onChange={(e) => updateRow(i, { filamentStockId: e.target.value })}
              className="input flex-1"
            >
              <option value="">Escolha o filamento</option>
              {filaments.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              step="0.1"
              placeholder={gramsLabel}
              value={row.grams}
              onChange={(e) => updateRow(i, { grams: e.target.value })}
              className="input w-28 font-spec shrink-0"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Remover filamento"
                className="text-ink-muted hover:text-danger shrink-0 p-2"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 text-xs text-amber hover:underline underline-offset-2"
      >
        + Adicionar outro filamento
      </button>
    </div>
  );
}
