"use client";

import { useActionState } from "react";
import { updateCustomerProfile } from "@/lib/customer-auth/actions";

export function ProfileForm({
  name,
  whatsapp,
  address,
}: {
  name: string;
  whatsapp: string;
  address: string;
}) {
  const [state, formAction, pending] = useActionState(updateCustomerProfile, undefined);

  return (
    <form action={formAction} className="border border-line bg-surface rounded-2xl p-6 space-y-4 max-w-md">
      <p className="font-display text-lg text-ink">Seus dados</p>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Nome</span>
        <input name="name" defaultValue={name} required className="input" />
      </label>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">WhatsApp</span>
        <input name="whatsapp" defaultValue={whatsapp} className="input" placeholder="(00) 00000-0000" />
      </label>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Endereço padrão (opcional)</span>
        <textarea
          name="address"
          defaultValue={address}
          rows={2}
          className="input"
          placeholder="Rua, número, bairro, cidade"
        />
        <span className="block text-xs text-ink-muted mt-1">
          Usado pra preencher mais rápido na próxima compra, em qualquer loja.
        </span>
      </label>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-good">Salvo!</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
