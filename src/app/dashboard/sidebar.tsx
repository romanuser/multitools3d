"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";

type NavItem = { href: string; label: string; icon: string; locked?: boolean };

export function DashboardSidebar({
  companyName,
  logoUrl,
  planLabel,
  hasVip,
  isAdmin,
}: {
  companyName: string;
  logoUrl: string | null;
  planLabel: string;
  hasVip: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha a gaveta sozinha sempre que o usuário navega pra outra página.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const mainItems: NavItem[] = [
    { href: "/dashboard", label: "Ferramentas", icon: "▦" },
    { href: "/dashboard/painel", label: "Painel geral", icon: "◫" },
  ];

  const freeItems: NavItem[] = [
    { href: "/dashboard/orcamentos", label: "Orçamentos", icon: "◆" },
    { href: "/dashboard/estoque", label: "Estoque", icon: "▤" },
    { href: "/dashboard/impressoras", label: "Impressoras", icon: "⎔" },
    { href: "/dashboard/fila", label: "Fila de impressão", icon: "▶" },
    { href: "/dashboard/gerador-stl-curvo", label: "Gerador de texto STL", icon: "✎" },
    { href: "/dashboard/modelador-3d", label: "Modelador 3D", icon: "◱" },
    { href: "/dashboard/foto-para-3d", label: "Foto → Modelo 3D", icon: "◐" },
  ];

  const vipItems: NavItem[] = [{ href: "/dashboard/loja", label: "Loja virtual", icon: "◈", locked: !hasVip }];

  const accountItems: NavItem[] = [
    { href: "/dashboard/empresa", label: "Dados da empresa", icon: "⚙" },
    { href: "/dashboard/plano", label: "Plano", icon: "◉" },
  ];

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href);
  }

  function Item({ href, label, icon, locked }: NavItem) {
    const active = isActive(href);
    return (
      <Link
        href={locked ? "/dashboard/plano" : href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          active ? "bg-surface-raised text-ink font-medium" : "text-ink-muted hover:text-ink hover:bg-surface-raised/60"
        }`}
      >
        <span className="w-4 text-center shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
        {locked && <span className="ml-auto text-[10px] text-amber shrink-0">VIP</span>}
      </Link>
    );
  }

  const navContent = (
    <>
      <div className="p-4 flex items-center gap-3 border-b border-line">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-line shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-amber-soft border border-line flex items-center justify-center text-sm text-amber shrink-0">
            {companyName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink truncate">{companyName}</p>
          <p className="text-xs text-ink-muted">{planLabel}</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-ink-muted hover:text-ink text-xl leading-none shrink-0"
          aria-label="Fechar menu"
        >
          ×
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <Item key={item.href} {...item} />
          ))}
        </div>

        <div>
          <p className="px-3 text-[10px] uppercase tracking-wide text-ink-muted mb-1">Ferramentas</p>
          <div className="space-y-0.5">
            {freeItems.map((item) => (
              <Item key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-[10px] uppercase tracking-wide text-ink-muted mb-1">Plano VIP</p>
          <div className="space-y-0.5">
            {vipItems.map((item) => (
              <Item key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-[10px] uppercase tracking-wide text-ink-muted mb-1">Conta</p>
          <div className="space-y-0.5">
            {accountItems.map((item) => (
              <Item key={item.href} {...item} />
            ))}
            {isAdmin && <Item href="/admin" label="Admin" icon="◎" />}
          </div>
        </div>
      </nav>

      <form action={signOut} className="p-3 border-t border-line">
        <button className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-surface-raised/60 transition-colors">
          <span className="w-4 text-center shrink-0">⏻</span>
          Sair
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* Barra de topo só no celular, com botão de abrir o menu */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-surface sticky top-0 z-30">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-ink text-xl leading-none"
          aria-label="Abrir menu"
        >
          ☰
        </button>
        <span className="text-sm text-ink-muted truncate">{companyName}</span>
        <span className="w-5" />
      </div>

      {/* Gaveta do menu no celular */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 max-w-[80vw] bg-surface border-r border-line h-full flex flex-col">
            {navContent}
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Menu fixo normal no computador */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-line bg-surface flex-col h-screen sticky top-0">
        {navContent}
      </aside>
    </>
  );
}
