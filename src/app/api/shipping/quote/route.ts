import { NextRequest, NextResponse } from "next/server";
import { quoteShipping } from "@/lib/shipping/quote";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const accountId = String(body.accountId || "");
    const cep = String(body.cep || "");
    const items = Array.isArray(body.items) ? body.items : [];

    if (!accountId) return NextResponse.json({ message: "Loja não informada." }, { status: 400 });

    const quotes = await quoteShipping(accountId, cep, items);
    return NextResponse.json({ quotes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível calcular o frete.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
