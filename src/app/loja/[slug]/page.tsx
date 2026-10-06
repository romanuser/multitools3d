import { notFound } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store/checkout-actions";
import { Storefront } from "./storefront";

export default async function LojaPublicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) notFound();

  const supabase = await createClient();
  const [{ data: products }, { data: userData }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, description, price, stock, image_url, available_colors, customizable, customization_price, category, print_time_min")
      .eq("account_id", store.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  // Anúncio só entra se a loja tiver produto de verdade pra mostrar — uma
  // loja vazia conta como "tela sem conteúdo" pra política do Google, o
  // mesmo motivo que já corrigimos na home.
  const hasRealContent = (products?.length ?? 0) > 0;

  return (
    <>
      {hasRealContent && (
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8764465578125903"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
      <Storefront
        accountId={store.id}
        storeSlug={slug}
        companyName={store.companyName || "Loja"}
        logoUrl={store.logoUrl}
        products={products ?? []}
        customerEmail={userData.user?.email ?? null}
      />
    </>
  );
}
