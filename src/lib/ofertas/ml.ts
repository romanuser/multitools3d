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
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Mercado Livre recusou o acesso: ${j.message || j.error || r.status}`);
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

// Busca por termo (resultado de busca oficial). 401 = token vencido; 403 = app sem permissão / bloqueio.
export async function buscar(accessToken: string, termo: string, limite = 50): Promise<Item[]> {
  const r = await fetch(`${API}/sites/MLB/search?${new URLSearchParams({ q: termo, limit: String(limite) })}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, cache: "no-store",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new ErroML(`Busca "${termo}": ${r.status} ${j.message || j.error || ""}`.trim(), r.status);
  }
  const j = await r.json();
  return ((j.results ?? []) as Resultado[]).filter((x) => x?.id && x?.price && x?.permalink).map(converter);
}
