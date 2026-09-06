import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";

// ---------------------------------------------------------------------
// Roda no SERVIDOR (não no navegador do usuário), justamente porque o
// Hugging Face bloqueia chamadas diretas de sites de fora por CORS.
// Servidor conversando com servidor não tem essa restrição.
// ---------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get("photo") as File | null;
    const spaceId = String(formData.get("spaceId") || "stabilityai/TripoSR");

    if (!photo) {
      return NextResponse.json({ message: "Nenhuma foto enviada." }, { status: 400 });
    }

    let client;
    try {
      client = await Client.connect(spaceId);
    } catch {
      return NextResponse.json(
        { message: `Não consegui conectar em "${spaceId}" — esse espaço provavelmente está fora do ar agora. Tente outro, como hansyan/perflow-triposr.` },
        { status: 502 }
      );
    }

    const preprocess = await client.predict("/preprocess", [photo, true, 0.85]);
    const processedImage = (preprocess.data as unknown[])?.[0];

    const generated = await client.predict("/generate", [processedImage, 256]);
    const entries = (generated.data || []) as unknown[];
    const glbEntry = (entries[1] ?? entries[0]) as { url?: string; path?: string } | string | undefined;

    const glbUrl = typeof glbEntry === "string" ? glbEntry : glbEntry?.url || glbEntry?.path;

    if (!glbUrl) {
      return NextResponse.json(
        { message: "O modelo não retornou um arquivo 3D. Tente outro espaço." },
        { status: 502 }
      );
    }

    return NextResponse.json({ glbUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar o modelo 3D.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
