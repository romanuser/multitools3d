import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAccountPlanStatus, hasFullAccess } from "@/lib/plans/access";
import { StoreSettingsForm } from "./store-settings-form";
import { ProductList } from "./product-list";
import { OrderList } from "./order-list";

export default async function LojaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getAccountPlanStatus(user.id);
  if (!hasFullAccess(plan)) redirect("/dashboard/plano");

  const { data: account } = await supabase
    .from("accounts")
    .select("store_slug, infinitepay_handle, whatsapp_number")
    .eq("id", user.id)
    .maybeSingle();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, description, price, stock, active, image_url, print_printer_id, print_filament_id, print_weight_g, print_time_min"
    )
    .eq("account_id", user.id)
    .order("created_at", { ascending: true });

  const [{ data: printers }, { data: filaments }] = await Promise.all([
    supabase.from("printers").select("id, name").eq("account_id", user.id),
    supabase.from("filament_stock").select("id, material, color").eq("account_id", user.id),
  ]);

  const { data: orders } = await supabase
    .from("store_orders")
    .select("id, customer_name, customer_email, customer_phone, items, total, status, created_at")
    .eq("account_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <h1 className="font-display text-2xl text-ink mt-4 mb-1">Loja virtual</h1>
        <p className="text-sm text-ink-muted mb-8">
          Cadastre seus produtos e compartilhe o link da sua loja com os clientes. As vendas caem
          direto na sua conta InfinitePay.
        </p>

        <section className="mb-10">
          <h2 className="font-display text-lg text-ink mb-3">Configurações da loja</h2>
          {account?.store_slug && (
            <p className="text-sm text-ink-muted mb-3">
              Link da sua loja:{" "}
              <Link href={`/loja/${account.store_slug}`} target="_blank" className="text-amber hover:underline">
                {siteUrl}/loja/{account.store_slug}
              </Link>
            </p>
          )}
          <StoreSettingsForm
            initialSlug={account?.store_slug ?? ""}
            initialHandle={account?.infinitepay_handle ?? ""}
            initialWhatsapp={account?.whatsapp_number ?? ""}
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-ink">Produtos</h2>
            <span className="text-xs text-ink-muted">{products?.length ?? 0} de 300</span>
          </div>
          <ProductList
            products={products ?? []}
            printers={printers ?? []}
            filaments={(filaments ?? []).map((f) => ({ id: f.id, label: `${f.material} · ${f.color}` }))}
          />
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg text-ink mb-3">Pedidos recebidos</h2>
          <OrderList orders={orders ?? []} />
        </section>
      </div>
    </main>
  );
}
