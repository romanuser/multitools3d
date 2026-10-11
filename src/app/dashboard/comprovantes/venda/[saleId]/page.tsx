import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReceiptSwitcher } from "@/components/receipt-switcher";
import { SaleShareBar } from "@/components/sale-share-bar";
import { SaleSettlePanel } from "@/components/sale-settle-panel";
import {
  DIRECT_SALE_COLUMNS,
  PAYMENT_COLUMNS,
  RECEIVABLE_COLUMNS,
  directSaleReceiptProps,
  type DirectSaleRow,
} from "@/lib/sales/receipt-props";
import {
  PAYMENT_LINK,
  isPendingMethod,
  salePaymentStatus,
  saleNumberLabel,
  type ReceivablePayment,
  type SaleReceivable,
} from "@/lib/sales/types";

export default async function VendaComprovantePage({
  params,
  searchParams,
}: {
  params: Promise<{ saleId: string }>;
  searchParams: Promise<{ nova?: string; fila?: string; semfila?: string }>;
}) {
  const { saleId } = await params;
  const { nova, fila, semfila } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sale } = await supabase
    .from("direct_sales")
    .select(`${DIRECT_SALE_COLUMNS}, public_token`)
    .eq("id", saleId)
    .eq("account_id", user.id)
    .maybeSingle();
  if (!sale) notFound();

  const pending = isPendingMethod(sale.payment_method);
  const byLink = sale.payment_method === PAYMENT_LINK;

  const [{ data: account }, { data: receivableData }] = await Promise.all([
    supabase.from("accounts").select("company_name").eq("id", user.id).maybeSingle(),
    pending
      ? supabase.from("accounts_receivable").select(RECEIVABLE_COLUMNS).eq("direct_sale_id", sale.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const receivable = receivableData as SaleReceivable | null;
  const { data: paymentData } = receivable?.id
    ? await supabase
        .from("receivable_payments")
        .select(PAYMENT_COLUMNS)
        .eq("receivable_id", receivable.id)
        .order("paid_at", { ascending: true })
    : { data: [] };
  const payments = (paymentData ?? []) as ReceivablePayment[];
  const payment = salePaymentStatus(sale.payment_method, receivable, payments);

  const storeName = account?.company_name || "Sua loja";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const publicUrl = `${siteUrl}/comprovante/${sale.public_token}`;
  const queued = Number(fila || 0);
  const notQueued = Number(semfila || 0);

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
          <Link href="/dashboard/comprovantes" className="text-sm text-ink-muted hover:text-ink">
            ← Comprovantes
          </Link>
          <Link href="/dashboard/vendas" className="text-sm text-amber hover:underline underline-offset-2">
            + Nova venda
          </Link>
        </div>

        {nova && (
          <div className="rounded-2xl border border-good/40 bg-good/10 px-4 py-3 mb-6 text-sm print:hidden">
            <p className="text-ink font-medium">
              Venda {saleNumberLabel(sale.sale_number)} registrada ✓
              {byLink && " — agora mande o link pro cliente"}
            </p>
            <p className="text-ink-muted mt-0.5">
              {byLink
                ? "Quando o cliente pagar pelo link, a venda recebe baixa sozinha e entra no faturamento."
                : pending
                  ? "Lançada em Contas a receber — entra no faturamento quando você der a baixa."
                  : "Já entrou no faturamento."}
              {fila !== undefined &&
                (queued > 0 ? ` ${queued} ${queued === 1 ? "peça foi" : "peças foram"} pra fila de impressão.` : "")}
              {notQueued > 0 && (
                <>
                  {" "}
                  {notQueued} {notQueued === 1 ? "unidade ficou" : "unidades ficaram"} fora da fila (sem receita de
                  impressão ou sem filamento da cor escolhida) —{" "}
                  <Link href="/dashboard/fila" className="text-amber hover:underline">
                    crie na fila
                  </Link>{" "}
                  se precisar.
                </>
              )}
            </p>
          </div>
        )}

        {pending && receivable?.id && !payment.settled && (
          <SaleSettlePanel
            receivableId={receivable.id}
            balance={payment.balance}
            statusLabel={payment.label}
            byLink={byLink}
          />
        )}

        <SaleShareBar
          customerName={sale.customer_name}
          customerPhone={sale.customer_phone}
          storeName={storeName}
          number={saleNumberLabel(sale.sale_number)}
          total={Number(sale.total)}
          publicUrl={publicUrl}
          paymentLinkUrl={receivable?.payment_link_url}
          balanceDue={payment.balance}
        />

        <ReceiptSwitcher {...directSaleReceiptProps(sale as DirectSaleRow, storeName, receivable, payments)} hideBack />
      </div>
    </main>
  );
}
