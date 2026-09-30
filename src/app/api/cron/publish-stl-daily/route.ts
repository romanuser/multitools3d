import { NextRequest, NextResponse } from "next/server";
import { runDailyStlSelection } from "@/lib/stl-packs/select-daily";

// Chamado 1x por dia pela função agendada da Netlify (netlify/functions/
// daily-stl-publish.ts). Protegido por um segredo compartilhado — sem ele,
// qualquer um poderia disparar a publicação na mão.
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const result = await runDailyStlSelection();
  return NextResponse.json(result);
}
