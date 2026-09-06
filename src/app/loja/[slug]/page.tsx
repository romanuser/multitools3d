import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store/checkout-actions";
import { Storefront } from "./storefront";

export default async function LojaPublicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) notFound();

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, price, stock, image_url")
    .eq("account_id", store.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  return (
    <Storefront
      accountId={store.id}
      companyName={store.companyName || "Loja"}
      logoUrl={store.logoUrl}
      products={products ?? []}
    />
  );
}
