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
