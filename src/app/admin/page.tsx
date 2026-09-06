import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminAccountRow } from "./admin-account-row";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("accounts")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.is_admin) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: accounts } = await admin
    .from("accounts")
    .select("id, email, company_name, plan, plan_expires_at, is_admin")
    .order("email");

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>

        <h1 className="font-display text-2xl text-ink mt-4 mb-1">Clientes</h1>
        <p className="text-sm text-ink-muted mb-8">
          {accounts?.length ?? 0} conta(s) cadastrada(s). Você pode ajustar o plano manualmente
          aqui — útil pra pagamentos combinados por fora, cortesias ou correções.
        </p>

        <div className="border border-line rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 text-xs text-ink-muted border-b border-line bg-surface">
            <span>Conta</span>
            <span>Plano</span>
          </div>
          {(accounts ?? []).map((account) => (
            <AdminAccountRow key={account.id} account={account} />
          ))}
        </div>
      </div>
    </main>
  );
}
