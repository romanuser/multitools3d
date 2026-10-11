import { NextRequest, NextResponse } from "next/server";
import { confirmPlanPurchase } from "@/lib/plans/infinitepay";
import { confirmReceivablePayment, confirmStoreOrder } from "@/lib/store/infinitepay";

// ---------------------------------------------------------------------
// A InfinitePay chama essa rota direto dos servidores dela, sem nenhum
// usuário logado — por isso a confirmação usa a service_role key (veja
// src/lib/supabase/admin.ts), não o cliente comum.
//
// order_nsu com prefixo "plan_" -> compra de plano VIP (paga pra você).
// order_nsu com prefixo "order_" -> venda da loja de um assinante (paga
// direto pra ele, usando a InfiniteTag própria dele).
// order_nsu com prefixo "receivable_" -> link de cobrança de uma conta a
// receber (venda fiado ou consignado): dá baixa sozinha.
// ---------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const orderNsu = String(body.order_nsu || body.orderNsu || "").trim();
    const transactionNsu = String(body.transaction_nsu || body.transactionNsu || "").trim();
    const slug = String(body.invoice_slug || body.invoiceSlug || body.slug || "").trim();

    if (!orderNsu || !transactionNsu || !slug) {
      return NextResponse.json(
        { success: false, message: "Dados incompletos." },
        { status: 400 }
      );
    }

    if (orderNsu.startsWith("plan_")) {
      const purchaseId = orderNsu.replace(/^plan_/, "");
      const result = await confirmPlanPurchase({ purchaseId, transactionNsu, slug });
      return NextResponse.json({ success: true, paid: result.paid }, { status: 200 });
    }

    if (orderNsu.startsWith("order_")) {
      const orderId = orderNsu.replace(/^order_/, "");
      const result = await confirmStoreOrder({ orderId, transactionNsu, slug });
      return NextResponse.json({ success: true, paid: result.paid }, { status: 200 });
    }

    if (orderNsu.startsWith("receivable_")) {
      const receivableId = orderNsu.replace(/^receivable_/, "");
      const result = await confirmReceivablePayment({
        receivableId,
        transactionNsu,
        slug,
        captureMethod: String(body.capture_method || body.captureMethod || "") || null,
        installments: Number(body.installments || 0) || null,
        receiptUrl: String(body.receipt_url || body.receiptUrl || "") || null,
      });
      return NextResponse.json({ success: true, paid: result.paid }, { status: 200 });
    }

    return NextResponse.json(
      { success: false, message: "Tipo de pedido desconhecido." },
      { status: 400 }
    );
  } catch (error) {
    console.error("InfinitePay webhook:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Erro no webhook." },
      { status: 400 }
    );
  }
}
