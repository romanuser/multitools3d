import Link from "next/link";
import { Brand } from "@/components/brand";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 900;   // atualiza a cada 15 minutos
export const metadata = {
  title: "Ofertas de filamento e impressão 3D hoje — Multiferramenta 3D",
  description: "Promoções de verdade em filamento PLA, PETG, TPU, impressoras e acessórios de impressão 3D no Mercado Livre, conferidas pelo histórico de preço.",
};
const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Oferta = { item_id: string; preco: number; desconto: number; link: string; publicado_em: string; ofertas_itens: { titulo: string; thumb: string | null; preco: number | null; frete_gratis: boolean; full_ml: boolean } | null };

// Ofertas das últimas 72 h, uma por produto, só se o preço ainda estiver valendo
async function carregarOfertas(): Promise<Oferta[]> {
  const ofertas: Oferta[] = [];
  try {
    const { data } = await createAdminClient().from("ofertas_publicadas")
      .select("item_id, preco, desconto, link, publicado_em, ofertas_itens(titulo, thumb, preco, frete_gratis, full_ml)")
      .gte("publicado_em", new Date(Date.now() - 72 * 3600e3).toISOString()).order("publicado_em", { ascending: false }).limit(60);
    const vistos = new Set<string>();
    for (const o of (data ?? []) as unknown as Oferta[]) {
      const it = Array.isArray(o.ofertas_itens) ? o.ofertas_itens[0] : o.ofertas_itens;
      // mostra só uma vez por produto, e só se o preço ainda estiver valendo (até 2% acima do publicado)
      if (!it || vistos.has(o.item_id) || (it.preco != null && Number(it.preco) > Number(o.preco) * 1.02)) continue;
      vistos.add(o.item_id); ofertas.push({ ...o, ofertas_itens: it });
    }
  } catch { return []; }
  return ofertas;
}

export default async function OfertasPage() {
  const ofertas = await carregarOfertas();
  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label="Multiferramenta 3D, início"><Brand /></Link>
          <Link href="/cadastro" className="text-sm font-medium text-amber hover:underline">Organize sua impressão 3D</Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-ink">Ofertas de impressão 3D de hoje</h1>
        <p className="mt-2 text-sm text-ink-muted max-w-2xl">Filamentos, impressoras e acessórios em promoção <b className="text-ink">de verdade</b>: o nosso bot acompanha o preço de cada produto e só mostra quando ele está abaixo do normal — nada de “de/por” inflado.</p>
        {ofertas.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ofertas.map((o) => { const it = o.ofertas_itens!;
              return (
                <a key={o.item_id} href={o.link} target="_blank" rel="sponsored nofollow noopener" className="group rounded-2xl border border-line bg-surface p-4 flex gap-4 hover:border-amber transition-colors">
                  <span role="img" aria-label={it.titulo} className="h-24 w-24 shrink-0 rounded-xl bg-white bg-contain bg-center bg-no-repeat" style={it.thumb ? { backgroundImage: `url(${JSON.stringify(it.thumb)})` } : undefined} />
                  <div className="min-w-0 flex flex-col">
                    <p className="text-sm text-ink line-clamp-2">{it.titulo}</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{brl(o.preco)} <span className="text-xs font-medium text-amber">−{Math.round(Number(o.desconto) * 100)}%</span></p>
                    <p className="text-xs text-ink-muted">{[it.frete_gratis ? "Frete grátis" : null, it.full_ml ? "Full" : null].filter(Boolean).join(" · ")}</p>
                    <span className="mt-auto pt-2 text-xs font-medium text-amber group-hover:underline">Ver no Mercado Livre →</span>
                  </div>
                </a>
              ); })}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl border border-line bg-surface px-6 py-10 text-center text-sm text-ink-muted">Nenhuma promoção de verdade agora. O bot confere os preços de hora em hora — volte mais tarde.</p>
        )}
        <p className="mt-10 text-xs text-ink-muted">Os links desta página são de afiliado: se você comprar, a Multiferramenta 3D pode receber uma comissão do Mercado Livre, sem custo extra pra você. Preços e estoque podem mudar a qualquer momento.</p>
        <div className="mt-8 rounded-2xl border border-amber/40 bg-surface p-6">
          <p className="font-display text-xl text-ink">Vende impressão 3D?</p>
          <p className="mt-1 text-sm text-ink-muted">Calcule o preço certo de cada peça, controle o estoque de filamento e organize os pedidos num painel só.</p>
          <Link href="/cadastro" className="mt-4 inline-block rounded-full bg-amber px-5 py-2 text-sm font-medium text-white">Conhecer a Multiferramenta 3D</Link>
        </div>
      </div>
    </main>
  );
}
