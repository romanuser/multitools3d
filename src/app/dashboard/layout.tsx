import { createClient } from "@/lib/supabase/server";
import { bootstrapAccount } from "@/lib/auth/actions";
import { getAccountPlanStatus, hasFullAccess } from "@/lib/plans/access";
import { DashboardSidebar } from "./sidebar";
import { redirect } from "next/navigation";

const PLAN_LABELS: Record<string, string> = {
  free: "Plano Free",
  vip_mensal: "Plano VIP",
  vip_vitalicio: "Plano VIP (legado)",
};

// ---------------------------------------------------------------------
// Roda antes de QUALQUER página dentro de /dashboard. Garante que existe
// uma linha em "accounts" pro usuário logado — isso protege contra casos
// em que a criação da conta falhou no momento do cadastro (ex: e-mail de
// confirmação com link quebrado, callback do Google interrompido, etc).
// bootstrapAccount já checa se a conta existe antes de tentar criar, então
// isso é seguro e barato de rodar em toda navegação.
// ---------------------------------------------------------------------
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  await bootstrapAccount(user.id, user.email);

  const [{ data: account }, { plan }] = await Promise.all([
    supabase.from("accounts").select("company_name, company_logo_url, is_admin").eq("id", user.id).maybeSingle(),
    getAccountPlanStatus(user.id),
  ]);

  return (
    <div className="flex">
      <DashboardSidebar
        companyName={account?.company_name || "Sua oficina"}
        logoUrl={account?.company_logo_url ?? null}
        planLabel={PLAN_LABELS[plan] || "Plano Free"}
        hasVip={hasFullAccess(plan)}
        isAdmin={Boolean(account?.is_admin)}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
