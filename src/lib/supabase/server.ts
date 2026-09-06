import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase pra usar em Server Components, Server Actions e Route
// Handlers. Lê/escreve a sessão através dos cookies da requisição.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado a partir de um Server Component (sem permissão de
            // escrever cookie) — tudo bem, o middleware cuida de renovar
            // a sessão nesses casos.
          }
        },
      },
    }
  );
}
