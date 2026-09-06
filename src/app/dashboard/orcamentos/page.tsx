import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrcamentosWorkspace } from "./orcamentos-workspace";
import type { QuotePattern } from "@/lib/quotes/types";

export default async function OrcamentosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: account }, { data: patterns }] = await Promise.all([
    supabase
      .from("accounts")
      .select("company_name, company_logo_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("quote_patterns")
      .select("id, name, dimensions, weight, production_time, notes, accessories, active")
      .eq("account_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>

        <div className="flex items-start justify-between mt-4 mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl text-ink">Orçamentos</h1>
            <p className="text-sm text-ink-muted max-w-md">
              Calcule o preço da impressão e gere um orçamento em PDF limpo pro cliente —
              os custos e a margem ficam só com você.
            </p>
          </div>
          {!account?.company_name && (
            <Link
              href="/dashboard/empresa"
              className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 hover:bg-amber-soft transition-colors whitespace-nowrap"
            >
              Cadastre o nome da sua empresa →
            </Link>
          )}
        </div>

        <OrcamentosWorkspace
          company={{
            name: account?.company_name ?? null,
            logoUrl: account?.company_logo_url ?? null,
          }}
          patterns={(patterns as QuotePattern[]) ?? []}
        />
      </div>
    </main>
  );
}
