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

  // Produtos com mais de um filamento na receita — os com só 1 usam
  // direto as colunas acima (print_filament_id/print_weight_g).
  const { data: multiRows } = await client
    .from("product_filaments")
    .select("product_id, filament_stock_id, grams")
    .in("product_id", productIds);

  const multiByProduct = new Map<string, { filament_stock_id: string; grams: number }[]>();
  for (const row of multiRows ?? []) {
    const list = multiByProduct.get(row.product_id) ?? [];
    list.push(row);
    multiByProduct.set(row.product_id, list);
  }

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;

    const multiFilaments = multiByProduct.get(product.id) ?? [];
    const hasRecipe = multiFilaments.length
      ? !!product.print_printer_id
      : !!(product.print_printer_id && product.print_filament_id && product.print_weight_g);
    if (!hasRecipe) continue; // produto sem receita de impressão configurada — pula

    const quantity = Math.max(1, item.quantity || 1);

    for (let i = 0; i < quantity; i++) {
      const { data: job, error } = await client
        .from("print_jobs")
        .insert({
          account_id: accountId,
          name: product.name,
          printer_id: product.print_printer_id,
          filament_stock_id: multiFilaments.length ? null : product.print_filament_id,
          planned_grams: multiFilaments.length ? null : product.print_weight_g,
          estimated_time_min: product.print_time_min || null,
          status: "fila",
        })
        .select("id")
        .single();

      if (error || !job) continue;

      if (multiFilaments.length) {
        await client.from("print_job_filaments").insert(
          multiFilaments.map((f) => ({
            job_id: job.id,
            filament_stock_id: f.filament_stock_id,
            planned_grams: f.grams,
          }))
        );
      }
    }
  }
}
