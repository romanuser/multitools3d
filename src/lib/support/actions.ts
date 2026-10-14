"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPORT_CATEGORIES, SUPPORT_STATUS, ticketNumber } from "./types";
import { notifyAdmins, notifyUser } from "./notify";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: me } = await supabase.from("accounts").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");
  return { admin: createAdminClient(), user };
}

async function adminEmails() {
  const admin = createAdminClient();
  const { data } = await admin.from("accounts").select("email").eq("is_admin", true);
  return (data ?? []).map((a) => a.email).filter(Boolean) as string[];
}

function revalidateTicket(id?: string) {
  revalidatePath("/dashboard/suporte");
  revalidatePath("/admin/suporte");
  if (id) {
    revalidatePath(`/dashboard/suporte/${id}`);
    revalidatePath(`/admin/suporte/${id}`);
  }
}

// =====================================================================
// CLIENTE
// =====================================================================
export async function openTicket(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const subject = String(formData.get("subject") || "").trim();
  const category = String(formData.get("category") || "duvida");
  const body = String(formData.get("body") || "").trim();
  if (subject.length < 3) return { error: "Escreva um assunto (pelo menos 3 letras)." };
  if (subject.length > 140) return { error: "Assunto muito longo (máximo 140 caracteres)." };
  if (!SUPPORT_CATEGORIES.some((c) => c.value === category)) return { error: "Escolha uma categoria." };
  if (body.length < 5) return { error: "Descreva sua dúvida ou problema." };
  if (body.length > 5000) return { error: "Mensagem muito longa (máximo 5.000 caracteres)." };

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ account_id: user.id, subject, category })
    .select("id, number")
    .single();
  if (error || !ticket) return { error: "Não consegui abrir o chamado: " + (error?.message ?? "") };

  const { error: msgError } = await supabase
    .from("support_messages")
    .insert({ ticket_id: ticket.id, author_role: "user", author_id: user.id, body });
  if (msgError) return { error: "Chamado aberto, mas a mensagem não foi salva: " + msgError.message };

  await notifyAdmins(await adminEmails(), { id: ticket.id, number: ticketNumber(ticket.number), subject }, body, true);
  revalidateTicket();
  redirect(`/dashboard/suporte/${ticket.id}`);
}

export async function sendUserMessage(ticketId: string, body: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const text = body.trim();
  if (!text) return { error: "Escreva uma mensagem." };
  if (text.length > 5000) return { error: "Mensagem muito longa (máximo 5.000 caracteres)." };

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, number, subject, status")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return { error: "Chamado não encontrado." };
  if (ticket.status === "fechado") return { error: "Esse chamado foi encerrado. Abra um novo se precisar." };

  const { error } = await supabase
    .from("support_messages")
    .insert({ ticket_id: ticketId, author_role: "user", author_id: user.id, body: text });
  if (error) return { error: error.message };

  await notifyAdmins(await adminEmails(), { id: ticket.id, number: ticketNumber(ticket.number), subject: ticket.subject }, text, false);
  revalidateTicket(ticketId);
  return {};
}

// O cliente confirma que resolveu -> encerra o chamado. (Status só muda
// pelo servidor, depois de conferir que o chamado é dessa conta.)
export async function closeTicketByUser(ticketId: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { data: ticket } = await supabase.from("support_tickets").select("id, status").eq("id", ticketId).maybeSingle();
  if (!ticket) return { error: "Chamado não encontrado." };
  if (ticket.status === "fechado") return {};
  const { error } = await createAdminClient()
    .from("support_tickets")
    .update({ status: "fechado", admin_unread: false })
    .eq("id", ticketId);
  if (error) return { error: error.message };
  revalidateTicket(ticketId);
  return {};
}

// Abrir o chamado = ver as respostas do suporte.
export async function markReadByUser(ticketId: string) {
  const { supabase } = await requireUser();
  const { data: ticket } = await supabase.from("support_tickets").select("id, user_unread").eq("id", ticketId).maybeSingle();
  if (ticket?.user_unread) {
    await createAdminClient().from("support_tickets").update({ user_unread: false }).eq("id", ticketId);
  }
}

// =====================================================================
// ADMIN (você)
// =====================================================================
export async function adminReply(ticketId: string, body: string, newStatus?: string): Promise<{ error?: string }> {
  const { admin, user } = await requireAdmin();
  const text = body.trim();
  if (!text && !newStatus) return { error: "Escreva uma resposta." };
  if (newStatus && !SUPPORT_STATUS[newStatus]) return { error: "Etapa inválida." };

  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, number, subject, account_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return { error: "Chamado não encontrado." };

  if (text) {
    const { error } = await admin
      .from("support_messages")
      .insert({ ticket_id: ticketId, author_role: "admin", author_id: user.id, body: text });
    if (error) return { error: error.message };
  }
  // etapa escolhida junto com a resposta (ex: responder e já marcar resolvido)
  if (newStatus) {
    const { error } = await admin.from("support_tickets").update({ status: newStatus }).eq("id", ticketId);
    if (error) return { error: error.message };
  }
  await admin.from("support_tickets").update({ admin_unread: false }).eq("id", ticketId);

  if (text) {
    const { data: account } = await admin.from("accounts").select("email").eq("id", ticket.account_id).maybeSingle();
    await notifyUser(account?.email ?? null, { id: ticket.id, number: ticketNumber(ticket.number), subject: ticket.subject }, text);
  }
  revalidateTicket(ticketId);
  return {};
}

export async function markReadByAdmin(ticketId: string) {
  const { admin } = await requireAdmin();
  await admin.from("support_tickets").update({ admin_unread: false }).eq("id", ticketId).eq("admin_unread", true);
}
