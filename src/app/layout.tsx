import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AssistantWidget } from "@/components/assistant-widget";

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${bricolage.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-full flex flex-col font-sans bg-paper text-ink">
        {children}
        <AssistantWidget />
      </body>
    </html>
  );
}
