import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const plan = (await getAccountPlanStatus(user.id)).plan;
  const hasVip = hasFullAccess(plan);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-2xl text-ink mb-6">Ferramentas</h1>

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
