import { NextResponse } from "next/server";
import { rodar } from "@/lib/ofertas/rodar";
import { dbSupabase } from "@/lib/ofertas/db";

// Caçador de promoções. Protegido pela senha CRON_SECRET (a mesma dos e-mails).
//  - Agendado (Netlify, de hora em hora): POST com o cabeçalho x-cron-secret
//  - Teste no navegador (não publica nada): /api/cron/ofertas?secret=SUA_SENHA&dry=1&todas=1
async function handle(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get("x-cron-secret") || url.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    return NextResponse.json(await rodar({ db: dbSupabase(), publicar: url.searchParams.get("dry") !== "1", todas: url.searchParams.get("todas") === "1" }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "erro" }, { status: 500 });
  }
}
export const GET = handle;
export const POST = handle;
