import "server-only";
import { getResend, getFromEmail } from "./resend";
import { getSiteUrl } from "@/lib/plans/infinitepay";
import { createAdminClient } from "@/lib/supabase/admin";

type PickedFile = { title: string; tags: string[] };

function emailHtml(files: PickedFile[]) {
  const siteUrl = getSiteUrl();
  const items = files
    .map(
      (f) =>
        `<li style="margin-bottom:10px;color:#e9efeb;font-size:15px;">
           ${f.title}
           ${f.tags.length ? `<br/><span style="color:#8b9b93;font-size:13px;">${f.tags.join(" · ")}</span>` : ""}
         </li>`
    )
    .join("");

  return `
<div style="background:#0c1110;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#111917;border:1px solid #22302a;border-radius:16px;overflow:hidden;">
    <div style="padding:28px 28px 4px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <span style="display:inline-flex;width:28px;height:28px;border-radius:8px;background:#2ecc71;align-items:center;justify-content:center;font-size:14px;">📦</span>
        <span style="color:#e9efeb;font-weight:600;font-size:16px;">Multiferramenta 3D</span>
      </div>
    </div>
    <div style="padding:8px 28px 28px;">
      <p style="color:#e9efeb;font-size:16px;line-height:1.6;margin:16px 0 16px;">
        Chegaram arquivos novos no Pacote de STLs de hoje:
      </p>
      <ul style="padding-left:18px;margin:0 0 24px;">${items}</ul>
      <a href="${siteUrl}/dashboard/stl-packs"
         style="display:inline-block;background:#2ecc71;color:#06140c;font-weight:600;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:999px;">
        Ver e baixar agora
      </a>
      <p style="color:#5b6a63;font-size:12px;line-height:1.6;margin:28px 0 0;">
        Você recebeu este e-mail porque assina o plano VIP da Multiferramenta 3D.
      </p>
    </div>
  </div>
</div>`.trim();
}

// ---------------------------------------------------------------------
// Dispara 1x por dia, logo depois do robô escolher os arquivos — avisa
// todo mundo que assina o VIP (é exclusivo deles). Nunca lança erro pra
// fora: uma falha aqui não pode derrubar a publicação em si. Se o envio
// de um usuário falhar, os outros continuam normalmente.
// ---------------------------------------------------------------------
export async function notifyVipUsersOfNewStl(pickDate = new Date().toISOString().slice(0, 10)) {
  try {
    const admin = createAdminClient();

    const { data: picks } = await admin
      .from("stl_daily_picks")
      .select("stl_pack_files(title, tags)")
      .eq("pick_date", pickDate);

    const files = (picks ?? [])
      .map((p) => p.stl_pack_files as unknown as PickedFile | null)
      .filter((f): f is PickedFile => !!f);

    if (!files.length) return { sent: 0, reason: "nenhum arquivo publicado hoje" as const };

    const { data: vipAccounts } = await admin
      .from("accounts")
      .select("email")
      .in("plan", ["vip_mensal", "vip_vitalicio"]);

    if (!vipAccounts?.length) return { sent: 0, reason: "nenhum assinante VIP" as const };

    const resend = getResend();
    const html = emailHtml(files);
    const subject = `📦 ${files.length} arquivo${files.length > 1 ? "s" : ""} novo${files.length > 1 ? "s" : ""} no Pacote de STLs hoje`;

    let sent = 0;
    for (const account of vipAccounts) {
      if (!account.email) continue;
      try {
        await resend.emails.send({ from: getFromEmail(), to: account.email, subject, html });
        sent++;
      } catch (err) {
        console.error("[stl-notification] falha ao enviar pra", account.email, err);
      }
    }

    return { sent, reason: "ok" as const };
  } catch (err) {
    console.error("[stl-notification] erro geral:", err);
    return { sent: 0, reason: "erro" as const };
  }
}
