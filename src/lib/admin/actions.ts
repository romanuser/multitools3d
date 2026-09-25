"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------
// Confere se quem está chamando é mesmo um admin. Usa o cliente normal
// (respeitando RLS) — um usuário só consegue ler a própria linha, então
// se is_admin vier true aqui é porque é a linha dele mesmo.
// ---------------------------------------------------------------------
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: account } = await supabase
    .from("accounts")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!account?.is_admin) redirect("/dashboard");
}

export async function adminUpdatePlan(
  accountId: string,
  plan: "free" | "vip_mensal" | "vip_vitalicio"
): Promise<{ error?: string }> {
  await requireAdmin();

  // A mudança em si usa a service_role key: um admin pode precisar editar
  // a conta de QUALQUER assinante, e a política de RLS de "accounts" só
  // deixa cada um mexer na própria linha.
  const admin = createAdminClient();
  const { error } = await admin.from("accounts").update({ plan }).eq("id", accountId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}

// Chamado assim que o admin clica em "Enviar boas-vindas" (o link do Gmail
// já abre em seguida). Não tem como confirmar que o e-mail foi realmente
// enviado dentro do Gmail — isso marca a intenção, pra pelo menos o
// painel lembrar quem já foi contatado e evitar reenvio por engano.
export async function adminMarkWelcomeSent(accountIds: string[]): Promise<{ error?: string }> {
  await requireAdmin();
  if (!accountIds.length) return {};

  const admin = createAdminClient();
  const { error } = await admin
    .from("accounts")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .in("id", accountIds);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}

// Desfaz a marcação de "já enviado" — usado quando o admin clica na própria
// etiqueta de data, pra liberar o checkbox de novo (ex: precisa reenviar de
// propósito pra alguém).
export async function adminResetWelcomeSent(accountId: string): Promise<{ error?: string }> {
  await requireAdmin();

  const admin = createAdminClient();
  const { error } = await admin.from("accounts").update({ welcome_email_sent_at: null }).eq("id", accountId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}
