import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReceiptView } from "@/components/receipt-view";

const STATUS_LABELS: Record<string, string> = {
  PAGAMENTO_CONFIRMADO: "Pagamento confirmado",
  EM_PRODUCAO: "Em produção",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
};

export default async function ComprovanteDetalhePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/loja/conta/entrar");

  const { data: order } = await supabase
    .from("store_orders")
    .select("id, account_id, items, total, status, created_at, customer_name, customer_email, shipping_label, shipping")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const { data: account } = await supabase
    .from("accounts")
    .select("company_name")
    .eq("id", order.account_id)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <ReceiptView
        orderId={order.id}
        storeName={account?.company_name || "Loja"}
        customerName={order.customer_name}
        customerEmail={order.customer_email}
        items={order.items || []}
        total={Number(order.total)}
        shippingLabel={order.shipping_label}
        shippingPrice={order.shipping}
        createdAt={order.created_at}
        status={STATUS_LABELS[order.status] || order.status}
      />
    </div>
  );
}
