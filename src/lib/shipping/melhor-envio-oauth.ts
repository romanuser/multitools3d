import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/plans/infinitepay";

export function melhorEnvioBaseUrl() {
  return process.env.MELHOR_ENVIO_SANDBOX === "true"
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";
}

export function melhorEnvioRedirectUri() {
  return `${getSiteUrl()}/api/melhor-envio/callback`;
}

export function melhorEnvioUserAgent() {
  return process.env.MELHOR_ENVIO_USER_AGENT || "Multiferramenta3D (contato@multiferramenta3d.com.br)";
}

function oauthCredentials() {
  const clientId = String(process.env.MELHOR_ENVIO_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.MELHOR_ENVIO_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    throw new Error("Integração com Melhor Envio ainda não foi configurada na plataforma.");
  }
  return { clientId, clientSecret, redirectUri: melhorEnvioRedirectUri() };
}

export function melhorEnvioOAuthConfigured() {
  return Boolean(process.env.MELHOR_ENVIO_CLIENT_ID && process.env.MELHOR_ENVIO_CLIENT_SECRET);
}

export function buildAuthorizeUrl(accountId: string) {
  const { clientId, redirectUri } = oauthCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "shipping-calculate",
    state: accountId,
  });
  return `${melhorEnvioBaseUrl()}/oauth/authorize?${params.toString()}`;
}

type TokenRow = {
  melhor_envio_access_token: string | null;
  melhor_envio_refresh_token: string | null;
  melhor_envio_expires_at: string | null;
};

async function requestToken(body: Record<string, string>) {
  const response = await fetch(`${melhorEnvioBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": melhorEnvioUserAgent(),
    },
    body: new URLSearchParams(body).toString(),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.access_token || !result?.refresh_token) {
    throw new Error(result?.message || "Não foi possível obter o token do Melhor Envio.");
  }
  return result as { access_token: string; refresh_token: string; expires_in: number };
}

export async function exchangeMelhorEnvioCode(accountId: string, code: string) {
  const { clientId, clientSecret, redirectUri } = oauthCredentials();
  const result = await requestToken({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const admin = createAdminClient();
  const now = Date.now();
  await admin
    .from("accounts")
    .update({
      melhor_envio_access_token: result.access_token,
      melhor_envio_refresh_token: result.refresh_token,
      melhor_envio_expires_at: new Date(now + Math.max(60, result.expires_in || 2592000) * 1000).toISOString(),
      melhor_envio_refresh_expires_at: new Date(now + 45 * 24 * 60 * 60 * 1000).toISOString(),
      melhor_envio_connected_at: new Date(now).toISOString(),
    })
    .eq("id", accountId);
}

async function refreshToken(accountId: string, refreshTokenValue: string) {
  const { clientId, clientSecret, redirectUri } = oauthCredentials();
  const result = await requestToken({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    refresh_token: refreshTokenValue,
  });

  const admin = createAdminClient();
  const now = Date.now();
  await admin
    .from("accounts")
    .update({
      melhor_envio_access_token: result.access_token,
      melhor_envio_refresh_token: result.refresh_token,
      melhor_envio_expires_at: new Date(now + Math.max(60, result.expires_in || 2592000) * 1000).toISOString(),
    })
    .eq("id", accountId);

  return result.access_token;
}

export async function getValidAccessToken(accountId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("accounts")
    .select("melhor_envio_access_token, melhor_envio_refresh_token, melhor_envio_expires_at")
    .eq("id", accountId)
    .maybeSingle<TokenRow>();

  if (!data?.melhor_envio_access_token || !data.melhor_envio_refresh_token) {
    throw new Error("Essa loja ainda não conectou o Melhor Envio.");
  }

  const expiresAt = data.melhor_envio_expires_at ? Date.parse(data.melhor_envio_expires_at) : 0;
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 5 * 60 * 1000) {
    return data.melhor_envio_access_token;
  }

  return refreshToken(accountId, data.melhor_envio_refresh_token);
}

export async function fetchMelhorEnvio(accountId: string, pathname: string, init: RequestInit = {}) {
  const token = await getValidAccessToken(accountId);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  headers.set("User-Agent", melhorEnvioUserAgent());
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${melhorEnvioBaseUrl()}${pathname}`, { ...init, headers, cache: "no-store" });
}
