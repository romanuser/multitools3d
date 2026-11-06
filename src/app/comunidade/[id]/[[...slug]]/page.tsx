import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { haQuanto, nomeCategoria, urlTopico } from "@/lib/comunidade/config";
import { BotaoDenunciar, BotaoSolucao, BotaoUtil, RespostaForm } from "../../componentes";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://multiferramenta3d.com").replace(/\/$/, "");
type P = { params: Promise<{ id: string; slug?: string[] }> };
const UUID = /^[0-9a-f-]{36}$/i;

async function carregar(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: t } = await supabase.from("forum_topicos")
    .select("id, account_id, titulo, corpo, categoria, autor_nome, impressora, filamento, fotos, resolvido, resposta_aceita, respostas_count, created_at")
    .eq("id", id).maybeSingle();
  return t ? { supabase, t } : null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params; const c = await carregar(id);
  if (!c) return { title: { absolute: "Pergunta não encontrada — Comunidade Multiferramenta 3D" } };
  const desc = c.t.corpo.replace(/\s+/g, " ").slice(0, 155);
  return { title: { absolute: `${c.t.titulo} — Comunidade Multiferramenta 3D` }, description: desc, alternates: { canonical: urlTopico(c.t) }, openGraph: { title: c.t.titulo, description: desc } };
}

// fotos enviadas pelos membros (servidas pelo Supabase Storage)
function Fotos({ fotos }: { fotos: string[] }) {
  if (!fotos?.length) return null;
  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
      {fotos.map((u) => (
        <a key={u} href={u} target="_blank" rel="noopener">
          {/* eslint-disable-next-line @next/next/no-img-element -- foto de membro, vinda do Storage */}
          <img src={u} alt="Foto enviada" className="aspect-square w-full rounded-xl object-cover border border-line" loading="lazy" />
        </a>
      ))}
    </div>
  );
}

export default async function Topico({ params }: P) {
  const { id } = await params; const c = await carregar(id);
  if (!c) notFound();
  const { supabase, t } = c;
  const [{ data: { user } }, { data: respostas }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("forum_respostas").select("id, account_id, autor_nome, corpo, fotos, uteis, created_at").eq("topico_id", t.id).order("created_at"),
  ]);
  const lista = (respostas ?? []).sort((a, b) => Number(b.id === t.resposta_aceita) - Number(a.id === t.resposta_aceita));
  let meusUteis = new Set<string>();
  if (user && lista.length) {
    const { data } = await supabase.from("forum_uteis").select("resposta_id").eq("account_id", user.id).in("resposta_id", lista.map((r) => r.id));
    meusUteis = new Set((data ?? []).map((u) => u.resposta_id));
  }
  const volta = urlTopico(t); const sou = (uid: string) => user?.id === uid; const ehAutor = sou(t.account_id);
  const aceita = lista.find((r) => r.id === t.resposta_aceita);
  // dados estruturados: o Google entende como "pergunta e resposta"
  const jsonLd = {
    "@context": "https://schema.org", "@type": "QAPage",
    mainEntity: {
      "@type": "Question", name: t.titulo, text: t.corpo, answerCount: lista.length, dateCreated: t.created_at, author: { "@type": "Person", name: t.autor_nome },
      ...(aceita ? { acceptedAnswer: { "@type": "Answer", text: aceita.corpo, upvoteCount: aceita.uteis, dateCreated: aceita.created_at, url: `${SITE}${volta}#r-${aceita.id}`, author: { "@type": "Person", name: aceita.autor_nome } } } : {}),
      suggestedAnswer: lista.filter((r) => r.id !== t.resposta_aceita).slice(0, 10).map((r) => ({ "@type": "Answer", text: r.corpo, upvoteCount: r.uteis, dateCreated: r.created_at, url: `${SITE}${volta}#r-${r.id}`, author: { "@type": "Person", name: r.autor_nome } })),
    },
  };
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href={`/comunidade?cat=${t.categoria}`} className="text-xs text-amber hover:underline">← {nomeCategoria(t.categoria)}</Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink">{t.resolvido && <span className="mr-2 rounded-full bg-amber-soft px-2 py-0.5 text-xs text-amber align-middle">✓ Resolvida</span>}{t.titulo}</h1>
      <p className="mt-1 text-xs text-ink-muted">{t.autor_nome} · {haQuanto(t.created_at)}{t.impressora ? ` · ${t.impressora}` : ""}{t.filamento ? ` · ${t.filamento}` : ""}</p>
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <p className="whitespace-pre-line text-sm text-ink leading-relaxed">{t.corpo}</p>
        <Fotos fotos={t.fotos} />
        <div className="mt-3 flex justify-end"><BotaoDenunciar tipo="topico" id={t.id} volta={volta} logado={!!user} /></div>
      </div>

      <h2 className="mt-8 mb-3 font-display text-lg text-ink">{lista.length} {lista.length === 1 ? "resposta" : "respostas"}</h2>
      <div className="space-y-3">
        {lista.map((r) => {
          const solucao = r.id === t.resposta_aceita;
          return (
            <div key={r.id} id={`r-${r.id}`} className={`rounded-2xl border bg-surface p-5 ${solucao ? "border-amber" : "border-line"}`}>
              {solucao && <p className="mb-2 text-xs font-medium text-amber">✓ Solução escolhida por quem perguntou</p>}
              <p className="whitespace-pre-line text-sm text-ink leading-relaxed">{r.corpo}</p>
              <Fotos fotos={r.fotos} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-ink-muted">{r.autor_nome} · {haQuanto(r.created_at)}</span>
                <span className="flex flex-wrap items-center gap-3">
                  {ehAutor && !sou(r.account_id) && <BotaoSolucao topicoId={t.id} respostaId={r.id} eSolucao={solucao} volta={volta} />}
                  <BotaoUtil respostaId={r.id} total={r.uteis} marcado={meusUteis.has(r.id)} volta={volta} logado={!!user} />
                  <BotaoDenunciar tipo="resposta" id={r.id} volta={volta} logado={!!user} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        {user ? <RespostaForm topicoId={t.id} volta={volta} /> : (
          <p className="rounded-2xl border border-line bg-surface px-6 py-6 text-center text-sm text-ink-muted">
            Sabe a resposta? <Link href={`/login?volta=${encodeURIComponent(volta)}`} className="text-amber hover:underline">Entre</Link> ou{" "}
            <Link href="/cadastro" className="text-amber hover:underline">crie sua conta grátis</Link> pra responder.
          </p>
        )}
      </div>
    </main>
  );
}
