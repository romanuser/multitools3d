import { NextRequest, NextResponse } from "next/server";
import { confirmPlanPurchase, getSiteUrl } from "@/lib/plans/infinitepay";
import { confirmStoreOrder } from "@/lib/store/infinitepay";

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
