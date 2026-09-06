import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminAccountRow } from "./admin-account-row";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ frete?: string; frete_erro?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("accounts")
    .select("is_admin, melhor_envio_access_token")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.is_admin) redirect("/dashboard");

  const { frete, frete_erro } = await searchParams;

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

        <div className="border border-line rounded-2xl overflow-hidden mb-10">
          <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 text-xs text-ink-muted border-b border-line bg-surface">
            <span>Conta</span>
            <span>Plano</span>
          </div>
          {(accounts ?? []).map((account) => (
            <AdminAccountRow key={account.id} account={account} />
          ))}
        </div>

        <section>
          <h2 className="font-display text-lg text-ink mb-1">Frete (Melhor Envio)</h2>
          <p className="text-sm text-ink-muted mb-3">
            Conecte a sua conta Melhor Envio aqui — ela é usada pra calcular o frete de{" "}
            <strong>todas as lojas</strong> dos assinantes automaticamente. Cada lojista só
            configura o próprio CEP de origem e pacote padrão.
          </p>
          {frete === "conectado" && <p className="text-sm text-good mb-3">Conectado com sucesso!</p>}
          {frete_erro && <p className="text-sm text-danger mb-3">{frete_erro}</p>}
          <div className="border border-line bg-surface rounded-2xl p-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Conta Melhor Envio da plataforma</p>
              <p className="text-xs text-ink-muted">
                {me.melhor_envio_access_token ? "Conectada" : "Ainda não conectada"}
              </p>
            </div>
            <a
              href="/api/melhor-envio/connect"
              className={`text-sm font-medium rounded-full px-4 py-2 ${
                me.melhor_envio_access_token ? "border border-line text-ink-muted hover:text-ink" : "bg-amber text-white"
              }`}
            >
              {me.melhor_envio_access_token ? "Reconectar" : "Conectar Melhor Envio"}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
