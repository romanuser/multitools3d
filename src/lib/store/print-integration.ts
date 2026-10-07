import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type OrderItem = { productId?: string; description: string; quantity: number; color?: string | null };

// ---------------------------------------------------------------------
// Chamado pra cada pedido da loja, assim que ele é criado (não espera o
// pagamento confirmar). Pra cada item do pedido, olha se o produto tem
// uma "receita de impressão" configurada. Se tiver, cria uma impressão
// na fila pra cada unidade comprada. Se não tiver, pula esse item
// silenciosamente — o lojista ainda pode criar na mão.
//
// Produto COM cor: a receita é só material + gramagem — aqui a gente
// resolve o filamento de VERDADE casando esse material com a cor que o
// cliente escolheu, dentro do estoque de filamento da loja. Se não
// achar um filamento cadastrado com esse material+cor, pula o item (não
// dá pra descontar de um estoque que não existe).
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
    .select(
      "id, name, print_printer_id, print_filament_id, print_weight_g, print_time_min, color_filament_material, color_filament_grams"
    )
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

  // Precisa do estoque de filamento inteiro da loja só quando tiver pelo
  // menos um produto com receita "por cor" entre os itens do pedido.
  const needsColorLookup = products.some((p) => p.color_filament_material && p.color_filament_grams);
  let filamentStock: { id: string; material: string; color: string }[] = [];
  if (needsColorLookup) {
    const { data } = await client.from("filament_stock").select("id, material, color").eq("account_id", accountId);
    filamentStock = data ?? [];
  }

  function findColorFilament(material: string, color: string) {
    const norm = (s: string) => s.trim().toLowerCase();
    return filamentStock.find((f) => norm(f.material) === norm(material) && norm(f.color) === norm(color));
  }

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;

    const quantity = Math.max(1, item.quantity || 1);
    const usesColorRecipe = !!(product.color_filament_material && product.color_filament_grams);

    // --- Produto com cor: resolve o filamento exato pela escolha do cliente ---
    if (usesColorRecipe) {
      if (!product.print_printer_id || !item.color) continue; // receita incompleta, ou pedido sem cor registrada

      const matched = findColorFilament(product.color_filament_material!, item.color);
      if (!matched) continue; // não tem esse material+cor cadastrado no estoque — não dá pra descontar

      for (let i = 0; i < quantity; i++) {
        await client.from("print_jobs").insert({
          account_id: accountId,
          name: `${product.name} (${item.color})`,
          printer_id: product.print_printer_id,
          filament_stock_id: matched.id,
          planned_grams: product.color_filament_grams,
          estimated_time_min: product.print_time_min || null,
          status: "fila",
        });
      }
      continue;
    }

    // --- Produto sem cor: receita fixa, do jeito de sempre ---
    const multiFilaments = multiByProduct.get(product.id) ?? [];
    const hasRecipe = multiFilaments.length
      ? !!product.print_printer_id
      : !!(product.print_printer_id && product.print_filament_id && product.print_weight_g);
    if (!hasRecipe) continue;

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
