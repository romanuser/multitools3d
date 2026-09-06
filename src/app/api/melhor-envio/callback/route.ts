import { NextRequest, NextResponse } from "next/server";
import { exchangeMelhorEnvioCode } from "@/lib/shipping/melhor-envio-oauth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const accountId = params.get("state");

  const destination = new URL("/dashboard/loja", process.env.NEXT_PUBLIC_SITE_URL);

  if (!code || !accountId) {
    destination.searchParams.set("frete_erro", "Resposta incompleta do Melhor Envio.");
    return NextResponse.redirect(destination);
  }

  try {
    await exchangeMelhorEnvioCode(accountId, code);
    destination.searchParams.set("frete", "conectado");
  } catch (error) {
    destination.searchParams.set("frete_erro", error instanceof Error ? error.message : "Erro ao conectar.");
  }

  return NextResponse.redirect(destination);
}
