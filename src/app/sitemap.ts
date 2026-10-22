import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://multiferramenta3d.com").replace(/\/$/, "");
export const revalidate = 3600;   // atualiza o mapa a cada 1 hora

// Mapa do site pro Google: páginas públicas + lojas virtuais que têm produto.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/vitrine`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/cadastro`, changeFrequency: "monthly", priority: 0.6 },
  ];
  try {
    const admin = createAdminClient();
    const [{ data: accounts }, { data: products }] = await Promise.all([
      admin.from("accounts").select("id, store_slug").not("store_slug", "is", null).limit(5000),
      admin.from("products").select("account_id").limit(50000),
    ]);
    const withProducts = new Set((products ?? []).map((p) => p.account_id));
    for (const a of accounts ?? []) {
      if (withProducts.has(a.id)) pages.push({ url: `${SITE}/loja/${a.store_slug}`, changeFrequency: "daily", priority: 0.7 });
    }
  } catch { /* sem banco no build: segue só com as páginas fixas */ }
  return pages;
}
