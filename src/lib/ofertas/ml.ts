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
type ProdutoBusca = { id: string; name?: string; status?: string; pictures?: { url?: string; secure_url?: string }[] };
type Vencedor = { item_id?: string; price?: number; original_price?: number | null; shipping?: { free_shipping?: boolean; logistic_type?: string }; official_store_id?: number | null; condition?: string };
type Produto = ProdutoBusca & { permalink?: string; buy_box_winner?: Vencedor | null };

export function converterProduto(p: Produto): Item | null {
  const v = p.buy_box_winner;
  if (!v?.price || !p.name) return null;                              // sem oferta ativa agora
  const foto = p.pictures?.[0]?.secure_url || p.pictures?.[0]?.url || null;
  return {
    id: p.id, titulo: p.name, preco: Number(v.price), precoOriginal: v.original_price ? Number(v.original_price) : null,
    permalink: p.permalink || `https://www.mercadolivre.com.br/p/${p.id}`, thumb: foto ? foto.replace(/^http:/, "https:") : null,
    freteGratis: !!v.shipping?.free_shipping, full: v.shipping?.logistic_type === "fulfillment",
    novo: (v.condition ?? "new") === "new", lojaOficial: v.official_store_id != null,
  };
}

export async function buscar(accessToken: string, termo: string, limite = 12): Promise<Item[]> {
  let busca: { results?: ProdutoBusca[] };
  try { busca = await getML(accessToken, `/products/search?${new URLSearchParams({ status: "active", site_id: "MLB", q: termo, limit: String(limite) })}`); }
  catch (e) { const err = e as ErroML; throw new ErroML(`Busca "${termo}": ${err.message}`, err.status); }
  const ids = (busca.results ?? []).filter((r) => r?.id && (r.status ?? "active") === "active").map((r) => r.id).slice(0, limite);
  const detalhes = await Promise.allSettled(ids.map((id) => getML<Produto>(accessToken, `/products/${id}`)));
  const itens: Item[] = [];
  for (const d of detalhes) if (d.status === "fulfilled") { const it = converterProduto(d.value); if (it) itens.push(it); }
  // se TODOS os detalhes falharam com 401, propaga (renova o acesso e tenta de novo)
  const falhas = detalhes.filter((d) => d.status === "rejected") as PromiseRejectedResult[];
  if (ids.length && falhas.length === ids.length && falhas[0].reason instanceof ErroML) { const e = falhas[0].reason as ErroML; throw new ErroML(`Busca "${termo}" (detalhes): ${e.message}`, e.status); }
  return itens;
}

// Diagnóstico: testa cada recurso da API com o seu acesso e diz o que está liberado
export async function diagnostico(accessToken: string) {
  const testes: [string, string][] = [
    ["Sua conta (/users/me)", "/users/me"],
    ["Busca aberta (/sites/MLB/search)", "/sites/MLB/search?q=filamento&limit=1"],
    ["Busca no catálogo (/products/search)", "/products/search?status=active&site_id=MLB&q=filamento%20pla&limit=1"],
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
    try { const p = await getML<Produto>(accessToken, `/products/${produto}`); const it = converterProduto(p);
      out.push({ nome: "Detalhe do produto (/products/{id})", ok: !!it, detalhe: it ? `${it.titulo.slice(0, 50)} — R$ ${it.preco}` : "sem oferta ativa nesse produto" }); }
    catch (e) { out.push({ nome: "Detalhe do produto (/products/{id})", ok: false, detalhe: (e as Error).message }); }
  }
  return out;
}
