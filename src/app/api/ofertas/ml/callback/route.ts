import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ehAdmin } from "@/lib/ofertas/admin";
import { trocarCodigo } from "@/lib/ofertas/ml";
import { dbSupabase } from "@/lib/ofertas/db";

// Volta do Mercado Livre depois da autorização: troca o código pelo acesso e guarda.
export async function GET(request: Request) {
  const url = new URL(request.url), volta = (q: string) => NextResponse.redirect(new URL(`/admin/ofertas?${q}`, request.url));
  if (!(await ehAdmin())) return NextResponse.redirect(new URL("/login", request.url));
  const state = (await cookies()).get("ml_state")?.value;
  if (!state || state !== url.searchParams.get("state")) return volta("ml_erro=" + encodeURIComponent("Sessão expirada. Clique em Conectar de novo."));
  const code = url.searchParams.get("code");
  if (!code) return volta("ml_erro=" + encodeURIComponent(url.searchParams.get("error_description") || "Autorização cancelada."));
  try {
    await dbSupabase().salvarToken(await trocarCodigo(code));
    const res = volta("ml=ok"); res.cookies.delete("ml_state"); return res;
  } catch (e) { return volta("ml_erro=" + encodeURIComponent(e instanceof Error ? e.message : "erro")); }
}
