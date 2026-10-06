"use client";

import { useActionState } from "react";
import { saveShippingSettings } from "@/lib/store/actions";
import { FieldTooltip } from "@/components/field-tooltip";

export function ShippingSettingsForm({
  initialCep,
  initialWeight,
  initialWidth,
  initialHeight,
  initialLength,
}: {
  initialCep: string;
  initialWeight: string;
  initialWidth: string;
  initialHeight: string;
  initialLength: string;
}) {
  const [state, formAction, pending] = useActionState(saveShippingSettings, undefined);

  return (
    <div className="border border-line bg-surface rounded-2xl p-6 space-y-5">
      <form action={formAction} className="space-y-4">
        <label className="block max-w-xs">
          <span className="block text-sm text-ink-muted mb-1">
            CEP de origem (de onde você envia)
            <FieldTooltip>O CEP de onde os pacotes saem de verdade — usado pra calcular o frete até o cliente.</FieldTooltip>
          </span>
          <input name="originCep" defaultValue={initialCep} placeholder="00000000" className="input" />
        </label>

        <div>
          <p className="text-sm text-ink-muted mb-2 flex items-center">
            Pacote padrão — usado quando um produto não tem medidas próprias cadastradas
            <FieldTooltip>
              Se um produto não tiver &quot;Medidas de envio&quot; preenchidas no cadastro dele, a loja usa essas
              medidas aqui pra calcular o frete. Vale preencher com o tamanho da sua caixa mais comum.
            </FieldTooltip>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block">
              <span className="block text-xs text-ink-muted mb-1">Peso (g)</span>
              <input type="number" min="1" step="1" name="defaultWeight" defaultValue={initialWeight} className="input font-spec" />
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
          className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar frete"}
        </button>
      </form>
    </div>
  );
}
