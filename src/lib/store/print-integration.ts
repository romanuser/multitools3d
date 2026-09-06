import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type OrderItem = { productId?: string; description: string; quantity: number };

// ---------------------------------------------------------------------
// Chamado sempre que um pedido da loja vira "PAGAMENTO_CONFIRMADO" (seja
// pelo webhook da InfinitePay ou pelo lojista mudando o status na mão).
// Pra cada item do pedido, olha se o produto tem uma "receita de
// impressão" configurada (impressora + filamento + peso). Se tiver, cria
// uma impressão na fila pra cada unidade comprada. Se não tiver, pula
// esse item silenciosamente — o lojista ainda pode criar na mão.
// ---------------------------------------------------------------------
export async function createPrintJobsForOrder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<any>,
  accountId: string,
  items: OrderItem[]
) {
  const productIds = items.map((i) => i.productId).filter(Boolean) as string[];
  if (!productIds.length) return;

  const { data: products } = await client
    .from("products")
    .select("id, name, print_printer_id, print_filament_id, print_weight_g, print_time_min")
    .in("id", productIds);

  if (!products?.length) return;

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    if (!product.print_printer_id || !product.print_filament_id || !product.print_weight_g) {
      continue; // produto sem receita de impressão configurada — pula
    }

    const quantity = Math.max(1, item.quantity || 1);
    const rows = Array.from({ length: quantity }, () => ({
      account_id: accountId,
      name: product.name,
      printer_id: product.print_printer_id,
      filament_stock_id: product.print_filament_id,
      planned_grams: product.print_weight_g,
      estimated_time_min: product.print_time_min || null,
      status: "fila",
    }));

    await client.from("print_jobs").insert(rows);
  }
}
