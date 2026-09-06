"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, signInWithGoogle } from "@/lib/auth/actions";

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(signUp, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-8">
        <h1 className="font-display text-xl text-ink mb-1">Criar conta</h1>
        <p className="text-sm text-ink-muted mb-6">
          Crie sua conta pra acessar as ferramentas.
        </p>

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 border border-line rounded-lg py-2.5 text-sm font-medium text-ink hover:bg-surface-raised transition mb-5"
          >
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
            <label className="block text-xs font-medium text-ink-muted mb-1">Nome da empresa/loja</label>
            <input name="companyName" type="text" required className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">E-mail</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Senha</label>
            <input name="password" type="password" required minLength={6} className="input" />
          </div>

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-amber text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
          >
            {pending ? "Criando…" : "Criar conta"}
          </button>
        </form>

        <p className="text-sm text-ink-muted mt-6 text-center">
          Já tem conta?{" "}
          <Link href="/login" className="text-amber hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
