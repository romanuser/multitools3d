"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signInWithGoogle } from "@/lib/auth/actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-8">
        <h1 className="font-display text-xl text-ink mb-1">Entrar</h1>
        <p className="text-sm text-ink-muted mb-6">Acesse o painel da sua ferramenta 3D.</p>

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 border border-line rounded-lg py-2.5 text-sm font-medium text-ink hover:bg-surface-raised transition mb-5"
          >
            <GoogleIcon />
            Continuar com Google
          </button>
        </form>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-px bg-line flex-1" />
          <span className="text-xs text-ink-muted">ou com e-mail</span>
          <div className="h-px bg-line flex-1" />
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">E-mail</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Senha</label>
            <input name="password" type="password" required className="input" />
          </div>

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-amber text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-sm text-ink-muted mt-6 text-center">
          Não tem conta?{" "}
          <Link href="/cadastro" className="text-amber hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2 1.5-4.6 2.7-7.7 2.7-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.4 36.4 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}
