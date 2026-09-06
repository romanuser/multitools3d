import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import { getAccountPlanStatus, hasFullAccess } from "@/lib/plans/access";

const freeModules = [
  { title: "Orçamentos", href: "/dashboard/orcamentos" },
  { title: "Estoque de filamento", href: "/dashboard/estoque" },
  { title: "Impressoras", href: "/dashboard/impressoras" },
  { title: "Fila de impressão", href: "/dashboard/fila" },
  { title: "Gerador STL curvo", href: "/dashboard/gerador-stl-curvo" },
  { title: "Modelador 3D", href: "/dashboard/modelador-3d" },
];

const vipModules = [
  { title: "Foto → STL (peças planas)", href: null },
  { title: "Loja virtual", href: "/dashboard/loja" },
];

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  vip_mensal: "VIP",
  vip_vitalicio: "VIP (legado)",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: account } = await supabase
    .from("accounts")
    .select("company_name, company_logo_url, email, plan, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const plan = (await getAccountPlanStatus(user.id)).plan;
  const hasVip = hasFullAccess(plan);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-10 gap-4">
          <div className="flex items-center gap-4">
            {account?.company_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.company_logo_url}
                alt=""
                className="w-14 h-14 rounded-full object-cover border border-line bg-surface"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-amber-soft border border-line flex items-center justify-center font-display text-lg text-amber">
                {(account?.company_name ?? user.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl text-ink">
                {account?.company_name ?? "Sua oficina"}
              </h1>
              <p className="text-sm text-ink-muted">{account?.email}</p>
            </div>
          </div>
          <form action={signOut}>
            <button className="text-sm text-ink-muted border border-line rounded-full px-4 py-2 hover:border-ink hover:text-ink transition-colors">
              Sair
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-ink">Ferramentas</h2>
          <div className="flex items-center gap-4 text-sm">
            {account?.is_admin && (
              <Link href="/admin" className="text-ink-muted hover:text-ink">
                Admin
              </Link>
            )}
            <Link href="/dashboard/painel" className="text-ink-muted hover:text-ink">
              Painel geral
            </Link>
            <Link href="/dashboard/empresa" className="text-amber hover:underline underline-offset-2">
              Dados da empresa
            </Link>
            <Link
              href="/dashboard/plano"
              className="text-ink-muted border border-line rounded-full px-3 py-1 hover:border-amber hover:text-ink transition-colors"
            >
              Plano: {PLAN_NAMES[plan]}
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          {freeModules.map(({ title, href }) =>
            href ? (
              <ModuleLink key={title} title={title} href={href} />
            ) : (
              <ModulePending key={title} title={title} note="em breve" />
            )
          )}
        </div>

        <p className="text-xs text-ink-muted uppercase tracking-normal mt-8 mb-3">Plano VIP</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {vipModules.map(({ title, href }) => {
            if (hasVip && href) return <ModuleLink key={title} title={title} href={href} />;
            if (hasVip) return <ModulePending key={title} title={title} note="em breve" />;
            return (
              <Link
                key={title}
                href="/dashboard/plano"
                className="border border-dashed border-amber/40 rounded-2xl p-5 hover:border-amber transition-colors"
              >
                <p className="font-medium text-ink">{title}</p>
                <p className="text-xs text-amber mt-1">requer plano VIP</p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function ModuleLink({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="group border border-line bg-surface rounded-2xl p-5 transition-colors hover:border-amber"
    >
      <p className="font-medium text-ink">{title}</p>
      <p className="text-xs text-amber mt-1 group-hover:underline underline-offset-2">Abrir</p>
    </Link>
  );
}

function ModulePending({ title, note }: { title: string; note: string }) {
  return (
    <div className="border border-dashed border-line rounded-2xl p-5 text-ink-muted">
      <p className="font-medium text-ink-muted">{title}</p>
      <p className="text-xs mt-1">{note}</p>
    </div>
  );
}
