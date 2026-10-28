import "server-only";
import { createClient } from "@/lib/supabase/server";

// Só o administrador da plataforma mexe no caçador.
export async function ehAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("accounts").select("is_admin").eq("id", user.id).maybeSingle();
  return !!data?.is_admin;
}
