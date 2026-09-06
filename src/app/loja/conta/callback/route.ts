import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------
// Callback separado do /auth/callback (que é usado pelos ASSINANTES).
// Esse aqui é só pros CLIENTES finais que compram nas lojas — por isso
// ele NUNCA chama bootstrapAccount. Se usasse o mesmo callback dos
// assinantes, todo cliente que entrasse ganharia sem querer uma conta
// de assinante no Multiferramenta 3D.
// ---------------------------------------------------------------------
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/loja/conta`);
    }
  }

  return NextResponse.redirect(`${origin}/loja/conta/entrar?error=Não foi possível confirmar o login.`);
}
