import type { Metadata } from "next";
import "./globals.css";
import { AssistantWidget } from "@/components/assistant-widget";

export const metadata: Metadata = {
  title: "Multiferramenta 3D",
  description: "Painel de ferramentas para quem trabalha com impressão 3D",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-paper text-ink">
        {children}
        <AssistantWidget />
      </body>
    </html>
  );
}
