"use client";

import { useActionState } from "react";
import { saveStoreSettings } from "@/lib/store/actions";

export function StoreSettingsForm({
  initialSlug,
  initialHandle,
  initialWhatsapp,
}: {
  initialSlug: string;
  initialHandle: string;
  initialWhatsapp: string;
}) {
  const [state, formAction, pending] = useActionState(saveStoreSettings, undefined);

  return (
    <form action={formAction} className="border border-line bg-surface rounded-2xl p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Link da loja</span>
          <input
            name="storeSlug"
            defaultValue={initialSlug}
            required
            className="input"
            placeholder="minha-loja"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Sua InfiniteTag</span>
          <input
            name="infinitepayHandle"
            defaultValue={initialHandle}
            required
            className="input"
            placeholder="seu-usuario (sem o $)"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="block text-sm text-ink-muted mb-1">Seu WhatsApp</span>
          <input
            name="whatsappNumber"
            defaultValue={initialWhatsapp}
            className="input"
            placeholder="11999999999 (com DDD)"
          />
        </label>
      </div>
      <p className="text-xs text-ink-muted">
        A InfiniteTag é da SUA conta InfinitePay — é pra onde caem os pagamentos das suas vendas.
        O WhatsApp é usado pra o cliente falar com você depois de comprar.
      </p>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-good">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-amber text-white font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Salvar configurações"}
      </button>
    </form>
  );
}
