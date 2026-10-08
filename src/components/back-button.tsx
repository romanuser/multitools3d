import Link from "next/link";
import { Icon } from "./icons";

// ---------------------------------------------------------------------
// Botão de voltar de verdade (em vez do linkzinho de texto "← Painel"),
// usado em toda tela do sistema que precisa de um caminho pra voltar.
// ---------------------------------------------------------------------
export function BackButton({ href, label = "Voltar" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-ink-muted bg-surface border border-line rounded-full pl-2.5 pr-4 py-1.5 hover:border-amber/50 hover:text-ink transition-colors"
    >
      <Icon name="chevron" size={14} className="rotate-180" />
      {label}
    </Link>
  );
}
