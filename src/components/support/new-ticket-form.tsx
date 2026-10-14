"use client";

import { useActionState, useState } from "react";
import { openTicket } from "@/lib/support/actions";
import { SUPPORT_CATEGORIES } from "@/lib/support/types";

export function NewTicketForm({ startOpen = false }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [state, action, pending] = useActionState(openTicket, undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm"
      >
        + Abrir chamado
      </button>
    );
  }

  return (
    <form action={action} className="border border-line bg-surface rounded-2xl p-5 space-y-4">
      <p className="font-display text-lg text-ink">Novo chamado</p>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Assunto</span>
        <input name="subject" maxLength={140} required placeholder="Ex: Erro ao concluir impressão na fila" className="input" />
      </label>
      <div>
        <span className="block text-sm text-ink-muted mb-1.5">Categoria</span>
        <div className="flex flex-wrap gap-2">
          {SUPPORT_CATEGORIES.map((c, i) => (
            <label key={c.value} className="cursor-pointer">
              <input type="radio" name="category" value={c.value} defaultChecked={i === 0} className="peer sr-only" />
              <span className="inline-block text-xs border border-line rounded-full px-3 py-1.5 text-ink-muted peer-checked:border-amber peer-checked:bg-amber-soft peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-amber">
                {c.label}
              </span>
            </label>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Descreva sua dúvida ou problema</span>
        <textarea
          name="body"
          rows={6}
          maxLength={5000}
          required
          placeholder="Conte o que aconteceu, em qual tela, e o que você esperava. Se apareceu alguma mensagem de erro, copie aqui."
          className="input resize-y"
        />
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button disabled={pending} className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50">
          {pending ? "Abrindo…" : "Abrir chamado"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}
