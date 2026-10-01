import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type MarketplaceProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  storeSlug: string;
  storeName: string;
};

const RANDOM_POOL_SIZE = 200;
const RANDOM_CARDS = 24;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------
// Vitrine central: junta produtos de TODAS as contas que têm uma loja
// configurada (store_slug preenchido), não importa o plano — a loja
// virtual é gratuita pra qualquer um desde a mudança de planos.
//
// Usa o cliente admin porque a tabela "accounts" não é publicamente
// legível (cada conta só vê a própria linha) — aqui expomos de propósito
// só os campos seguros de cada loja (nome, slug, logo), igual já fazia
// getStoreBySlug pra uma loja individual.
// ---------------------------------------------------------------------
export async function getMarketplaceProducts(search?: string): Promise<{
  products: MarketplaceProduct[];
  matchedStores: { slug: string; name: string }[];
}> {
  const admin = createAdminClient();

  const { data: stores } = await admin
    .from("accounts")
    .select("id, store_slug, company_name, company_logo_url")
    .not("store_slug", "is", null);

  const eligibleStores = (stores ?? []).filter((s): s is typeof s & { store_slug: string } => !!s.store_slug);
  if (!eligibleStores.length) return { products: [], matchedStores: [] };

  const storeById = new Map(eligibleStores.map((s) => [s.id, s]));
  const term = search?.trim();

  function toMarketplaceProduct(p: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    account_id: string;
  }): MarketplaceProduct | null {
    const store = storeById.get(p.account_id);
    if (!store || !store.store_slug) return null;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      image_url: p.image_url,
      storeSlug: store.store_slug,
      storeName: store.company_name || "Loja",
    };
  }

  if (term) {
    // Lojas cujo NOME bate com a busca — mostra todos os produtos delas.
    const matchedStoreIds = eligibleStores
      .filter((s) => s.company_name?.toLowerCase().includes(term.toLowerCase()))
      .map((s) => s.id);

    const [byProductName, byStoreName] = await Promise.all([
      admin
        .from("products")
        .select("id, name, description, price, image_url, account_id")
        .eq("active", true)
        .in(
          "account_id",
          eligibleStores.map((s) => s.id)
        )
        .ilike("name", `%${term}%`)
        .limit(60),
      matchedStoreIds.length
        ? admin
            .from("products")
            .select("id, name, description, price, image_url, account_id")
            .eq("active", true)
            .in("account_id", matchedStoreIds)
            .limit(60)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const seen = new Set<string>();
    const products: MarketplaceProduct[] = [];
    for (const row of [...(byStoreName.data ?? []), ...(byProductName.data ?? [])]) {
      if (seen.has(row.id)) continue;
      const mapped = toMarketplaceProduct(row);
      if (mapped) {
        seen.add(row.id);
        products.push(mapped);
      }
    }

    const matchedStores = eligibleStores
      .filter((s) => matchedStoreIds.includes(s.id))
      .map((s) => ({ slug: s.store_slug!, name: s.company_name || "Loja" }));

    return { products, matchedStores };
  }

  // Sem busca: amostra aleatória pra "cards aleatórios de produtos".
  const { data: pool } = await admin
    .from("products")
    .select("id, name, description, price, image_url, account_id")
    .eq("active", true)
    .in(
      "account_id",
      eligibleStores.map((s) => s.id)
    )
    .limit(RANDOM_POOL_SIZE);

  const products = shuffle((pool ?? []).map(toMarketplaceProduct).filter((p): p is MarketplaceProduct => !!p)).slice(
    0,
    RANDOM_CARDS
  );

  return { products, matchedStores: [] };
}
