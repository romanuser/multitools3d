import Link from "next/link";
import { notFound } from "next/navigation";
import { ehAdmin } from "@/lib/ofertas/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { urlTopico } from "@/lib/comunidade/config";
import { BotaoModerar } from "../../comunidade/componentes";

export const metadata = { title: "Moderação da comunidade", robots: { index: false } };
export const dynamic = "force-dynamic";

// Moderação: denúncias abertas + últimos posts, com ocultar/mostrar
export default async function ModeracaoComunidade() {
  if (!(await ehAdmin())) notFound();
  const admin = createAdminClient();
  const [{ data: denuncias }, { data: topicos }] = await Promise.all([
    admin.from("forum_denuncias").select("id, alvo_tipo, alvo_id, motivo, created_at").eq("resolvida", false).order("created_at", { ascending: false }).limit(50),
    admin.from("forum_topicos").select("id, titulo, autor_nome, oculto, created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  // o que foi denunciado (pra mostrar o texto)
  const ids = (t: string) => (denuncias ?? []).filter((d) => d.alvo_tipo === t).map((d) => d.alvo_id);
  const [tp, rp, pp] = await Promise.all([
    ids("topico").length ? admin.from("forum_topicos").select("id, titulo, corpo, oculto").in("id", ids("topico")) : { data: [] },
    ids("resposta").length ? admin.from("forum_respostas").select("id, corpo, oculto, topico_id").in("id", ids("resposta")) : { data: [] },
    ids("perfil").length ? admin.from("calib_perfis").select("id, impressora, material, notas, oculto").in("id", ids("perfil")) : { data: [] },
  ]);
  const alvo = new Map<string, { texto: string; oculto: boolean }>();
  for (const x of tp.data ?? []) alvo.set(x.id, { texto: `${x.titulo} — ${x.corpo}`, oculto: x.oculto });
  for (const x of rp.data ?? []) alvo.set(x.id, { texto: x.corpo, oculto: x.oculto });
  for (const x of pp.data ?? []) alvo.set(x.id, { texto: `${x.material} · ${x.impressora} — ${x.notas ?? ""}`, oculto: x.oculto });

  return (
    <main className="min-h-screen px-6 py-12"><div className="max-w-4xl mx-auto">
      <Link href="/comunidade" className="text-sm text-ink-muted hover:text-ink">← Comunidade</Link>
      <h1 className="font-display text-2xl font-semibold text-ink mt-4 mb-6">Moderação da comunidade</h1>
      <h2 className="font-display text-lg text-ink mb-3">Denúncias abertas ({denuncias?.length ?? 0})</h2>
      <div className="space-y-3">
        {(denuncias ?? []).length === 0 && <p className="text-sm text-ink-muted">Nenhuma denúncia aberta. 🎉</p>}
        {(denuncias ?? []).map((d) => { const a = alvo.get(d.alvo_id); const tipo = d.alvo_tipo as "topico" | "resposta" | "perfil";
          return (
            <div key={d.id} className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-xs text-ink-muted">{d.alvo_tipo} · motivo: {d.motivo || "(sem motivo)"}</p>
              <p className="mt-1 text-sm text-ink line-clamp-3">{a?.texto ?? "(já apagado)"}</p>
              {a && <div className="mt-3 flex gap-2">
                <BotaoModerar tipo={tipo} id={d.alvo_id} oculto={!a.oculto} denunciaId={d.id} texto={a.oculto ? "Mostrar de novo" : "Ocultar"} />
                <BotaoModerar tipo={tipo} id={d.alvo_id} oculto={a.oculto} denunciaId={d.id} texto="Ignorar denúncia" />
              </div>}
            </div>
          ); })}
      </div>
      <h2 className="font-display text-lg text-ink mt-10 mb-3">Últimas perguntas</h2>
      <div className="space-y-2">
        {(topicos ?? []).map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <Link href={urlTopico(t)} className={`text-sm ${t.oculto ? "text-ink-muted line-through" : "text-ink"} hover:underline`}>{t.titulo} <span className="text-xs text-ink-muted">· {t.autor_nome}</span></Link>
            <BotaoModerar tipo="topico" id={t.id} oculto={!t.oculto} texto={t.oculto ? "Mostrar" : "Ocultar"} />
          </div>
        ))}
      </div>
    </div></main>
  );
}
