import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReceiptSwitcher } from "@/components/receipt-switcher";
import {
  DIRECT_SALE_COLUMNS,
  PAYMENT_COLUMNS,
  RECEIVABLE_COLUMNS,
  directSaleReceiptProps,
  type DirectSaleRow,
} from "@/lib/sales/receipt-props";
import { isPendingMethod, salePaymentStatus, type ReceivablePayment, type SaleReceivable } from "@/lib/sales/types";

export const metadata: Metadata = {
  title: "Comprovante de venda",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------
// Página pública do recibo — o link que vai pro cliente no WhatsApp. Só
// abre com o token secreto da venda (um uuid aleatório, impossível de
// adivinhar), nunca pelo id; e não aparece em buscador.
// ---------------------------------------------------------------------
export default async function ComprovantePublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pagamento?: string }>;
}) {
  const { token } = await params;
  const { pagamento } = await searchParams;
  if (!UUID_RE.test(token)) notFound();

  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("direct_sales")
    .select(`${DIRECT_SALE_COLUMNS}, account_id`)
    .eq("public_token", token)
    .maybeSingle();
  if (!sale) notFound();

  const [{ data: account }, { data: receivable }] = await Promise.all([
    admin.from("accounts").select("company_name").eq("id", sale.account_id).maybeSingle(),
    isPendingMethod(sale.payment_method)
      ? admin.from("accounts_receivable").select(RECEIVABLE_COLUMNS).eq("direct_sale_id", sale.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const rec = receivable as SaleReceivable | null;
  const { data: paymentData } = rec?.id
    ? await admin
        .from("receivable_payments")
        .select(PAYMENT_COLUMNS)
        .eq("receivable_id", rec.id)
        .order("paid_at", { ascending: true })
    : { data: [] };
  const payments = (paymentData ?? []) as ReceivablePayment[];
  const payment = salePaymentStatus(sale.payment_method, rec, payments);

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-2xl mx-auto">
        {pagamento === "confirmado" && (
          <p className="rounded-2xl border border-good/40 bg-good/10 px-4 py-3 mb-6 text-sm text-ink text-center print:hidden">
            Pagamento recebido. Obrigado! ✓
          </p>
        )}
        {pagamento === "pendente" && (
          <p className="rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 mb-6 text-sm text-ink text-center print:hidden">
            Ainda não recebemos a confirmação do pagamento. Se você já pagou, ela chega em alguns instantes.
          </p>
        )}
        {payment.balance > 0 && rec?.payment_link_url && (
          <a
            href={rec.payment_link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-amber text-on-accent font-medium rounded-full px-5 py-3 text-sm mb-6 print:hidden"
          >
            Pagar saldo de {payment.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </a>
        )}
        <ReceiptSwitcher {...directSaleReceiptProps(sale as DirectSaleRow, account?.company_name || "Loja", rec, payments)} hideBack />
        <p className="text-center text-xs text-ink-muted mt-6 print:hidden">
          Comprovante emitido pelo Multiferramenta 3D
        </p>
      </div>
    </main>
  );
}
