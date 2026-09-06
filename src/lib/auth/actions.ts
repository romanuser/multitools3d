"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export type AuthState = { error?: string } | undefined;

// ---------------------------------------------------------------------
// Cadastro por e-mail/senha. Depois de criar o usuário no Supabase Auth,
// já cria a linha correspondente na tabela "accounts" (nome da empresa,
// e-mail) — assim o resto do app já pode assumir que "usuário logado"
// == "tem uma conta".
// ---------------------------------------------------------------------
export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const companyName = String(formData.get("companyName") || "").trim();

  if (!email || !password || !companyName) {
    return { error: "Preenche todos os campos." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { company_name: companyName },
    },
  });

  if (error) return { error: traduzErro(error.message) };

  // Se a confirmação por e-mail estiver desligada no projeto, o Supabase
  // já retorna uma sessão ativa aqui — nesse caso criamos a conta na hora.
  // Se estiver ligada (padrão), a criação acontece em /auth/callback,
  // depois que o usuário clicar no link do e-mail.
  if (data.user && data.session) {
    await bootstrapAccount(data.user.id, email, companyName);
    redirect("/dashboard");
  }

  redirect("/cadastro/confirme-seu-email");
}

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Preenche e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: traduzErro(error.message) };

  redirect("/dashboard");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/login?error=" + encodeURIComponent("Não consegui iniciar o login com Google."));
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------
// Garante que existe uma linha em "accounts" pro usuário logado. Chamado
// depois do cadastro por e-mail (se não precisar confirmar e-mail), no
// callback de confirmação de e-mail, e no callback do Google (onde não
// existe uma etapa de "cadastro" separada — o primeiro login já é o
// cadastro).
// ---------------------------------------------------------------------
export async function bootstrapAccount(userId: string, email: string, companyName?: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return;

  await supabase.from("accounts").insert({
    id: userId,
    email,
    company_name: companyName || email.split("@")[0],
  });
}

function traduzErro(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("User already registered")) return "Já existe uma conta com esse e-mail.";
  if (msg.includes("Email not confirmed")) return "Confirma seu e-mail antes de entrar (verifica a caixa de entrada).";
  return msg;
}
