import { NextRequest, NextResponse } from "next/server";
import { FEATURES, FEATURE_DISABLED_MESSAGE } from "@/lib/features";
import Replicate from "replicate";

export async function GET(request: NextRequest) {
  if (!FEATURES.photoTo3D) {
    return NextResponse.json({ message: FEATURE_DISABLED_MESSAGE }, { status: 503 });
  }

  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { message: "REPLICATE_API_TOKEN não configurada no servidor." },
        { status: 500 }
      );
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID não informado." }, { status: 400 });

    const replicate = new Replicate({ auth: token });
    const prediction = await replicate.predictions.get(id);

    return NextResponse.json({
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao consultar o andamento.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
