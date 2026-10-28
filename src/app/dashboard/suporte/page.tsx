import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewTicketForm } from "@/components/support/new-ticket-form";
import { StatusBadge } from "@/components/support/ticket-steps";
import { categoryLabel, ticketNumber } from "@/lib/support/types";

export default async function SuportePage({ searchParams }: { searchParams: Promise<{ novo?: string }> }) {
  const { novo } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, number, subject, category, status, user_unread, last_message_at")
    .eq("account_id", user.id)
    .order("last_message_at", { ascending: false });
  const list = tickets ?? [];
  const open = list.filter((t) => t.status !== "fechado");
  const closed = list.filter((t) => t.status === "fechado");

  const row = (t: (typeof list)[number]) => (
    <Link
      key={t.id}
      href={`/dashboard/suporte/${t.id}`}
      className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line last:border-b-0 hover:bg-surface-raised/50 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm text-ink font-medium truncate flex items-center gap-2">
          {t.user_unread && <span className="w-2 h-2 rounded-full bg-amber shrink-0" aria-label="Resposta nova" />}
          {t.subject}
        </p>
        <p className="text-xs text-ink-muted">
          <span className="font-spec">{ticketNumber(t.number)}</span> · {categoryLabel(t.category)} ·{" "}
          {new Date(t.last_message_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {t.user_unread && <span className="text-[11px] text-amber font-medium">Resposta nova</span>}
        <StatusBadge status={t.status} />
      </div>
    </Link>
  );

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Suporte</h1>
        <p className="text-sm text-ink-muted mb-6 max-w-lg">
          Ficou com dúvida ou encontrou algum problema? Abra um chamado e converse direto com a equipe do Multiferramenta 3D.
          Você recebe um e-mail quando respondermos.
        </p>

        <div className="mb-8">
          <NewTicketForm startOpen={novo === "1" || list.length === 0} />
        </div>

        <h2 className="text-sm font-medium text-ink-muted mb-2">Em andamento ({open.length})</h2>
        {open.length ? (
          <div className="border border-line rounded-2xl overflow-hidden mb-8">{open.map(row)}</div>
        ) : (
          <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-5 mb-8">
            Nenhum chamado em andamento.
          </p>
        )}

        {closed.length > 0 && (
          <>
            <h2 className="text-sm font-medium text-ink-muted mb-2">Encerrados ({closed.length})</h2>
            <div className="border border-line rounded-2xl overflow-hidden opacity-80">{closed.map(row)}</div>
          </>
        )}
      </div>
    </main>
  );
}
