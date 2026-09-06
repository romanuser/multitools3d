"use client";

import { useActionState, useState } from "react";
import { savePrinter, deletePrinter } from "@/lib/printers/actions";

type Printer = { id: string; name: string; model: string | null; status: string; photo_url: string | null };

const STATUS_LABELS: Record<string, string> = {
  livre: "Livre",
  imprimindo: "Imprimindo",
  manutencao: "Em manutenção",
};

const STATUS_COLORS: Record<string, string> = {
  livre: "text-good",
  imprimindo: "text-amber",
  manutencao: "text-ink-muted",
};

export function PrinterList({ printers }: { printers: Printer[] }) {
  const [editing, setEditing] = useState<Printer | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-3">
      {printers.length === 0 && (
        <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
          Nenhuma impressora cadastrada ainda.
        </p>
      )}
      {printers.map((printer) => (
        <div
          key={printer.id}
          className="border border-line bg-surface rounded-2xl p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            {printer.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={printer.photo_url}
                alt=""
                className="w-12 h-12 rounded-xl object-cover border border-line shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-paper border border-line flex items-center justify-center text-ink-muted text-xs shrink-0">
                sem foto
              </div>
            )}
            <div>
              <p className="font-medium text-ink">{printer.name}</p>
              <p className="text-xs text-ink-muted mt-0.5">{printer.model || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-medium ${STATUS_COLORS[printer.status] || "text-ink-muted"}`}>
              {STATUS_LABELS[printer.status] || printer.status}
            </span>
            <button
              type="button"
              onClick={() => {
                setEditing(printer);
                setShowForm(true);
              }}
              className="text-xs text-ink-muted hover:text-ink underline underline-offset-2"
            >
              Editar
            </button>
            <DeleteButton printerId={printer.id} />
          </div>
        </div>
      ))}

      {!showForm && (
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 hover:bg-amber-soft transition-colors"
        >
          + Nova impressora
        </button>
      )}

      {showForm && (
        <PrinterForm key={editing?.id ?? "new"} printer={editing} onDone={() => setShowForm(false)} />
      )}
    </div>
  );
}

function DeleteButton({ printerId }: { printerId: string }) {
  const [pending, setPending] = useState(false);
  async function onClick() {
    if (!confirm("Apagar essa impressora?")) return;
    setPending(true);
    await deletePrinter(printerId);
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

function PrinterForm({ printer, onDone }: { printer: Printer | null; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(savePrinter, undefined);
  const [preview, setPreview] = useState<string | null>(printer?.photo_url ?? null);

  if (state !== undefined && !state.error && !pending) {
    queueMicrotask(onDone);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="border border-line bg-surface rounded-2xl p-6 space-y-4">
      <input type="hidden" name="printerId" value={printer?.id ?? ""} />
      <p className="font-display text-lg text-ink">{printer ? "Editar impressora" : "Nova impressora"}</p>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl border border-line bg-paper overflow-hidden flex items-center justify-center shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-ink-muted text-xs text-center px-1">sem foto</span>
          )}
        </div>
        <label className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 cursor-pointer hover:bg-amber-soft transition-colors">
          Escolher foto
          <input type="file" name="photo" accept="image/*" className="hidden" onChange={onFileChange} />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Nome</span>
          <input name="name" defaultValue={printer?.name} required className="input" placeholder="Ex: Bambu A1" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Modelo (opcional)</span>
          <input name="model" defaultValue={printer?.model ?? ""} className="input" placeholder="Ex: A1 mini" />
        </label>
      </div>
      <label className="block max-w-xs">
        <span className="block text-sm text-ink-muted mb-1">Status</span>
        <select name="status" defaultValue={printer?.status ?? "livre"} className="input">
          <option value="livre">Livre</option>
          <option value="imprimindo">Imprimindo</option>
          <option value="manutencao">Em manutenção</option>
        </select>
      </label>
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
