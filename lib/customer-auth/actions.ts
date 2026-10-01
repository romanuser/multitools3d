"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateCustomerProfile(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const name = String(formData.get("name") || "").trim();
  const whatsapp = String(formData.get("whatsapp") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (!name) return { error: "Dá seu nome." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  // Guardamos no próprio perfil do login (user_metadata) — não precisa de
  // tabela nova só pra isso. Essas infos servem pra pré-preencher o
  // checkout nas próximas compras, em qualquer loja.
  const { error } = await supabase.auth.updateUser({ data: { name, whatsapp, address } });
  if (error) return { error: error.message };

  revalidatePath("/loja/conta/dados");
  return { success: true };
}

export async function changeCustomerPassword(newPassword: string): Promise<{ error?: string }> {
  if (newPassword.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return {};
}
