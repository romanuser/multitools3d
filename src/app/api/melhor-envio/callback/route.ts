import { NextRequest, NextResponse } from "next/server";
import { exchangeMelhorEnvioCode } from "@/lib/shipping/melhor-envio-oauth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const accountId = params.get("state");
  const oauthError = params.get("error");
  const oauthErrorDescription = params.get("error_description");

  const destination = new URL("/dashboard/loja", process.env.NEXT_PUBLIC_SITE_URL);

  if (!code || !accountId) {
    const detail = oauthErrorDescription || oauthError;
    destination.searchParams.set(
      "frete_erro",
      detail ? `Melhor Envio recusou a conexão: ${detail}` : "Resposta incompleta do Melhor Envio (sem código de autorização)."
    );
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
