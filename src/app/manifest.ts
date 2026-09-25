import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Multiferramenta 3D",
    short_name: "Multiferramenta 3D",
    description:
      "Orçamento, estoque de filamento, impressoras, fila de impressão e loja virtual num painel só.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c1110",
    theme_color: "#0c1110",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
