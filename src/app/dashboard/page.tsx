import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAccountPlanStatus, hasFullAccess } from "@/lib/plans/access";
import { ToolGroup, manageTools, createTools, salesTools } from "./tool-list";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const plan = (await getAccountPlanStatus(user.id)).plan;
  const hasVip = hasFullAccess(plan);

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Ferramentas</h1>
          <p className="text-ink-muted mt-1.5">Tudo o que você usa pra tocar a produção, num lugar só.</p>
        </header>

        <div className="space-y-9">
          <ToolGroup title="Gestão" tools={manageTools} hasVip={hasVip} />
          <ToolGroup title="Criação 3D" tools={createTools} hasVip={hasVip} />
          <ToolGroup title="Vendas" tools={salesTools} hasVip={hasVip} />
        </div>
      </div>
    </main>
  );
}
