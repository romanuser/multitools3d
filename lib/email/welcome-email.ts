import "server-only";
import { getResend, getFromEmail } from "./resend";
import { getSiteUrl } from "@/lib/plans/infinitepay";
import { WELCOME_PROMO_LIMIT } from "./promo-config";

// ---------------------------------------------------------------------
// E-mail de boas-vindas, disparado manualmente pelo admin (painel Admin,
// um botão por cliente cadastrado). Sempre com o guia em PDF anexado.
// ---------------------------------------------------------------------

function welcomeEmailHtml(input: { toEmail: string; companyName: string; isPromo: boolean }) {
  const siteUrl = getSiteUrl();
  const greetingName = input.companyName || input.toEmail;

  const promoParagraphs = `
      <p style="color:#c7d1cb;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Obrigado por ser um dos nossos <strong style="color:#e9efeb;">${WELCOME_PROMO_LIMIT} primeiros usuários</strong>
        a se cadastrar na Multiferramenta 3D. Como brinde pelo feito, subimos seu plano para o
        <strong style="color:#e9efeb;">VIP vitalício</strong>, que te dá direito, além de todas as
        ferramentas do plano Free, a um e-commerce próprio pra vender suas impressões online.
      </p>
      <p style="color:#c7d1cb;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Estamos te enviando, em anexo, um guia de como explorar melhor as ferramentas.
      </p>`;

  const plainParagraphs = `
      <p style="color:#c7d1cb;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Sua conta na Multiferramenta 3D foi criada com sucesso. Estamos te enviando, em anexo,
        um guia de como explorar melhor as ferramentas.
      </p>`;

  // E-mail em HTML simples e com estilo inline — é o formato que sobrevive
  // melhor a clientes de e-mail (Gmail, Outlook etc. removem <style> e CSS
  // mais elaborado).
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
        Olá, ${greetingName}!
      </p>
      ${input.isPromo ? promoParagraphs : plainParagraphs}
      <p style="color:#c7d1cb;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Desejamos boas-vindas, com melhores organizações, e que a ferramenta auxilie o seu dia a dia.
      </p>
      <a href="${siteUrl}/dashboard/guia"
         style="display:inline-block;background:#2ecc71;color:#06140c;font-weight:600;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:999px;">
        Abrir o guia no painel
      </a>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #22302a;">
        <p style="margin:0 0 6px;font-size:13px;">
          <a href="${siteUrl}" style="color:#2ecc71;text-decoration:none;font-weight:600;">Multiferramenta3D</a>
        </p>
        <p style="margin:0;font-size:13px;">
          <a href="https://webdev-studio-chi.vercel.app/" style="color:#8b9b93;text-decoration:none;">WebdevStudio</a>
        </p>
      </div>
      <p style="color:#5b6a63;font-size:12px;line-height:1.6;margin:24px 0 0;">
        Você recebeu este e-mail porque criou uma conta na Multiferramenta 3D.
      </p>
    </div>
  </div>
</div>`.trim();
}

// Busca o PDF publicado no próprio site (public/guia-multiferramenta-3d.pdf)
// e devolve em base64. Buscar por HTTP em vez de ler do disco funciona em
// qualquer ambiente de deploy (Netlify, Vercel etc.), sem depender de como
// cada um empacota a pasta "public" pras funções de servidor.
async function fetchGuidePdfBase64() {
  const url = `${getSiteUrl()}/guia-multiferramenta-3d.pdf`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Não consegui baixar o guia em ${url} (status ${response.status}).`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString("base64");
}

export async function sendWelcomeEmail(input: { toEmail: string; companyName: string; isPromo?: boolean }) {
  const pdfBase64 = await fetchGuidePdfBase64();
  const isPromo = input.isPromo ?? false;

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: input.toEmail,
    subject: isPromo
      ? "Bem-vindo(a) à Multiferramenta 3D — você ganhou o VIP vitalício"
      : "Bem-vindo(a) à Multiferramenta 3D — seu guia está aqui",
    html: welcomeEmailHtml({ toEmail: input.toEmail, companyName: input.companyName, isPromo }),
    attachments: [
      {
        filename: "guia-multiferramenta-3d.pdf",
        content: pdfBase64,
      },
    ],
  });

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
// Chamado uma única vez, na hora em que uma conta é CRIADA (dentro de
// bootstrapAccount, logo depois do insert em "accounts" — nunca em
// visitas seguintes, porque nessas o insert nem roda). Decide sozinho se
// essa conta é uma das WELCOME_PROMO_LIMIT primeiras: se for, sobe o
// plano pra vip_vitalicio antes de mandar o e-mail. Nunca lança erro pra
// fora — uma falha aqui (Resend fora do ar, por exemplo) não pode
// impedir o cadastro. Se falhar, dá pra reenviar depois pelo botão
// "Enviar boas-vindas" no painel Admin.
// ---------------------------------------------------------------------
export async function handleNewAccountWelcomeEmail(accountId: string, email: string, companyName: string) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { count } = await admin.from("accounts").select("id", { count: "exact", head: true });
    const isPromo = typeof count === "number" && count > 0 && count <= WELCOME_PROMO_LIMIT;

    if (isPromo) {
      await admin.from("accounts").update({ plan: "vip_vitalicio" }).eq("id", accountId);
    }

    await sendWelcomeEmail({ toEmail: email, companyName, isPromo });

    // Marca como enviado pra esse mesmo aviso aparecer no painel Admin —
    // é o que evita mandar de novo manualmente sem perceber que já foi.
    await admin.from("accounts").update({ welcome_email_sent_at: new Date().toISOString() }).eq("id", accountId);
  } catch (err) {
    console.error("[welcome-email] falha ao processar boas-vindas automáticas:", err);
  }
}
