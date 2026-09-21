"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { FEATURES } from "@/lib/features";
import { Icon, type IconName } from "@/components/icons";
import { Brand } from "@/components/brand";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  locked?: boolean;
  // Ferramenta ainda em construção: aparece no menu, mas não abre.
  soon?: boolean;
};

function isActive(pathname: string | null, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : Boolean(pathname?.startsWith(href));
}

function NavLink({ href, label, icon, locked, soon, pathname }: NavItem & { pathname: string | null }) {
  if (soon) {
    return (
      <div
        aria-disabled="true"
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted/70 cursor-not-allowed select-none"
      >
        <Icon name={icon} className="shrink-0" />
        <span className="min-w-0">
          <span className="block truncate leading-tight">{label}</span>
          <span className="block text-[11px] leading-tight text-warn/90">Em desenvolvimento</span>
        </span>
      </div>
    );
  }

  const active = isActive(pathname, href);
  return (
    <Link
      href={locked ? "/dashboard/plano" : href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-surface-raised text-ink font-medium" : "text-ink-muted hover:text-ink hover:bg-surface-raised/60"
      }`}
    >
      <Icon name={icon} className={`shrink-0 ${active ? "text-amber" : ""}`} />
      <span className="truncate">{label}</span>
      {locked && (
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber/30 px-1.5 py-0.5 text-[10px] font-medium text-amber shrink-0">
          <Icon name="lock" size={10} />
          VIP
        </span>
      )}
    </Link>
  );
}

function NavSection({ title, items, pathname }: { title: string; items: NavItem[]; pathname: string | null }) {
  return (
    <div>
      <p className="px-3 text-xs text-ink-muted/80 mb-1.5">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

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
    { href: "/dashboard", label: "Ferramentas", icon: "grid" },
    { href: "/dashboard/painel", label: "Painel geral", icon: "panel" },
  ];

  const manageItems: NavItem[] = [
    { href: "/dashboard/orcamentos", label: "Orçamentos", icon: "quote" },
    { href: "/dashboard/estoque", label: "Estoque", icon: "spool" },
    { href: "/dashboard/impressoras", label: "Impressoras", icon: "printer" },
    { href: "/dashboard/fila", label: "Fila de impressão", icon: "layers" },
  ];

  const createItems: NavItem[] = [
    { href: "/dashboard/gerador-stl-curvo", label: "Gerador de texto STL", icon: "type" },
    { href: "/dashboard/modelador-3d", label: "Modelador 3D", icon: "cube" },
    { href: "/dashboard/foto-para-3d", label: "Foto → Modelo 3D", icon: "camera", soon: !FEATURES.photoTo3D },
  ];

  const vipItems: NavItem[] = [{ href: "/dashboard/loja", label: "Loja virtual", icon: "store", locked: !hasVip }];

  const accountItems: NavItem[] = [
    { href: "/dashboard/empresa", label: "Dados da empresa", icon: "building" },
    { href: "/dashboard/plano", label: "Plano", icon: "star" },
  ];

  const navContent = (
    <>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <Link href="/dashboard" aria-label="Multiferramenta 3D, ir para as ferramentas">
          <Brand size={26} />
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-ink-muted hover:text-ink shrink-0"
          aria-label="Fechar menu"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-line bg-paper/60 p-2.5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-line shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-amber-soft border border-line flex items-center justify-center text-sm font-medium text-amber shrink-0">
            {companyName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink truncate">{companyName}</p>
          <p className={`text-xs ${hasVip ? "text-amber" : "text-ink-muted"}`}>{planLabel}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5" aria-label="Menu principal">
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </div>

        <NavSection title="Gestão" items={manageItems} pathname={pathname} />
        <NavSection title="Criação 3D" items={createItems} pathname={pathname} />
        <NavSection title="Vendas" items={vipItems} pathname={pathname} />

        <div>
          <p className="px-3 text-xs text-ink-muted/80 mb-1.5">Conta</p>
          <div className="space-y-0.5">
            {accountItems.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
            {isAdmin && <NavLink href="/admin" label="Admin" icon="shield" pathname={pathname} />}
          </div>
        </div>
      </nav>

      <form action={signOut} className="p-3 border-t border-line">
        <button className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-surface-raised/60 transition-colors">
          <Icon name="logout" className="shrink-0" />
          Sair
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* Barra de topo só no celular, com botão de abrir o menu */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-surface/90 backdrop-blur sticky top-0 z-30">
        <button onClick={() => setMobileOpen(true)} className="text-ink" aria-label="Abrir menu">
          <Icon name="menu" size={22} />
        </button>
        <span className="text-sm text-ink-muted truncate">{companyName}</span>
        <span className="w-[22px]" />
      </div>

      {/* Gaveta do menu no celular */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85vw] bg-surface border-r border-line h-full flex flex-col">{navContent}</div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Menu fixo normal no computador */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-line bg-surface flex-col h-screen sticky top-0">
        {navContent}
      </aside>
    </>
  );
}
