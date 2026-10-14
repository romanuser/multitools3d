import "server-only";
import { getFromEmail, getResend } from "@/lib/email/resend";

// Avisos por e-mail do suporte. Nunca derrubam a ação: se o e-mail
// falhar (chave ausente, domínio etc.), o chamado continua funcionando.
const site = () => process.env.NEXT_PUBLIC_SITE_URL || "https://multiferramenta3d.com";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function layout(title: string, body: string, href: string, button: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f1b2e">
    <p style="font-size:13px;color:#7c3aed;font-weight:bold;margin:0 0 8px">Multiferramenta 3D · Suporte</p>
    <h2 style="font-size:20px;margin:0 0 12px">${esc(title)}</h2>
    <div style="font-size:15px;line-height:1.5;white-space:pre-line;background:#f5f3ff;border-radius:12px;padding:14px 16px">${esc(body)}</div>
    <p style="margin:20px 0"><a href="${href}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">${button}</a></p>
  </div>`;
}

async function send(to: string[], subject: string, html: string) {
  if (!to.length) return;
  try {
    await getResend().emails.send({ from: getFromEmail(), to, subject, html });
  } catch (e) {
    console.error("[suporte] e-mail não enviado:", e instanceof Error ? e.message : e);
  }
}

export async function notifyAdmins(adminEmails: string[], ticket: { id: string; number: string; subject: string }, text: string, isNew: boolean) {
  const extra = process.env.SUPPORT_NOTIFY_EMAIL ? [process.env.SUPPORT_NOTIFY_EMAIL] : [];
  const to = [...new Set([...extra, ...adminEmails])];
  await send(
    to,
    `${isNew ? "Novo chamado" : "Nova mensagem"} ${ticket.number}: ${ticket.subject}`,
    layout(isNew ? `Novo chamado ${ticket.number}` : `Cliente respondeu o chamado ${ticket.number}`, text, `${site()}/admin/suporte/${ticket.id}`, "Abrir chamado")
  );
}

export async function notifyUser(email: string | null, ticket: { id: string; number: string; subject: string }, text: string) {
  if (!email) return;
  await send(
    [email],
    `Resposta do suporte — chamado ${ticket.number}`,
    layout(`O suporte respondeu seu chamado ${ticket.number}`, text, `${site()}/dashboard/suporte/${ticket.id}`, "Ver resposta")
  );
}
