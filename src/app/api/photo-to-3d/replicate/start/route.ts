import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@/lib/supabase/server";
import { getAccountPlanStatus, hasFullAccess } from "@/lib/plans/access";

const MONTHLY_LIMIT = 10;

// ---------------------------------------------------------------------
// Só DISPARA a geração e devolve um ID na hora — não fica esperando o
// resultado (isso evita o problema de "tempo esgotado" do servidor).
// O navegador consulta o andamento depois, via /status.
//
// Cada geração custa uma fração de real no Replicate — por isso essa
// rota exige plano VIP e limita a 10 gerações por conta por mês, pra
// não sair caro demais se alguém gerar muitos modelos seguidos.
// ---------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { message: "REPLICATE_API_TOKEN não configurada no servidor." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Faça login pra usar essa ferramenta." }, { status: 401 });

    const { plan } = await getAccountPlanStatus(user.id);
    if (!hasFullAccess(plan)) {
      return NextResponse.json({ message: "Essa ferramenta é exclusiva do plano VIP." }, { status: 403 });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("photo3d_generations")
      .select("id", { count: "exact", head: true })
      .eq("account_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    if ((count ?? 0) >= MONTHLY_LIMIT) {
      return NextResponse.json(
        { message: `Você já usou as ${MONTHLY_LIMIT} gerações incluídas nesse mês. Volta mês que vem!` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const imageDataUri = String(body.image || "");
    const version = String(body.version || "").trim();

    if (!imageDataUri) return NextResponse.json({ message: "Nenhuma imagem enviada." }, { status: 400 });
    if (!version) return NextResponse.json({ message: "Informe a versão do modelo." }, { status: 400 });

    const replicate = new Replicate({ auth: token });

    const prediction = await replicate.predictions.create({
      version,
      input: { image: imageDataUri },
    });

    await supabase.from("photo3d_generations").insert({ account_id: user.id });

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      remaining: MONTHLY_LIMIT - (count ?? 0) - 1,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao iniciar a geração.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
