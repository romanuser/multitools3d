"use client";

import { useActionState } from "react";
import { startPlanCheckout } from "@/lib/plans/actions";

export function PlanCheckoutButton({ plan }: { plan: "vip_mensal" | "vip_vitalicio" }) {
  const [state, formAction, pending] = useActionState(startPlanCheckout, undefined);

  return (
    <form action={formAction}>
      <input type="hidden" name="plan" value={plan} />
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-amber text-white font-medium rounded-full py-2.5 text-sm disabled:opacity-50"
      >
        {pending ? "Gerando link…" : "Assinar"}
      </button>
      {state?.error && <p className="text-xs text-danger mt-2">{state.error}</p>}
    </form>
  );
}
