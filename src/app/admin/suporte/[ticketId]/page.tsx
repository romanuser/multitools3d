import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TicketSteps, StatusBadge } from "@/components/support/ticket-steps";
import { TicketChat } from "@/components/support/ticket-chat";
import { markReadByAdmin } from "@/lib/support/actions";
import { categoryLabel, ticketNumber, type SupportMessage } from "@/lib/support/types";

const PLAN: Record<string, string> = { free: "Free", vip_mensal: "VIP", vip_vitalicio: "VIP (legado)" };

export default async function AdminChamadoPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("accounts").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, number, subject, category, status, admin_unread, created_at, account_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) notFound();

  const [{ data: messages }, { data: account }, { data: others }] = await Promise.all([
    admin.from("support_messages").select("id, author_role, body, created_at").eq("ticket_id", ticketId).order("created_at"),
    admin.from("accounts").select("company_name, email, phone, whatsapp_number, plan, plan_expires_at, created_at").eq("id", ticket.account_id).maybeSingle(),
    admin.from("support_tickets").select("id, number, subject, status").eq("account_id", ticket.account_id).neq("id", ticketId).order("created_at", { ascending: false }).limit(5),
  ]);
  if (ticket.admin_unread) await markReadByAdmin(ticketId);

  const name = account?.company_name || account?.email || "Cliente";
  const zap = (account?.whatsapp_number || account?.phone || "").replace(/\D/g, "");

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/suporte" className="text-sm text-ink-muted hover:text-ink">
          ← Chamados
        </Link>
        <div className="grid lg:grid-cols-[1fr_280px] gap-6 mt-4 items-start">
          <div>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h1 className="font-display text-xl font-semibold tracking-tight text-ink">{ticket.subject}</h1>
              <StatusBadge status={ticket.status} admin />
            </div>
            <p className="text-xs text-ink-muted mb-5">
              <span className="font-spec">{ticketNumber(ticket.number)}</span> · {categoryLabel(ticket.category)} · aberto em{" "}
              {new Date(ticket.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
            <div className="border border-line bg-surface rounded-2xl px-4 pt-4 pb-3 mb-4">
              <TicketSteps status={ticket.status} />
            </div>
            <TicketChat
              ticketId={ticket.id}
              status={ticket.status}
              messages={(messages ?? []) as SupportMessage[]}
              viewer="admin"
              customerName={name}
            />
          </div>

          <aside className="border border-line bg-surface rounded-2xl p-5 space-y-4 text-sm lg:sticky lg:top-6">
            <div>
              <p className="text-xs text-ink-muted mb-1">Cliente</p>
              <p className="text-ink font-medium">{name}</p>
              {account?.email && <p className="text-ink-muted text-xs break-all">{account.email}</p>}
              <p className="text-xs text-ink-muted mt-1">
                Plano {PLAN[account?.plan ?? "free"] ?? account?.plan}
                {account?.plan_expires_at ? ` · até ${new Date(account.plan_expires_at).toLocaleDateString("pt-BR")}` : ""}
              </p>
              {account?.created_at && (
                <p className="text-xs text-ink-muted">Cliente desde {new Date(account.created_at).toLocaleDateString("pt-BR")}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {account?.email && (
                <a href={`mailto:${account.email}?subject=${encodeURIComponent(`Chamado ${ticketNumber(ticket.number)}: ${ticket.subject}`)}`}
                   className="text-xs text-amber hover:underline">Mandar e-mail</a>
              )}
              {zap.length >= 10 && (
                <a href={`https://wa.me/${zap.length <= 11 ? "55" + zap : zap}`} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-[#1fa855] hover:underline">Chamar no WhatsApp</a>
              )}
            </div>
            {(others?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-ink-muted mb-1.5">Outros chamados dessa conta</p>
                <ul className="space-y-1.5">
                  {others!.map((o) => (
                    <li key={o.id}>
                      <Link href={`/admin/suporte/${o.id}`} className="text-xs text-ink hover:text-amber flex items-center justify-between gap-2">
                        <span className="truncate">{ticketNumber(o.number)} {o.subject}</span>
                        <StatusBadge status={o.status} admin />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
