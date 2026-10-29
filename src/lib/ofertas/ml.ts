// Mercado Livre — API OFICIAL (com o app de desenvolvedor). Sem raspar páginas.
import type { Item } from "./regras";

const API = "https://api.mercadolibre.com";
export const ML_AUTORIZAR = "https://auth.mercadolivre.com.br/authorization";
export type TokenML = { access_token: string; refresh_token: string; expira_em: string };

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://multiferramenta3d.com").replace(/\/$/, "");
export const redirectUri = () => `${site()}/api/ofertas/ml/callback`;

function credenciais() {
  const id = process.env.ML_CLIENT_ID, secret = process.env.ML_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Faltam ML_CLIENT_ID e ML_CLIENT_SECRET nas variáveis da Netlify.");
  return { id, secret };
}

async function token(params: Record<string, string>): Promise<TokenML> {
  const { id, secret } = credenciais();
  const r = await fetch(`${API}/oauth/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...params }),
    signal: AbortSignal.timeout(10000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Mercado Livre recusou o acesso: ${j.message || j.error || r.status}`);
  if (!j.refresh_token) throw new Error("O Mercado Livre não enviou o “refresh token” (renovação automática). No app em developers.mercadolivre.com.br, em “Fluxos OAuth”, marque “Refresh Token”, salve e clique em Conectar de novo.");
  return { access_token: j.access_token, refresh_token: j.refresh_token, expira_em: new Date(Date.now() + (j.expires_in ?? 21600) * 1000).toISOString() };
}
export const trocarCodigo = (code: string) => token({ grant_type: "authorization_code", code, redirect_uri: redirectUri() });
export const renovar = (refresh: string) => token({ grant_type: "refresh_token", refresh_token: refresh });

export function urlAutorizar(state: string) {
  const { id } = credenciais();
  return `${ML_AUTORIZAR}?${new URLSearchParams({ response_type: "code", client_id: id, redirect_uri: redirectUri(), state })}`;
}

type Resultado = {
  id: string; title: string; price: number; original_price?: number | null; permalink: string; thumbnail?: string; secure_thumbnail?: string;
  condition?: string; shipping?: { free_shipping?: boolean; logistic_type?: string }; official_store_id?: number | null;
};
const foto = (r: Resultado) => {
  const t = r.secure_thumbnail || r.thumbnail; if (!t) return null;
  return t.replace(/^http:/, "https:").replace(/-I\.(jpg|webp)$/, "-O.$1");          // versão maior da foto
};
export function converter(r: Resultado): Item {
  return {
    id: r.id, titulo: r.title, preco: Number(r.price), precoOriginal: r.original_price ? Number(r.original_price) : null,
    permalink: r.permalink, thumb: foto(r), freteGratis: !!r.shipping?.free_shipping, full: r.shipping?.logistic_type === "fulfillment",
    novo: (r.condition ?? "new") === "new", lojaOficial: r.official_store_id != null,
  };
}

export class ErroML extends Error { constructor(msg: string, public status: number) { super(msg); } }

async function getML<T>(accessToken: string, caminho: string, ms = 7000): Promise<T> {
  const r = await fetch(`${API}${caminho}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(ms) })
    .catch((e) => { throw new ErroML(`${e?.name === "TimeoutError" ? "o Mercado Livre demorou demais" : e?.message || "falha de rede"}`, 0); });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new ErroML(`${r.status} ${j.message || j.error || ""}`.trim(), r.status); }
  return r.json() as Promise<T>;
}

// ---------------------------------------------------------------------
// Fonte: CATÁLOGO do Mercado Livre (a busca aberta /sites/MLB/search foi fechada pra apps em 2025).
// 1) /products/search acha os produtos do catálogo pelo termo
// 2) /products/{id} traz o "vencedor da compra" (melhor oferta entre os vendedores): preço, frete, Full
// ---------------------------------------------------------------------
type ProdutoBusca = { id: string; name?: string; status?: string; permalink?: string; pictures?: { url?: string; secure_url?: string }[] };
// Oferta de um vendedor dentro do produto do catálogo (/products/{id}/items)
type Oferta = { item_id?: string; price?: number; original_price?: number | null; condition?: string; official_store_id?: number | null; shipping?: { free_shipping?: boolean; logistic_type?: string } };

const fotoDe = (p: ProdutoBusca) => { const f = p.pictures?.[0]?.secure_url || p.pictures?.[0]?.url; return f ? f.replace(/^http:/, "https:") : null; };

// Melhor oferta do produto: a mais barata entre as de produto NOVO
export function melhorOferta(p: ProdutoBusca, ofertas: Oferta[]): Item | null {
  const validas = ofertas.filter((o) => o.price && o.price > 0 && (o.condition ?? "new") === "new");
  if (!validas.length || !p.name) return null;
  const o = validas.reduce((m, x) => (x.price! < m.price! ? x : m));
  return {
    id: p.id, titulo: p.name, preco: Number(o.price), precoOriginal: o.original_price ? Number(o.original_price) : null,
    permalink: p.permalink || `https://www.mercadolivre.com.br/p/${p.id}`, thumb: fotoDe(p),
    freteGratis: !!o.shipping?.free_shipping, full: o.shipping?.logistic_type === "fulfillment", novo: true, lojaOficial: o.official_store_id != null,
  };
}

async function ofertasDoProduto(accessToken: string, id: string) {
  try { return (await getML<{ results?: Oferta[] }>(accessToken, `/products/${id}/items`)).results ?? []; }
  catch (e) { if (e instanceof ErroML && e.status === 404) return []; throw e; }      // 404 = produto sem vendedores agora
}

export async function buscar(accessToken: string, termo: string, limite = 15): Promise<Item[]> {
  let busca: { results?: ProdutoBusca[] };
  try { busca = await getML(accessToken, `/products/search?${new URLSearchParams({ status: "active", site_id: "MLB", q: termo, limit: String(limite) })}`); }
  catch (e) { const err = e as ErroML; throw new ErroML(`Busca "${termo}": ${err.message}`, err.status); }
  const produtos = (busca.results ?? []).filter((r) => r?.id && (r.status ?? "active") === "active").slice(0, limite);
  const res = await Promise.allSettled(produtos.map(async (p) => {
    // a busca às vezes não traz nome/foto: aí pega o detalhe do produto
    const base = p.name ? p : { ...p, ...(await getML<ProdutoBusca>(accessToken, `/products/${p.id}`)) };
    return melhorOferta(base, await ofertasDoProduto(accessToken, p.id));
  }));
  const itens = res.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
  const falhas = res.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  if (produtos.length && falhas.length === produtos.length && falhas[0].reason instanceof ErroML) {
    const e = falhas[0].reason as ErroML; throw new ErroML(`Busca "${termo}" (ofertas): ${e.message}`, e.status);
  }
  return itens;
}

// Diagnóstico: testa cada recurso da API com o seu acesso e diz o que está liberado
export async function diagnostico(accessToken: string) {
  const testes: [string, string][] = [
    ["Sua conta (/users/me)", "/users/me"],
    ["Busca aberta (/sites/MLB/search)", "/sites/MLB/search?q=filamento&limit=1"],
    ["Busca no catálogo (/products/search)", "/products/search?status=active&site_id=MLB&q=filamento%20pla%201kg&limit=3"],
  ];
  const out: { nome: string; ok: boolean; detalhe: string }[] = [];
  let produto: string | null = null;
  for (const [nome, caminho] of testes) {
    try {
      const j = await getML<{ results?: { id: string }[]; nickname?: string }>(accessToken, caminho);
      if (caminho.startsWith("/products/search")) produto = j.results?.[0]?.id ?? null;
      out.push({ nome, ok: true, detalhe: j.nickname ? `conta ${j.nickname}` : `${j.results?.length ?? 0} resultado(s)` });
    } catch (e) { out.push({ nome, ok: false, detalhe: (e as Error).message }); }
  }
  if (produto) {
    try {
      const det = await getML<Record<string, unknown>>(accessToken, `/products/${produto}`);
      out.push({ nome: "Detalhe do produto (/products/{id})", ok: true, detalhe: `${String(det.name ?? "").slice(0, 45)} · campos: ${Object.keys(det).slice(0, 12).join(", ")}` });
    } catch (e) { out.push({ nome: "Detalhe do produto (/products/{id})", ok: false, detalhe: (e as Error).message }); }
    try {
      const of = await ofertasDoProduto(accessToken, produto);
      const precos = of.filter((o) => o.price && (o.condition ?? "new") === "new").map((o) => o.price!).sort((x, y) => x - y);
      out.push({ nome: "Ofertas do produto (/products/{id}/items)", ok: precos.length > 0,
        detalhe: precos.length ? `${of.length} vendedor(es), menor preço (novo) R$ ${precos[0].toFixed(2).replace(".", ",")}` : "nenhum vendedor com preço nesse produto agora" });
    } catch (e) { out.push({ nome: "Ofertas do produto (/products/{id}/items)", ok: false, detalhe: (e as Error).message }); }
  }
  return out;
}
