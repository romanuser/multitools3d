import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PayableList } from "./payable-list";
import { PayableChart } from "./payable-chart";

export default async function PagarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: payables }, { data: suppliers }] = await Promise.all([
    supabase
      .from("accounts_payable")
      .select(
        "id, category, supplier_id, description, total_amount, paid_amount, due_date, recurrence, status, settled_at, created_at, suppliers(name)"
      )
      .eq("account_id", user.id)
      .order("due_date", { ascending: true }),
    supabase.from("suppliers").select("id, name, contact").eq("account_id", user.id).order("name"),
  ]);

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-3xl mx-auto">
        <BackButton href="/dashboard" label="Painel" />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Contas a pagar</h1>
        <p className="text-sm text-ink-muted mb-8">
          Pró-labore, insumos consignados, custos mensais — você registra e marca como pago quando quitar.
        </p>

        <PayableChart payables={(payables ?? []) as any} />
        <PayableList payables={(payables ?? []) as any} suppliers={suppliers ?? []} />
      </div>
    </main>
  );
}
