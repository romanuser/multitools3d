import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AssistantWidget } from "@/components/assistant-widget";
import { InstallPrompt } from "@/components/install-prompt";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Multiferramenta 3D",
    template: "%s | Multiferramenta 3D",
  },
  description:
    "Orçamento, estoque de filamento, impressoras, fila de impressão e loja virtual num painel só, para quem vive de impressão 3D.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // "apple-mobile-web-app-capable": some navegadores antigos só leem essa
  // meta tag específica da Apple, mesmo com o manifest presente.
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Multiferramenta 3D",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c1110",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${bricolage.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <head>
        {/* Verificação de propriedade do site pro Google AdSense — a
            metatag e o ads.txt (em public/ads.txt) não exibem anúncio
            nenhum, só provam que o site é seu, por isso ficam aqui no
            layout raiz, valendo pra TODA página sem problema nenhum.
            O SCRIPT que exibe anúncio de verdade NÃO fica aqui — ele vai
            só nas páginas com conteúdo público de verdade (home e lojas
            com produto cadastrado) — o Google proíbe anúncio em tela sem
            conteúdo (login, cadastro, painel vazio, loja sem produto,
            telas internas atrás de login). */}
        <meta name="google-adsense-account" content="ca-pub-8764465578125903" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-paper text-ink">
        {/* Aplica o tema salvo ANTES do primeiro paint, pra não piscar o
            tema errado por uma fração de segundo ao carregar a página. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("mf3d-theme");if(t==="light")document.documentElement.setAttribute("data-theme","light");}catch(e){}`,
          }}
        />
        {children}
        <AssistantWidget />
        <InstallPrompt />
      </body>
    </html>
  );
}
