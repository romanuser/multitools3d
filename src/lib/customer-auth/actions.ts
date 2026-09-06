"use server";

import { createClient } from "@/lib/supabase/server";

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
