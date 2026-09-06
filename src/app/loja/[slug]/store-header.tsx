import Link from "next/link";
import { signOut } from "@/lib/auth/actions";

export function StoreHeader({
  storeSlug,
  companyName,
  logoUrl,
  customerEmail,
}: {
  storeSlug: string;
  companyName: string;
  logoUrl: string | null;
  customerEmail: string | null;
}) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href={`/loja/${storeSlug}`} className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-line shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-soft border border-line flex items-center justify-center font-display text-sm text-amber shrink-0">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-display text-lg text-ink truncate">{companyName}</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm shrink-0">
          <Link href={`/loja/${storeSlug}`} className="text-ink-muted hover:text-ink">
            Home
          </Link>
          <Link href={`/loja/${storeSlug}#produtos`} className="text-ink-muted hover:text-ink">
            Catálogo
          </Link>
          {customerEmail ? (
            <div className="flex items-center gap-3">
              <Link href="/loja/conta" className="text-ink-muted hover:text-ink">
                Meus pedidos
              </Link>
              <form action={signOut}>
                <button className="text-ink-muted hover:text-ink">Sair</button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/loja/conta/entrar" className="text-ink-muted hover:text-ink">
                Entrar
              </Link>
              <Link
                href="/loja/conta/cadastro"
                className="bg-amber text-white font-medium rounded-full px-4 py-1.5"
              >
                Cadastrar
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
