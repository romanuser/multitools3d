"use client";

import { useActionState } from "react";
import { saveShippingSettings } from "@/lib/store/actions";

export function ShippingSettingsForm({
  connected,
  initialCep,
  initialWeight,
  initialWidth,
  initialHeight,
  initialLength,
}: {
  connected: boolean;
  initialCep: string;
  initialWeight: string;
  initialWidth: string;
  initialHeight: string;
  initialLength: string;
}) {
  const [state, formAction, pending] = useActionState(saveShippingSettings, undefined);

  return (
    <div className="border border-line bg-surface rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Conta Melhor Envio</p>
          <p className="text-xs text-ink-muted">
            {connected ? "Conectada — o frete é calculado automaticamente." : "Ainda não conectada."}
          </p>
        </div>
        <a
          href="/api/melhor-envio/connect"
          className={`text-sm font-medium rounded-full px-4 py-2 ${
            connected ? "border border-line text-ink-muted hover:text-ink" : "bg-amber text-white"
          }`}
        >
          {connected ? "Reconectar" : "Conectar Melhor Envio"}
        </a>
      </div>

      <form action={formAction} className="space-y-4 pt-4 border-t border-line">
        <label className="block max-w-xs">
          <span className="block text-sm text-ink-muted mb-1">CEP de origem (de onde você envia)</span>
          <input name="originCep" defaultValue={initialCep} placeholder="00000000" className="input" />
        </label>

        <div>
          <p className="text-sm text-ink-muted mb-2">
            Pacote padrão — usado quando um produto não tem medidas próprias cadastradas
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block">
              <span className="block text-xs text-ink-muted mb-1">Peso (kg)</span>
              <input type="number" step="0.01" name="defaultWeight" defaultValue={initialWeight} className="input font-spec" />
            </label>
            <label className="block">
              <span className="block text-xs text-ink-muted mb-1">Largura (cm)</span>
              <input type="number" name="defaultWidth" defaultValue={initialWidth} className="input font-spec" />
            </label>
            <label className="block">
              <span className="block text-xs text-ink-muted mb-1">Altura (cm)</span>
              <input type="number" name="defaultHeight" defaultValue={initialHeight} className="input font-spec" />
            </label>
            <label className="block">
              <span className="block text-xs text-ink-muted mb-1">Comprimento (cm)</span>
              <input type="number" name="defaultLength" defaultValue={initialLength} className="input font-spec" />
            </label>
          </div>
        </div>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.success && <p className="text-sm text-good">{state.success}</p>}

        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-white font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar frete"}
        </button>
      </form>
    </div>
  );
}
