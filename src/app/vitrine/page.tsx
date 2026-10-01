import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";
import { getMarketplaceProducts } from "@/lib/store/marketplace";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const metadata = { title: "Vitrine — Multiferramenta 3D" };

export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { products, matchedStores } = await getMarketplaceProducts(q);

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label="Multiferramenta 3D, início">
            <Brand />
          </Link>
          <Link href="/cadastro" className="text-sm font-medium text-amber hover:underline">
            Quero minha loja
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink mb-1">Vitrine</h1>
        <p className="text-ink-muted mb-8">Produtos de quem vende pela Multiferramenta 3D, todos num lugar só.</p>

        <form action="/vitrine" method="get" className="relative mb-10 max-w-lg">
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            name="q"
            defaultValue={q || ""}
            placeholder="Buscar produto ou loja…"
            className="input"
            style={{ paddingLeft: "2.5rem" }}
          />
        </form>

        {q && matchedStores.length > 0 && (
          <div className="mb-8">
            <p className="text-sm font-medium text-ink-muted mb-2.5">Lojas encontradas</p>
            <div className="flex flex-wrap gap-2">
              {matchedStores.map((s) => (
                <Link
                  key={s.slug}
                  href={`/loja/${s.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink hover:border-amber/40 transition-colors"
                >
                  <Icon name="store" size={14} className="text-amber" />
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <div className="border border-line bg-surface rounded-2xl p-10 text-center">
            <p className="text-ink-muted text-sm">
              {q ? "Nenhum produto ou loja encontrado pra essa busca." : "Ainda não tem produtos na vitrine."}
            </p>
          </div>
        ) : (
          <>
            {!q && <p className="text-sm font-medium text-ink-muted mb-2.5">Descubra algo novo</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/loja/${p.storeSlug}`}
                  className="group border border-line bg-surface rounded-2xl overflow-hidden flex flex-col hover:border-amber/30 transition-colors"
                >
                  <div className="aspect-square bg-paper flex items-center justify-center">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="cube" size={28} className="text-ink-muted" />
                    )}
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col">
                    <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                    <p className="text-xs text-ink-muted truncate mt-0.5 flex items-center gap-1">
                      <Icon name="store" size={11} className="shrink-0" />
                      {p.storeName}
                    </p>
                    <p className="font-spec text-amber font-medium text-sm mt-auto pt-2">{money(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
