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
      <body className="min-h-full flex flex-col font-sans bg-paper text-ink">
        {children}
        <AssistantWidget />
        <InstallPrompt />
      </body>
    </html>
  );
}
