"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { Icon, type IconName } from "./icons";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/loja/conta", label: "Meus pedidos", icon: "layers" },
  { href: "/loja/conta/comprovantes", label: "Comprovantes", icon: "quote" },
  { href: "/loja/conta/dados", label: "Dados cadastrais", icon: "building" },
];

export function CustomerSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    return href === "/loja/conta" ? pathname === "/loja/conta" : pathname?.startsWith(href);
  }

  const nav = (
    <>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <Link href="/" aria-label="Multiferramenta 3D, início">
          <Brand size={26} />
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-ink-muted hover:text-ink"
          aria-label="Fechar menu"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="mx-3 mb-3 rounded-xl border border-line bg-paper/60 p-2.5">
        <p className="text-sm text-ink truncate">{email}</p>
        <p className="text-xs text-ink-muted">Sua conta de cliente</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5" aria-label="Menu da conta">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-surface-raised text-ink font-medium" : "text-ink-muted hover:text-ink hover:bg-surface-raised/60"
              }`}
            >
              <Icon name={item.icon} className={`shrink-0 ${active ? "text-amber" : ""}`} />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-3 mt-3 border-t border-line">
          <Link
            href="/vitrine"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-surface-raised/60 transition-colors"
          >
            <Icon name="search" className="shrink-0" />
            Pesquisar lojas
          </Link>
        </div>
      </nav>

      <div className="p-3 border-t border-line space-y-0.5">
        <ThemeToggle />
        <form action={signOut}>
          <button className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-surface-raised/60 transition-colors">
            <Icon name="logout" className="shrink-0" />
            Sair
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-surface/90 backdrop-blur sticky top-0 z-30">
        <button onClick={() => setMobileOpen(true)} className="text-ink" aria-label="Abrir menu">
          <Icon name="menu" size={22} />
        </button>
        <span className="text-sm text-ink-muted truncate">{email}</span>
        <span className="w-[22px]" />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85vw] bg-surface border-r border-line h-full flex flex-col">{nav}</div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <aside className="hidden md:flex w-64 shrink-0 border-r border-line bg-surface flex-col h-screen sticky top-0">
        {nav}
      </aside>
    </>
  );
}
