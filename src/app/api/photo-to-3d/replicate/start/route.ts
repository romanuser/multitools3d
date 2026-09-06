import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

// ---------------------------------------------------------------------
// Só DISPARA a geração e devolve um ID na hora — não fica esperando o
// resultado (isso evita o problema de "tempo esgotado" do servidor).
// O navegador consulta o andamento depois, via /status.
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

    return NextResponse.json({ id: prediction.id, status: prediction.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao iniciar a geração.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
