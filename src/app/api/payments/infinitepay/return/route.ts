import { NextRequest, NextResponse } from "next/server";
import { confirmPlanPurchase, getSiteUrl } from "@/lib/plans/infinitepay";
import { confirmReceivablePayment, confirmStoreOrder } from "@/lib/store/infinitepay";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------
// Pra onde a InfinitePay manda o usuário de volta depois de pagar (ou
// cancelar). O webhook é a fonte confiável de confirmação, mas aqui a
// gente já tenta confirmar na hora também, pra não deixar o usuário
// vendo "pendente" por vários segundos esperando o webhook chegar.
// ---------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const orderNsu = String(params.get("order_nsu") || "");
  const transactionNsu = String(params.get("transaction_nsu") || "");
  const slug = String(params.get("slug") || params.get("invoice_slug") || "");

  try {
    if (orderNsu.startsWith("order_")) {
      const orderId = orderNsu.replace(/^order_/, "");
      const destination = new URL(`/loja/pedido/${orderId}`, getSiteUrl());
      if (orderId && transactionNsu && slug) {
        const result = await confirmStoreOrder({ orderId, transactionNsu, slug });
        destination.searchParams.set("pagamento", result.paid ? "confirmado" : "pendente");
      } else {
        destination.searchParams.set("pagamento", "incompleto");
      }
      return NextResponse.redirect(destination);
    }

    if (orderNsu.startsWith("receivable_")) {
      // Cliente pagou uma cobrança: confirma na hora e manda pro recibo
      // da venda (se a cobrança veio de uma venda fiado).
      const receivableId = orderNsu.replace(/^receivable_/, "");
      let paid = false;
      if (receivableId && transactionNsu && slug) {
        paid = (
          await confirmReceivablePayment({
            receivableId,
            transactionNsu,
            slug,
            captureMethod: params.get("capture_method"),
            installments: Number(params.get("installments") || 0) || null,
            receiptUrl: params.get("receipt_url"),
          })
        ).paid;
      }
      const admin = createAdminClient();
      const { data: receivable } = await admin
        .from("accounts_receivable")
        .select("direct_sale_id")
        .eq("id", receivableId)
        .maybeSingle();
      const { data: sale } = receivable?.direct_sale_id
        ? await admin.from("direct_sales").select("public_token").eq("id", receivable.direct_sale_id).maybeSingle()
        : { data: null };
      const destination = new URL(sale ? `/comprovante/${sale.public_token}` : "/", getSiteUrl());
      destination.searchParams.set("pagamento", paid ? "confirmado" : "pendente");
      return NextResponse.redirect(destination);
    }

    const destination = new URL("/dashboard/plano", getSiteUrl());
    if (!orderNsu || !transactionNsu || !slug) {
      destination.searchParams.set("pagamento", "incompleto");
      return NextResponse.redirect(destination);
    }

    if (orderNsu.startsWith("plan_")) {
      const purchaseId = orderNsu.replace(/^plan_/, "");
      const result = await confirmPlanPurchase({ purchaseId, transactionNsu, slug });
      destination.searchParams.set("pagamento", result.paid ? "confirmado" : "pendente");
    }
    return NextResponse.redirect(destination);
  } catch (error) {
    console.error("InfinitePay return:", error);
    const destination = new URL("/dashboard/plano", getSiteUrl());
    destination.searchParams.set("pagamento", "erro");
    return NextResponse.redirect(destination);
  }
}
