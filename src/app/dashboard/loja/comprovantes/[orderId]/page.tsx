import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReceiptView } from "@/components/receipt-view";

const STATUS_LABELS: Record<string, string> = {
  PAGAMENTO_CONFIRMADO: "Pagamento confirmado",
  EM_PRODUCAO: "Em produção",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
};

export default async function LojaComprovanteDetalhePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("store_orders")
    .select(
      "id, account_id, items, total, status, created_at, customer_name, customer_email, shipping_label, shipping, production_minutes, shipping_days, is_pickup, payment_transaction_nsu, payment_invoice_slug"
    )
    .eq("id", orderId)
    .eq("account_id", user.id) // só o dono da loja pode ver
    .maybeSingle();

  if (!order) notFound();

  const { data: account } = await supabase.from("accounts").select("company_name").eq("id", user.id).maybeSingle();

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-2xl mx-auto">
        <ReceiptView
          orderId={order.id}
          storeName={account?.company_name || "Sua loja"}
          customerName={order.customer_name}
          customerEmail={order.customer_email}
          items={order.items || []}
          total={Number(order.total)}
          shippingLabel={order.shipping_label}
          shippingPrice={order.shipping}
          createdAt={order.created_at}
          status={STATUS_LABELS[order.status] || order.status}
          productionMinutes={order.production_minutes}
          shippingDays={order.shipping_days}
          isPickup={order.is_pickup}
          paymentTransactionNsu={order.payment_transaction_nsu}
          paymentInvoiceSlug={order.payment_invoice_slug}
        />
      </div>
    </main>
  );
}
