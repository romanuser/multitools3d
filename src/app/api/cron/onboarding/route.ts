import { NextResponse } from "next/server";
import { runOnboarding } from "@/lib/email/onboarding";

// Dispara a sequência de boas-vindas. Protegido pela senha CRON_SECRET.
//  - Agendado (Netlify, todo dia): POST com o cabeçalho x-cron-secret
//  - Teste manual no navegador:  /api/cron/onboarding?secret=SUA_SENHA&dry=1  (só mostra, não envia)
async function handle(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get("x-cron-secret") || url.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const dry = url.searchParams.get("dry") === "1";
  try {
    return NextResponse.json(await runOnboarding(dry));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 500 });
  }
}
export const GET = handle;
export const POST = handle;
