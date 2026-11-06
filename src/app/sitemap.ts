import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { urlTopico } from "@/lib/comunidade/config";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://multiferramenta3d.com").replace(/\/$/, "");
export const revalidate = 3600;   // atualiza o mapa a cada 1 hora

// Mapa do site pro Google: páginas públicas + lojas virtuais que têm produto.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/vitrine`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/ofertas`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE}/cadastro`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/comunidade`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE}/comunidade/calibracao`, changeFrequency: "daily", priority: 0.7 },
  ];
  try {
    const admin = createAdminClient();
    const [{ data: accounts }, { data: products }] = await Promise.all([
      admin.from("accounts").select("id, store_slug").not("store_slug", "is", null).limit(5000),
      admin.from("products").select("account_id").limit(50000),
    ]);
    const withProducts = new Set((products ?? []).map((p) => p.account_id));
    // cada pergunta da comunidade vira uma página que o Google encontra
    const { data: topicos } = await admin.from("forum_topicos").select("id, titulo, ultima_atividade").eq("oculto", false).order("ultima_atividade", { ascending: false }).limit(5000);
    for (const t of topicos ?? []) pages.push({ url: `${SITE}${urlTopico(t)}`, lastModified: t.ultima_atividade, changeFrequency: "weekly", priority: 0.6 });
    for (const a of accounts ?? []) {
      if (withProducts.has(a.id)) pages.push({ url: `${SITE}/loja/${a.store_slug}`, changeFrequency: "daily", priority: 0.7 });
    }
  } catch { /* sem banco no build: segue só com as páginas fixas */ }
  return pages;
}
