import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReceivableList } from "./receivable-list";
import { ReceivableChart } from "./receivable-chart";

export default async function ReceberPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: receivables } = await supabase
    .from("accounts_receivable")
    .select("id, description, total_amount, paid_amount, due_date, status, payment_link_url, settled_at, created_at")
    .eq("account_id", user.id)
    .order("due_date", { ascending: true });

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-3xl mx-auto">
        <BackButton href="/dashboard" label="Painel" />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Contas a receber</h1>
        <p className="text-sm text-ink-muted mb-8">
          Nascem automaticamente de cada acerto de consignado — aqui você confirma o pagamento e emite o comprovante.
        </p>

        <ReceivableChart receivables={receivables ?? []} />
        <ReceivableList receivables={receivables ?? []} />
      </div>
    </main>
  );
}
