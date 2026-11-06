import Link from "next/link";
import { Brand } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";

// Cabeçalho da Comunidade (páginas públicas: qualquer um lê; pra participar, entra com a conta)
export default async function ComunidadeLayout({ children }: { children: React.ReactNode }) {
  let logado = false;
  try { const { data } = await (await createClient()).auth.getUser(); logado = !!data.user; } catch { /* sem sessão */ }
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <Link href="/" aria-label="Multiferramenta 3D, início"><Brand /></Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/comunidade" className="text-ink-muted hover:text-ink">Comunidade</Link>
            <Link href="/comunidade/calibracao" className="text-ink-muted hover:text-ink">Calibração</Link>
            <Link href={logado ? "/dashboard" : "/login?volta=/comunidade"} className="font-medium text-amber hover:underline">{logado ? "Meu painel" : "Entrar"}</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-line/70 py-8 text-center text-xs text-ink-muted">
        Comunidade Multiferramenta 3D · seja gentil e ajude quem está começando ·{" "}
        <Link href="/cadastro" className="text-amber hover:underline">crie sua conta grátis</Link>
      </footer>
    </div>
  );
}
