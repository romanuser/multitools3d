import { createClient } from "@/lib/supabase/server";
import { bootstrapAccount } from "@/lib/auth/actions";

// ---------------------------------------------------------------------
// Roda antes de QUALQUER página dentro de /dashboard. Garante que existe
// uma linha em "accounts" pro usuário logado — isso protege contra casos
// em que a criação da conta falhou no momento do cadastro (ex: e-mail de
// confirmação com link quebrado, callback do Google interrompido, etc).
// bootstrapAccount já checa se a conta existe antes de tentar criar, então
// isso é seguro e barato de rodar em toda navegação.
// ---------------------------------------------------------------------
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    await bootstrapAccount(user.id, user.email);
  }

  return <>{children}</>;
}
