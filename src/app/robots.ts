import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://multiferramenta3d.com").replace(/\/$/, "");

// O que o Google pode e não pode indexar: home, vitrine e lojas, sim;
// painel, admin, área do cliente da loja, pedidos e comprovantes, não.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/api", "/auth", "/comprovante", "/loja/conta", "/loja/pedido", "/descadastrar", "/esqueci-senha", "/redefinir-senha"],
    }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
