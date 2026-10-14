import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DirectSaleForm, type SaleProduct } from "./direct-sale-form";
import { readPricingParams } from "@/lib/quotes/calc";

export default async function VendaDiretaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: products }, { data: filaments }, { data: printers }, { data: account }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, price, category, available_colors, print_printer_id, print_filament_id, print_weight_g, print_time_min, color_filament_material, color_filament_grams"
      )
      .eq("account_id", user.id)
      .order("name", { ascending: true }),
    supabase.from("filament_stock").select("id, material, color, cost_per_kg").eq("account_id", user.id),
    supabase.from("printers").select("id, name").eq("account_id", user.id),
    supabase.from("accounts").select("infinitepay_handle, pricing_params").eq("id", user.id).maybeSingle(),
  ]);

  // Receitas detalhadas (vários filamentos e multipartes) pra estimar o custo.
  const productIds = (products ?? []).map((p) => p.id);
  const [{ data: filamentRows }, { data: partRows }] = productIds.length
    ? await Promise.all([
        supabase.from("product_filaments").select("product_id, filament_stock_id, grams").in("product_id", productIds),
        supabase
          .from("product_parts")
          .select("product_id, filament_stock_id, color_material, grams, print_time_min")
          .in("product_id", productIds),
      ])
    : [{ data: [] }, { data: [] }];

  type FilamentRow = { product_id: string; filament_stock_id: string; grams: number };
  type PartRow = {
    product_id: string;
    filament_stock_id: string | null;
    color_material: string | null;
    grams: number | null;
    print_time_min: number | null;
  };

  const saleProducts: SaleProduct[] = (products ?? []).map((p) => ({
    ...p,
    available_colors: p.available_colors ?? [],
    filament_rows: ((filamentRows ?? []) as FilamentRow[]).filter((r) => r.product_id === p.id),
    parts: ((partRows ?? []) as PartRow[]).filter((r) => r.product_id === p.id),
  }));

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mb-1">Venda direta</h1>
            <p className="text-sm text-ink-muted max-w-xl">
              Venda no balcão, no WhatsApp ou na feira. A venda entra no faturamento, as peças vão pra fila de
              impressão e o comprovante fica salvo em Comprovantes, pronto pra mandar pro cliente.
            </p>
          </div>
          <Link
            href="/dashboard/comprovantes?origem=venda"
            className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 hover:bg-amber-soft transition-colors whitespace-nowrap"
          >
            Vendas registradas →
          </Link>
        </div>

        <DirectSaleForm
          products={saleProducts}
          filaments={filaments ?? []}
          printers={printers ?? []}
          hasInfinitepay={!!account?.infinitepay_handle}
          pricingParams={readPricingParams(account?.pricing_params)}
        />
      </div>
    </main>
  );
}
