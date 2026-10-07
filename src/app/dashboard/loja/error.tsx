"use client";

import { useEffect } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------
// Se qualquer coisa der errado ao carregar a Loja virtual, o Next.js usa
// esta tela em vez de uma página de erro genérica — e, mais importante,
// registra o erro de verdade nos logs do servidor (Function logs da
// Netlify), que é exatamente o que precisávamos pra achar a causa real.
// ---------------------------------------------------------------------
export default function LojaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[dashboard/loja] erro ao renderizar:", error);
  }, [error]);

  return (
    <main className="min-h-screen px-6 py-12 flex items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold text-ink mb-2">Algo deu errado na Loja virtual</h1>
        <p className="text-sm text-ink-muted mb-1">
          Isso já foi registrado automaticamente. Tenta de novo, ou volta pro painel.
        </p>
        {error.digest && <p className="text-xs text-ink-muted mb-6">Código: {error.digest}</p>}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            onClick={reset}
            className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm"
          >
            Tentar de novo
          </button>
          <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
            ← Voltar pro painel
          </Link>
        </div>
      </div>
    </main>
  );
}
