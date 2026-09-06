"use server";

import { createClient } from "@/lib/supabase/server";
import { createPlanCheckoutLink } from "@/lib/plans/infinitepay";
import { redirect } from "next/navigation";

const PLAN_PRICES: Record<"vip_mensal", number> = {
  vip_mensal: 29.9,
};

export type PlanCheckoutState = { error?: string } | undefined;

export async function startPlanCheckout(
  _prevState: PlanCheckoutState,
  formData: FormData
): Promise<PlanCheckoutState> {
  const plan = String(formData.get("plan") || "");
  if (plan !== "vip_mensal") {
    return { error: "Plano inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) redirect("/login");

  const { data: account } = await supabase
    .from("accounts")
    .select("company_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: purchase, error } = await supabase
    .from("plan_purchases")
    .insert({ account_id: user.id, plan, amount: PLAN_PRICES[plan] })
    .select("id")
    .single();

  if (error || !purchase) {
    return { error: "Não consegui iniciar a compra: " + (error?.message || "erro desconhecido") };
  }

  let checkoutUrl: string;
  try {
    checkoutUrl = await createPlanCheckoutLink({
      purchaseId: purchase.id,
      plan,
      customerName: account?.company_name || user.email,
      customerEmail: user.email,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não consegui gerar o link de pagamento." };
  }

  redirect(checkoutUrl);
}
