import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAccountPlanStatus, hasFullAccess } from "@/lib/plans/access";
import { PlanCheckoutButton } from "./plan-checkout-button";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  vip_mensal: "VIP",
  vip_vitalicio: "VIP vitalício (plano legado)",
};

export default async function PlanoPage({
  searchParams,
}: {
  searchParams: Promise<{ pagamento?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { pagamento } = await searchParams;
  const { plan, plan_expires_at } = await getAccountPlanStatus(user.id);
  const isVip = hasFullAccess(plan);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-lg mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>

        <h1 className="font-display text-2xl text-ink mt-4 mb-1">Seu plano</h1>
        <p className="text-sm text-ink-muted mb-6">
          Plano atual: <span className="text-ink font-medium">{PLAN_NAMES[plan]}</span>
          {plan === "vip_mensal" && plan_expires_at && (
            <> · renova em {new Date(plan_expires_at).toLocaleDateString("pt-BR")}</>
          )}
        </p>

        {pagamento === "confirmado" && (
          <p className="text-sm text-good bg-amber-soft border border-good/30 rounded-xl px-4 py-3 mb-6">
            Pagamento confirmado! Seu plano já foi atualizado.
          </p>
        )}
        {pagamento === "pendente" && (
          <p className="text-sm text-ink-muted border border-line rounded-xl px-4 py-3 mb-6">
            Recebemos seu pagamento e estamos confirmando — pode levar alguns instantes. Atualize
            esta página em breve.
          </p>
        )}
        {(pagamento === "erro" || pagamento === "incompleto") && (
          <p className="text-sm text-danger border border-danger/30 rounded-xl px-4 py-3 mb-6">
            Não conseguimos confirmar o pagamento automaticamente. Se você já pagou, aguarde
            alguns minutos — se não atualizar, fale com o suporte.
          </p>
        )}

        <div className="rounded-2xl p-6 border border-amber bg-amber-soft/40">
          <p className="font-display text-lg text-ink">VIP</p>
          <p className="text-sm text-ink-muted mb-4">R$ 29,90/mês</p>
          <ul className="space-y-1.5 text-sm text-ink mb-5">
            <li className="flex gap-2">
              <span className="text-amber">✓</span> Geradores STL curvo e Foto → STL
            </li>
            <li className="flex gap-2">
              <span className="text-amber">✓</span> Loja virtual própria (até 300 produtos)
            </li>
            <li className="flex gap-2">
              <span className="text-amber">✓</span> Tudo do plano Free incluso
            </li>
          </ul>
          {isVip ? (
            <p className="text-xs text-good font-medium">
              {plan === "vip_vitalicio" ? "Seu plano atual (vitalício)" : "Seu plano atual"}
            </p>
          ) : (
            <PlanCheckoutButton plan="vip_mensal" />
          )}
        </div>

        <p className="text-xs text-ink-muted mt-4">
          Cobrança recorrente a cada 30 dias via InfinitePay. Se o pagamento não for renovado, sua
          conta volta automaticamente pro plano Free — suas ferramentas gratuitas continuam
          funcionando normalmente.
        </p>
      </div>
    </main>
  );
}
