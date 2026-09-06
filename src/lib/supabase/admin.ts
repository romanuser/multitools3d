import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------
// Cliente com a service_role key: ignora TODAS as regras de RLS.
// Usar apenas dentro de rotas de servidor que não têm um usuário logado
// (ex: o webhook da InfinitePay, chamado direto pelos servidores deles).
// O pacote "server-only" garante que, se algum arquivo de cliente tentar
// importar isso por engano, o build quebra em vez de vazar a chave.
// ---------------------------------------------------------------------
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada no .env.local (veja .env.local.example)."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
