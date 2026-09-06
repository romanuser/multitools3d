import { createClient } from "@/lib/supabase/server";
import { bootstrapAccount } from "@/lib/auth/actions";
import { NextResponse } from "next/server";

// Pra onde o Google (ou o link de confirmação de e-mail) redireciona de
// volta depois do login. Troca o "code" por uma sessão de verdade e
// garante que a conta na tabela "accounts" existe.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const companyName =
        (data.user.user_metadata?.company_name as string | undefined) ||
        (data.user.user_metadata?.full_name as string | undefined);
      await bootstrapAccount(data.user.id, data.user.email!, companyName);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Não foi possível confirmar o login.`);
}
