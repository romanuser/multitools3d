import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS, haQuanto, nomeCategoria, urlTopico } from "@/lib/comunidade/config";

export const metadata = {
  title: { absolute: "Comunidade de impressão 3D: dúvidas, problemas e calibração — Multiferramenta 3D" },
  description: "Tire dúvidas sobre impressão 3D com quem imprime todo dia: problemas de impressão, filamentos, calibração e impressoras Bambu Lab, Creality, Elegoo e mais.",
  alternates: { canonical: "/comunidade" },
};
type Topico = { id: string; titulo: string; categoria: string; autor_nome: string; impressora: string | null; filamento: string | null; resolvido: boolean; respostas_count: number; ultima_atividade: string };

export default async function Comunidade({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string; f?: string }> }) {
  const { cat, q, f } = await searchParams;
  let topicos: Topico[] = [];
  try {
    let consulta = (await createClient()).from("forum_topicos")
      .select("id, titulo, categoria, autor_nome, impressora, filamento, resolvido, respostas_count, ultima_atividade")
      .order("ultima_atividade", { ascending: false }).limit(50);
    if (cat && CATEGORIAS.some((c) => c.id === cat)) consulta = consulta.eq("categoria", cat);
    if (q?.trim()) consulta = consulta.ilike("titulo", `%${q.trim().replace(/[%_\\]/g, "").slice(0, 60)}%`);
    if (f === "sem-resposta") consulta = consulta.eq("respostas_count", 0);
    if (f === "resolvidas") consulta = consulta.eq("resolvido", true);
    topicos = ((await consulta).data ?? []) as Topico[];
  } catch { topicos = []; }
  const link = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ cat, q, f, ...p }).filter(([, v]) => v) as [string, string][]).toString();
    return `/comunidade${s ? `?${s}` : ""}`;
  };
  const chip = (ativo: boolean) => `rounded-full border px-3 py-1.5 text-xs ${ativo ? "border-amber bg-amber-soft text-amber" : "border-line text-ink-muted hover:text-ink"}`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Comunidade de impressão 3D</h1>
          <p className="mt-2 text-sm text-ink-muted max-w-2xl">Pergunte, ajude e aprenda com quem imprime todo dia. Problemas de impressão, filamentos, calibração e o lado de negócio.</p>
        </div>
        <Link href="/comunidade/nova" className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm">Fazer uma pergunta</Link>
      </div>

      <Link href="/comunidade/calibracao" className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 hover:border-amber transition-colors">
        <span><b className="text-ink">🎯 Central de Calibração</b><span className="block text-sm text-ink-muted">Guias passo a passo, peças de teste e as configurações que funcionaram pra comunidade.</span></span>
        <span className="text-amber text-sm shrink-0">Abrir →</span>
      </Link>

      <form action="/comunidade" className="mt-6 flex gap-2">
        {cat && <input type="hidden" name="cat" value={cat} />}
        <input name="q" defaultValue={q} placeholder="Buscar: fiapos, warping, primeira camada…" className="input flex-1" />
        <button className="rounded-full border border-line px-4 text-sm text-ink hover:border-amber">Buscar</button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={link({ cat: undefined })} className={chip(!cat)}>Todas</Link>
        {CATEGORIAS.map((c) => <Link key={c.id} href={link({ cat: c.id })} className={chip(cat === c.id)}>{c.icone} {c.nome}</Link>)}
      </div>
      <div className="mt-2 flex gap-2">
        <Link href={link({ f: undefined })} className={chip(!f)}>Recentes</Link>
        <Link href={link({ f: "sem-resposta" })} className={chip(f === "sem-resposta")}>Sem resposta</Link>
        <Link href={link({ f: "resolvidas" })} className={chip(f === "resolvidas")}>Resolvidas</Link>
      </div>

      <div className="mt-6 space-y-3">
        {topicos.length === 0 && (
          <p className="rounded-2xl border border-line bg-surface px-6 py-10 text-center text-sm text-ink-muted">
            {q ? "Nada encontrado com essa busca. " : "Nenhuma pergunta aqui ainda. "}
            <Link href="/comunidade/nova" className="text-amber hover:underline">Seja o primeiro a perguntar</Link>.
          </p>
        )}
        {topicos.map((t) => (
          <Link key={t.id} href={urlTopico(t)} className="block rounded-2xl border border-line bg-surface px-5 py-4 hover:border-amber transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-ink">{t.resolvido && <span className="mr-2 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] text-amber align-middle">✓ Resolvida</span>}{t.titulo}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {nomeCategoria(t.categoria)} · {t.autor_nome} · {haQuanto(t.ultima_atividade)}
                  {t.impressora ? ` · ${t.impressora}` : ""}{t.filamento ? ` · ${t.filamento}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-center"><b className="block text-ink">{t.respostas_count}</b><span className="text-[11px] text-ink-muted">{t.respostas_count === 1 ? "resposta" : "respostas"}</span></span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
