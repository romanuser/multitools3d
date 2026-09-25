import { createAdminClient } from "@/lib/supabase/admin";
import { WELCOME_PROMO_LIMIT } from "@/lib/email/promo-config";
import { CadastroForm } from "./cadastro-form";

// ---------------------------------------------------------------------
// Calcula quantas vagas do bônus "primeiros usuários" ainda restam, só
// pra mostrar o aviso na tela. A decisão de verdade (quem ganha o VIP
// vitalício) é feita de novo, na hora do cadastro em si, dentro de
// handleNewAccountWelcomeEmail — este número aqui é só informativo e
// pode, em tese, ficar um cadastro desatualizado por segundos de
// diferença entre pessoas cadastrando ao mesmo tempo. Isso é aceitável
// pra um aviso promocional.
// ---------------------------------------------------------------------
async function getRemainingPromoSlots() {
  try {
    const admin = createAdminClient();
    const { count } = await admin.from("accounts").select("id", { count: "exact", head: true });
    if (typeof count !== "number") return null;
    const remaining = WELCOME_PROMO_LIMIT - count;
    return remaining > 0 ? remaining : 0;
  } catch {
    return null;
  }
}

export default async function CadastroPage() {
  const remainingPromoSlots = await getRemainingPromoSlots();
  return <CadastroForm remainingPromoSlots={remainingPromoSlots} />;
}
