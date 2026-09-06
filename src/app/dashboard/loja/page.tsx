import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAccountPlanStatus, hasFullAccess } from "@/lib/plans/access";
import { StoreSettingsForm } from "./store-settings-form";
import { ShippingSettingsForm } from "./shipping-settings-form";
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
    .select(
      "store_slug, infinitepay_handle, whatsapp_number, shipping_origin_cep, default_package_weight, default_package_width, default_package_height, default_package_length"
    )
    .eq("id", user.id)
    .maybeSingle();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, description, price, stock, active, image_url, print_printer_id, print_filament_id, print_weight_g, print_time_min, shipping_weight, shipping_width, shipping_height, shipping_length"
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

  const { data: messages } = orders?.length
    ? await supabase
        .from("order_messages")
        .select("id, order_id, sender_role, sender_name, text, created_at")
        .in(
          "order_id",
          orders.map((o) => o.id)
        )
        .order("created_at", { ascending: true })
    : { data: [] };

  const ordersWithMessages = (orders ?? []).map((order) => ({
    ...order,
    messages: (messages ?? []).filter((m) => m.order_id === order.id),
  }));

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

        <section className="mb-10">
          <h2 className="font-display text-lg text-ink mb-3">Frete automático</h2>
          <p className="text-sm text-ink-muted mb-3">
            O cálculo é feito pela plataforma — você só precisa informar de onde envia e as
            medidas padrão da embalagem.
          </p>
          <ShippingSettingsForm
            initialCep={account?.shipping_origin_cep ?? ""}
            initialWeight={account?.default_package_weight?.toString() ?? ""}
            initialWidth={account?.default_package_width?.toString() ?? ""}
            initialHeight={account?.default_package_height?.toString() ?? ""}
            initialLength={account?.default_package_length?.toString() ?? ""}
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
          <OrderList orders={ordersWithMessages} />
        </section>
      </div>
    </main>
  );
}
