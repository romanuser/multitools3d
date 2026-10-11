import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReceiptList, type ReceiptEntry } from "./receipt-list";
import { PAYMENT_LINK, isPendingMethod, paymentLabel, saleNumberLabel } from "@/lib/sales/types";

function storeReceiptNumber(orderId: string) {
  return "#" + orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function pendingDetail(byLink: boolean, status: string | undefined) {
  if (byLink) return status === "pago" ? "Link · pago" : status === "atrasado" ? "Link · atrasado" : "Link · aguardando";
  return status === "pago" ? "Fiado · quitado" : status === "atrasado" ? "Fiado · atrasado" : "Fiado · a receber";
}

// ---------------------------------------------------------------------
// Todos os comprovantes num lugar só: vendas diretas (balcão/WhatsApp)
// e vendas pagas da loja virtual.
// ---------------------------------------------------------------------
export default async function ComprovantesPage({ searchParams }: { searchParams: Promise<{ origem?: string }> }) {
  const { origem } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: sales }, { data: orders }, { data: creditRows }] = await Promise.all([
    supabase
      .from("direct_sales")
      .select("id, sale_number, customer_name, total, payment_method, created_at")
      .eq("account_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("store_orders")
      .select("id, customer_name, customer_email, total, status, created_at")
      .eq("account_id", user.id)
      .not("status", "in", "(AGUARDANDO_PAGAMENTO,CANCELADO)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("accounts_receivable")
      .select("direct_sale_id, status, due_date")
      .eq("account_id", user.id)
      .not("direct_sale_id", "is", null),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const creditStatus = new Map<string, string>();
  for (const r of creditRows ?? []) {
    const settled = r.status === "pago" || r.status === "baixado_sem_pagar";
    creditStatus.set(r.direct_sale_id as string, settled ? "pago" : r.due_date < today ? "atrasado" : "aberto");
  }

  const entries: ReceiptEntry[] = [
    ...(sales ?? []).map((s) => ({
      id: s.id,
      origin: "venda" as const,
      number: saleNumberLabel(s.sale_number),
      customer: s.customer_name,
      detail: isPendingMethod(s.payment_method)
        ? pendingDetail(s.payment_method === PAYMENT_LINK, creditStatus.get(s.id))
        : paymentLabel(s.payment_method),
      total: Number(s.total),
      createdAt: s.created_at,
      href: `/dashboard/comprovantes/venda/${s.id}`,
    })),
    ...(orders ?? []).map((o) => ({
      id: o.id,
      origin: "loja" as const,
      number: storeReceiptNumber(o.id),
      customer: o.customer_name || o.customer_email || "Cliente",
      detail: "Loja virtual",
      total: Number(o.total),
      createdAt: o.created_at,
      href: `/dashboard/loja/comprovantes/${o.id}`,
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mb-1">Comprovantes</h1>
            <p className="text-sm text-ink-muted max-w-lg">
              Todo comprovante fica guardado aqui: vendas diretas e vendas pagas da loja virtual. Abra pra imprimir no
              formato recibo ou cupom térmico, ou mandar pro cliente no WhatsApp.
            </p>
          </div>
          <Link
            href="/dashboard/vendas"
            className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm whitespace-nowrap"
          >
            + Nova venda
          </Link>
        </div>

        <ReceiptList entries={entries} initialOrigin={origem === "venda" || origem === "loja" ? origem : "todos"} />
      </div>
    </main>
  );
}
