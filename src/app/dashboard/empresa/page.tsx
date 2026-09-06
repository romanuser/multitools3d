import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompanyForm } from "./company-form";

export default async function EmpresaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: account } = await supabase
    .from("accounts")
    .select("company_name, company_logo_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-lg mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>

        <h1 className="font-display text-2xl text-ink mt-4 mb-1">Dados da empresa</h1>
        <p className="text-sm text-ink-muted mb-8">
          Esse nome e logo aparecem no cabeçalho dos orçamentos em PDF que você enviar pros
          seus clientes.
        </p>

        <CompanyForm
          initialName={account?.company_name ?? ""}
          initialLogoUrl={account?.company_logo_url ?? null}
        />
      </div>
    </main>
  );
}
