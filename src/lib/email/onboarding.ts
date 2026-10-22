import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromEmail, getResend } from "./resend";
import { getSiteUrl } from "@/lib/plans/infinitepay";

// ---------------------------------------------------------------------
// Sequência automática de boas-vindas (roda 1x por dia).
// Cada e-mail só vai pra quem AINDA NÃO fez aquela etapa; no máximo 1
// e-mail por dia por pessoa; cada etapa uma vez só; quem descadastrou
// não recebe nada.
// ---------------------------------------------------------------------
export type Activity = { filament: boolean; quote: boolean; queue: boolean; product: boolean };
type Step = {
  key: string; day: number; until: number;          // envia entre o dia X e o dia "until" depois do cadastro
  pending: (a: Activity) => boolean;                 // só envia se isso for verdade
  subject: string; title: string; body: string[]; cta: string; path: string;
};

const WHATSAPP = () => (process.env.SUPPORT_WHATSAPP || "").replace(/\D/g, "");

export const STEPS: Step[] = [
  {
    key: "1-filamento", day: 1, until: 30, pending: (a) => !a.filament,
    subject: "Comece por aqui: seu estoque de filamento (2 minutos)",
    title: "O primeiro passo leva 2 minutos",
    body: [
      "Cadastrando seus rolos de filamento, a Multiferramenta 3D passa a descontar o material sozinha a cada impressão — e te avisa antes de um rolo acabar no meio de uma peça.",
      "É só o material, a cor, o peso do rolo e quanto você pagou. O custo por grama é calculado na hora e já entra nos seus orçamentos.",
    ],
    cta: "Cadastrar meu filamento", path: "/dashboard/estoque",
  },
  {
    key: "2-orcamento", day: 3, until: 30, pending: (a) => !a.quote,
    subject: "Seu primeiro orçamento em PDF, com a sua logo",
    title: "Orçamento profissional em 1 minuto",
    body: [
      "Peso da peça, tempo de impressão e pronto: o sistema soma filamento, energia e mão de obra e sugere o preço certo.",
      "Com o nome do cliente preenchido, você gera um PDF com a sua logo pra mandar no WhatsApp — e ele fica salvo no seu histórico.",
    ],
    cta: "Fazer meu primeiro orçamento", path: "/dashboard/orcamentos",
  },
  {
    key: "3-fila", day: 5, until: 30, pending: (a) => !a.queue,
    subject: "Nunca mais perca uma impressão de vista",
    title: "Sua fila de impressão organizada",
    body: [
      "Coloque as peças na fila, marque quando começar e quando terminar. O estoque de filamento é descontado sozinho.",
      "Peça com várias partes? Acompanhe parte por parte até o produto ficar pronto.",
    ],
    cta: "Abrir minha fila", path: "/dashboard/fila",
  },
  {
    key: "4-loja", day: 8, until: 30, pending: (a) => !a.product,
    subject: "Sua loja virtual já está pronta pra vender",
    title: "Venda suas impressões online",
    body: [
      "Cadastre seus produtos e ganhe uma loja com carrinho, frete calculado e pagamento por Pix ou cartão.",
      "Quando alguém compra, o pedido já cai na sua fila de impressão.",
    ],
    cta: "Montar minha loja", path: "/dashboard/loja",
  },
  {
    key: "5-ajuda", day: 12, until: 3650, pending: (a) => !a.filament && !a.quote && !a.queue && !a.product,
    subject: "Posso te ajudar a começar?",
    title: "Vi que você ainda não começou — posso ajudar?",
    body: [
      "Sei que a rotina de quem imprime é corrida. Se ficou alguma dúvida de por onde começar, me chama que eu te mostro em 5 minutos como deixar tudo pronto.",
      "É só responder este e-mail ou me chamar no WhatsApp.",
    ],
    cta: "Falar no WhatsApp", path: "whatsapp",
  },
];

export function onboardingHtml(step: Step, name: string, unsubscribeUrl: string) {
  const site = getSiteUrl();
  const href = step.path === "whatsapp"
    ? (WHATSAPP() ? `https://wa.me/${WHATSAPP()}?text=${encodeURIComponent("Oi! Quero ajuda pra começar na Multiferramenta 3D.")}` : `${site}/dashboard`)
    : `${site}${step.path}`;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `
<div style="background:#0f0b1a;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#17112a;border:1px solid #2c2347;border-radius:16px;overflow:hidden;">
    <div style="padding:28px 28px 8px;">
      <p style="margin:0 0 18px;color:#a78bfa;font-size:13px;font-weight:bold;">Multiferramenta 3D</p>
      <p style="margin:0 0 6px;color:#c4bdd8;font-size:15px;">Oi, ${esc(name)}!</p>
      <h1 style="margin:0 0 16px;color:#f3f0fb;font-size:22px;line-height:1.3;">${esc(step.title)}</h1>
      ${step.body.map((p) => `<p style="color:#c4bdd8;font-size:15px;line-height:1.6;margin:0 0 14px;">${esc(p)}</p>`).join("")}
      <p style="margin:24px 0 28px;"><a href="${href}" style="background:#7c3aed;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:bold;font-size:15px;display:inline-block;">${esc(step.cta)}</a></p>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #2c2347;">
      <p style="margin:0;color:#7d7596;font-size:11px;line-height:1.5;">Você recebe este e-mail porque tem uma conta na Multiferramenta 3D.
      <a href="${unsubscribeUrl}" style="color:#7d7596;">Não quero mais receber dicas</a>.</p>
    </div>
  </div>
</div>`;
}

// Qual etapa (se alguma) mandar hoje pra essa conta. Função pura — testável.
export function pickStep(days: number, act: Activity, sentSteps: Set<string>) {
  return STEPS.find((st) => days >= st.day && days <= st.until && st.pending(act) && !sentSteps.has(st.key)) ?? null;
}

export type PlannedEmail = { email: string; name: string; step: string; days: number };

// dryRun = true: só calcula quem receberia o quê (não envia nada)
export async function runOnboarding(dryRun: boolean) {
  const admin = createAdminClient();
  const [{ data: accounts }, { data: sent }, ...acts] = await Promise.all([
    admin.from("accounts").select("id, email, company_name, created_at, marketing_opt_out, unsubscribe_token").limit(10000),
    admin.from("onboarding_emails").select("account_id, step, sent_at").limit(100000),
    admin.from("filament_stock").select("account_id").limit(100000),
    admin.from("quotes").select("account_id").limit(100000),
    admin.from("print_jobs").select("account_id").limit(100000),
    admin.from("products").select("account_id").limit(100000),
  ]);
  const has = acts.map((r) => new Set((r.data ?? []).map((x) => x.account_id as string)));
  const sentBy = new Map<string, { steps: Set<string>; last: number }>();
  for (const s of sent ?? []) {
    const e = sentBy.get(s.account_id) ?? { steps: new Set<string>(), last: 0 };
    e.steps.add(s.step); e.last = Math.max(e.last, Date.parse(s.sent_at)); sentBy.set(s.account_id, e);
  }
  const now = Date.now();
  const plan: (PlannedEmail & { id: string; token: string; stepObj: Step })[] = [];
  for (const a of accounts ?? []) {
    if (!a.email || a.marketing_opt_out) continue;
    const s = sentBy.get(a.id);
    if (s && now - s.last < 20 * 3600000) continue;                    // já recebeu algo nas últimas 20 h
    const days = Math.floor((now - Date.parse(a.created_at)) / 86400000);
    const act: Activity = { filament: has[0].has(a.id), quote: has[1].has(a.id), queue: has[2].has(a.id), product: has[3].has(a.id) };
    const step = pickStep(days, act, s?.steps ?? new Set());
    if (!step) continue;
    plan.push({ id: a.id, token: a.unsubscribe_token, email: a.email, name: a.company_name || a.email.split("@")[0], step: step.key, days, stepObj: step });
  }
  // A Netlify dá ~10 s por execução: no máximo 12 envios por dia; quem sobrar recebe amanhã.
  const MAX_PER_RUN = 12;
  plan.sort((x, y) => y.days - x.days);   // prioriza quem está há mais tempo sem começar
  if (dryRun) return { dryRun: true, total: plan.length, enviariaHoje: Math.min(plan.length, MAX_PER_RUN), emails: plan.map(({ email, name, step, days }) => ({ email, name, step, days })) };
  plan.splice(MAX_PER_RUN);

  const resend = getResend(); let ok = 0; const errors: string[] = [];
  for (const p of plan) {
    // registra ANTES de enviar: se o envio repetir por algum motivo, a etapa não duplica
    const { error: logErr } = await admin.from("onboarding_emails").insert({ account_id: p.id, step: p.step });
    if (logErr) continue;
    try {
      await resend.emails.send({
        from: getFromEmail(), to: p.email, subject: p.stepObj.subject,
        html: onboardingHtml(p.stepObj, p.name, `${getSiteUrl()}/descadastrar?t=${p.token}`),
        replyTo: process.env.SUPPORT_NOTIFY_EMAIL || undefined,
      });
      ok++;
      await new Promise((r) => setTimeout(r, 600));                     // respeita o limite do Resend
    } catch (e) {
      errors.push(`${p.email}: ${e instanceof Error ? e.message : e}`);
      await admin.from("onboarding_emails").delete().eq("account_id", p.id).eq("step", p.step);   // tenta de novo amanhã
    }
  }
  return { dryRun: false, planned: plan.length, sent: ok, errors };
}
