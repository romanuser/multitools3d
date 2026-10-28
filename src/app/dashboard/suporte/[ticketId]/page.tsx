import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TicketSteps, StatusBadge } from "@/components/support/ticket-steps";
import { TicketChat } from "@/components/support/ticket-chat";
import { markReadByUser } from "@/lib/support/actions";
import { categoryLabel, ticketNumber, type SupportMessage } from "@/lib/support/types";

export default async function ChamadoPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, number, subject, category, status, user_unread, created_at")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from("support_messages")
    .select("id, author_role, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (ticket.user_unread) await markReadByUser(ticketId);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard/suporte" className="text-sm text-ink-muted hover:text-ink">
          ← Meus chamados
        </Link>
        <div className="flex items-start justify-between gap-3 mt-4 mb-1">
          <h1 className="font-display text-xl font-semibold tracking-tight text-ink">{ticket.subject}</h1>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="text-xs text-ink-muted mb-6">
          <span className="font-spec">{ticketNumber(ticket.number)}</span> · {categoryLabel(ticket.category)} · aberto em{" "}
          {new Date(ticket.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </p>

        <div className="border border-line bg-surface rounded-2xl px-4 pt-4 pb-3 mb-4">
          <TicketSteps status={ticket.status} />
        </div>

        <TicketChat ticketId={ticket.id} status={ticket.status} messages={(messages ?? []) as SupportMessage[]} viewer="user" />
      </div>
    </main>
  );
}
