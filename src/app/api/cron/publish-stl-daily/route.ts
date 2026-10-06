import { NextRequest, NextResponse } from "next/server";
import { runDailyStlSelection } from "@/lib/stl-packs/select-daily";
import { notifyVipUsersOfNewStl } from "@/lib/email/stl-notification";

// Chamado 1x por dia pela função agendada da Netlify (netlify/functions/
// daily-stl-publish.ts). Protegido por um segredo compartilhado — sem ele,
// qualquer um poderia disparar a publicação na mão.
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const result = await runDailyStlSelection();

  // Só avisa por e-mail se de fato publicou algo novo agora — se a cota
  // do dia já estava completa (ex: alguém rodou "Publicar agora" antes),
  // não manda e-mail de novo.
  let notified = { sent: 0 };
  if (result.picked > 0) {
    notified = await notifyVipUsersOfNewStl();
  }

  return NextResponse.json({ ...result, emailsSent: notified.sent });
}
