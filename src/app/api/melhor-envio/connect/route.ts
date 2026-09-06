import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl } from "@/lib/shipping/melhor-envio-oauth";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL));

  try {
    const url = buildAuthorizeUrl(user.id);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao conectar.";
    const destination = new URL("/dashboard/loja", process.env.NEXT_PUBLIC_SITE_URL);
    destination.searchParams.set("frete_erro", message);
    return NextResponse.redirect(destination);
  }
}
