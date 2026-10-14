import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/support/ticket-steps";
import { categoryLabel, ticketNumber } from "@/lib/support/types";

const FILTERS = [
  { key: "ativos", label: "Precisam de você", statuses: ["aberto", "em_analise"] },
  { key: "aguardando", label: "Aguardando cliente", statuses: ["aguardando_cliente"] },
  { key: "resolvidos", label: "Resolvidos", statuses: ["resolvido"] },
  { key: "encerrados", label: "Encerrados", statuses: ["fechado"] },
  { key: "todos", label: "Todos", statuses: [] as string[] },
];

// Há quantas horas foi a última mensagem (calculado no servidor, a cada carregamento).
function hoursAgo(iso: string) {
  return Math.round((Date.now() - Date.parse(iso)) / 36e5);
}

export default async function AdminSuportePage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("accounts").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("support_tickets")
    .select("id, number, subject, category, status, admin_unread, last_message_at, created_at, account_id")
    .order("last_message_at", { ascending: false })
    .limit(500);
  const all = tickets ?? [];
  const ids = [...new Set(all.map((t) => t.account_id))];
  const { data: accounts } = ids.length
    ? await admin.from("accounts").select("id, company_name, email, plan").in("id", ids)
    : { data: [] };
  const byId = new Map((accounts ?? []).map((a) => [a.id, a]));

  const filter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const visible = filter.statuses.length ? all.filter((t) => filter.statuses.includes(t.status)) : all;
  const count = (st: string[]) => (st.length ? all.filter((t) => st.includes(t.status)).length : all.length);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-sm text-ink-muted hover:text-ink">
          ← Admin
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Suporte</h1>
        <p className="text-sm text-ink-muted mb-6">
          Chamados dos clientes. Os com bolinha têm mensagem nova que você ainda não leu.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {FILTERS.map((x) => (
            <Link
              key={x.key}
              href={`/admin/suporte?f=${x.key}`}
              className={`text-xs rounded-full px-3.5 py-1.5 border transition-colors ${
                x.key === filter.key ? "bg-amber text-on-accent border-amber" : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              {x.label} ({count(x.statuses)})
            </Link>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">Nenhum chamado aqui. 🎉</p>
        ) : (
          <div className="border border-line rounded-2xl overflow-hidden">
            {visible.map((t) => {
              const acc = byId.get(t.account_id);
              const h = hoursAgo(t.last_message_at);
              return (
                <Link
                  key={t.id}
                  href={`/admin/suporte/${t.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line last:border-b-0 hover:bg-surface-raised/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-ink font-medium truncate flex items-center gap-2">
                      {t.admin_unread && <span className="w-2 h-2 rounded-full bg-amber shrink-0" aria-label="Mensagem nova" />}
                      {t.subject}
                    </p>
                    <p className="text-xs text-ink-muted truncate">
                      <span className="font-spec">{ticketNumber(t.number)}</span> · {acc?.company_name || acc?.email || "Conta"} ·{" "}
                      {categoryLabel(t.category)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={t.status} admin />
                    <p className={`text-[11px] mt-1 ${t.admin_unread && h >= 24 ? "text-danger" : "text-ink-muted"}`}>
                      {h < 1 ? "agora há pouco" : h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
