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
    .select("id, description, total_amount, paid_amount, due_date, status, payment_link_url, settled_at, created_at, direct_sale_id")
    .eq("account_id", user.id)
    .order("due_date", { ascending: true });

  // Vendas fiado: nome e WhatsApp do cliente, pra cobrar direto daqui.
  const saleIds = (receivables ?? []).map((r) => r.direct_sale_id).filter(Boolean) as string[];
  const [{ data: sales }, { data: account }] = await Promise.all([
    saleIds.length
      ? supabase.from("direct_sales").select("id, customer_name, customer_phone").in("id", saleIds)
      : Promise.resolve({ data: [] as { id: string; customer_name: string; customer_phone: string | null }[] }),
    supabase.from("accounts").select("company_name, infinitepay_handle").eq("id", user.id).maybeSingle(),
  ]);
  // Recebimentos de cada conta (forma de pagamento de cada baixa).
  const receivableIds = (receivables ?? []).map((r) => r.id);
  const { data: paymentRows } = receivableIds.length
    ? await supabase
        .from("receivable_payments")
        .select("receivable_id, amount, method, source, installments, paid_at")
        .in("receivable_id", receivableIds)
        .order("paid_at", { ascending: true })
    : { data: [] };
  type PaymentRow = {
    receivable_id: string;
    amount: number;
    method: string;
    source: string;
    installments: number | null;
    paid_at: string;
  };
  const paymentsByReceivable: Record<string, PaymentRow[]> = {};
  for (const p of (paymentRows ?? []) as PaymentRow[]) {
    (paymentsByReceivable[p.receivable_id] ??= []).push(p);
  }

  const customers = Object.fromEntries(
    (sales ?? []).map((s) => [s.id, { name: s.customer_name, phone: s.customer_phone }])
  );

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-3xl mx-auto">
        <BackButton href="/dashboard" label="Painel" />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Contas a receber</h1>
        <p className="text-sm text-ink-muted mb-8">
          Nascem automaticamente de cada acerto de consignado e de cada venda fiado. Mande o link de cobrança pelo
          WhatsApp: quando o cliente paga pelo link, a conta recebe baixa sozinha.
        </p>

        <ReceivableChart receivables={receivables ?? []} />
        <ReceivableList
          receivables={receivables ?? []}
          customers={customers}
          payments={paymentsByReceivable}
          storeName={account?.company_name || "nossa loja"}
          hasInfinitepay={!!account?.infinitepay_handle}
        />
      </div>
    </main>
  );
}
