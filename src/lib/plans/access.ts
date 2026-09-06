import { createClient } from "@/lib/supabase/server";

export type PlanStatus = { plan: string; plan_expires_at: string | null };

// ---------------------------------------------------------------------
// Busca o plano da conta e, se for "vip_mensal" com data de expiração já
// vencida, rebaixa pra "free" na hora (não temos um robô rodando o tempo
// todo no servidor, então a checagem acontece sempre que a conta é
// acessada — na prática funciona igual, só não é no segundo exato).
// "vip_vitalicio" é um plano legado (não é mais vendido) que nunca expira.
// ---------------------------------------------------------------------
export async function getAccountPlanStatus(userId: string): Promise<PlanStatus> {
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("plan, plan_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (!account) return { plan: "free", plan_expires_at: null };

  const expired =
    account.plan === "vip_mensal" &&
    account.plan_expires_at &&
    new Date(account.plan_expires_at).getTime() < Date.now();

  if (expired) {
    await supabase.from("accounts").update({ plan: "free", plan_expires_at: null }).eq("id", userId);
    return { plan: "free", plan_expires_at: null };
  }

  return account;
}

export function hasFullAccess(plan: string) {
  return plan === "vip_mensal" || plan === "vip_vitalicio";
}
