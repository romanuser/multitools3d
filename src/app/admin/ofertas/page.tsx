import Link from "next/link";
import { redirect } from "next/navigation";
import { ehAdmin } from "@/lib/ofertas/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { PainelOfertas } from "./painel";

export const metadata = { title: "Caçador de promoções — Admin" };
export const dynamic = "force-dynamic";
const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StatusItem({ ok, nome, dica }: { ok: boolean; nome: string; dica: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${ok ? "border-line bg-surface" : "border-amber/50 bg-amber/10"}`}>
      <p className="text-sm text-ink">{ok ? "✅" : "⚠️"} {nome}</p><p className="text-xs text-ink-muted mt-0.5">{dica}</p>
    </div>
  );
}

export default async function AdminOfertas({ searchParams }: { searchParams: Promise<{ ml?: string; ml_erro?: string }> }) {
  if (!(await ehAdmin())) redirect("/dashboard");
  const { ml, ml_erro } = await searchParams;
  const sb = createAdminClient();
  const [{ data: tk }, { data: pubs }, { data: execs }, { count: itens }] = await Promise.all([
    sb.from("ofertas_token_ml").select("expira_em, atualizado_em").eq("id", 1).maybeSingle(),
    sb.from("ofertas_publicadas").select("id, item_id, preco, desconto, motivo, link, mensagem_wa, telegram_ok, erro, publicado_em, ofertas_itens(titulo, thumb)").order("publicado_em", { ascending: false }).limit(20),
    sb.from("ofertas_execucoes").select("em, resumo").order("em", { ascending: false }).limit(6),
    sb.from("ofertas_itens").select("id", { count: "exact", head: true }),
  ]);
  const env = {
    ml: !!(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET), afiliado: !!process.env.ML_AFILIADO_PARAMS,
    telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CANAL), admin: !!process.env.TELEGRAM_ADMIN_CHAT,
  };
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link href="/admin" className="text-sm text-ink-muted hover:text-ink">← Admin</Link>
          <h1 className="font-display text-2xl font-semibold text-ink mt-2">Caçador de promoções</h1>
          <p className="text-sm text-ink-muted">Busca promoções de filamento e impressão 3D no Mercado Livre de hora em hora, posta no canal do Telegram e te manda a mensagem pronta pro WhatsApp. Página pública: <Link href="/ofertas" className="text-amber hover:underline">/ofertas</Link>.</p>
        </div>
        {ml === "ok" && <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink">✅ Mercado Livre conectado.</p>}
        {ml_erro && <p className="rounded-xl border border-amber/50 bg-amber/10 px-4 py-3 text-sm text-ink">⚠️ {ml_erro}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusItem ok={env.ml} nome="App do Mercado Livre" dica={env.ml ? "ML_CLIENT_ID e ML_CLIENT_SECRET configurados." : "Falta ML_CLIENT_ID e ML_CLIENT_SECRET na Netlify."} />
          <StatusItem ok={!!tk} nome="Conta do Mercado Livre conectada" dica={tk ? `Acesso renovado em ${new Date(tk.atualizado_em).toLocaleString("pt-BR")} (renova sozinho).` : "Clique em “Conectar Mercado Livre” abaixo."} />
          <StatusItem ok={env.afiliado} nome="Link de afiliado" dica={env.afiliado ? "ML_AFILIADO_PARAMS configurado." : "Falta ML_AFILIADO_PARAMS (os parâmetros do seu link do portal)."} />
          <StatusItem ok={env.telegram} nome="Canal do Telegram" dica={env.telegram ? "Bot e canal configurados." : "Falta TELEGRAM_BOT_TOKEN e TELEGRAM_CANAL."} />
          <StatusItem ok={env.admin} nome="Mensagens do WhatsApp pra você" dica={env.admin ? "Você recebe cada oferta pronta no seu Telegram." : "Falta TELEGRAM_ADMIN_CHAT (use “Descobrir meu chat” abaixo)."} />
          <StatusItem ok={(itens ?? 0) > 0} nome="Histórico de preços" dica={`${itens ?? 0} produtos acompanhados. Nos primeiros ~2 dias o bot só observa (pra não cair em “de/por” falso).`} />
        </div>
        <PainelOfertas conectado={!!tk} />
        <section>
          <h2 className="text-sm font-medium text-ink mb-2">Últimas rodadas</h2>
          <div className="rounded-2xl border border-line overflow-hidden text-xs">
            {(execs ?? []).map((e, i) => { const r = (e.resumo ?? {}) as { lidos?: number; relevantes?: number; ofertas?: number; publicadas?: number; erros?: string[]; publicar?: boolean };
              return (<div key={i} className="px-4 py-2.5 border-b border-line last:border-b-0 flex flex-wrap gap-x-4 gap-y-1 text-ink-muted">
                <span className="text-ink">{new Date(e.em).toLocaleString("pt-BR")}</span><span>{r.publicar ? "publicação" : "teste"}</span>
                <span>{r.lidos ?? 0} lidos</span><span>{r.relevantes ?? 0} relevantes</span><span>{r.ofertas ?? 0} ofertas</span><span className="text-ink">{r.publicadas ?? 0} publicadas</span>
                {r.erros?.length ? <span className="text-amber">⚠️ {r.erros[0]}</span> : null}
              </div>); })}
            {!execs?.length && <p className="px-4 py-6 text-center text-ink-muted">Nenhuma rodada ainda.</p>}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-medium text-ink mb-2">Últimas publicadas</h2>
          <div className="space-y-2">
            {(pubs ?? []).map((p) => { const it = (Array.isArray(p.ofertas_itens) ? p.ofertas_itens[0] : p.ofertas_itens) as { titulo?: string } | null;
              return (<div key={p.id} className="rounded-xl border border-line bg-surface px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">{it?.titulo ?? p.item_id}</p>
                  <p className="text-xs text-ink-muted">{brl(Number(p.preco))} · −{Math.round(Number(p.desconto) * 100)}% · {p.motivo} · {new Date(p.publicado_em).toLocaleString("pt-BR")} {p.telegram_ok ? "· ✅ Telegram" : p.erro ? `· ⚠️ ${p.erro}` : ""}</p>
                </div>
                {p.mensagem_wa && <a href={`https://wa.me/?text=${encodeURIComponent(p.mensagem_wa)}`} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full bg-amber px-4 py-1.5 text-xs font-medium text-white">📲 Enviar no WhatsApp</a>}
              </div>); })}
            {!pubs?.length && <p className="rounded-xl border border-line px-4 py-6 text-center text-sm text-ink-muted">Nada publicado ainda.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
