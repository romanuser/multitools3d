import { redirect } from "next/navigation";

// Os comprovantes agora ficam todos juntos (venda direta + loja) em
// /dashboard/comprovantes — este endereço antigo só redireciona.
export default function LojaComprovantesPage() {
  redirect("/dashboard/comprovantes?origem=loja");
}
