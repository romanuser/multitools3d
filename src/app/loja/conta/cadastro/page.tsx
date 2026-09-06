"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ContaCadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/loja/conta/callback`,
      },
    });
    if (error) {
      setErrorMsg(error.message.includes("already registered") ? "Já existe uma conta com esse e-mail." : error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-surface border border-line rounded-2xl p-8">
        <h1 className="font-display text-xl text-ink mb-1">Criar conta</h1>
        <p className="text-sm text-ink-muted mb-6">Acompanhe seus pedidos em qualquer loja do Multiferramenta 3D.</p>

        {status === "sent" ? (
          <p className="text-sm text-good">
            Confira seu e-mail e clique no link de confirmação pra ativar sua conta.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-xs font-medium text-ink-muted mb-1">Nome</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink-muted mb-1">E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink-muted mb-1">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input"
              />
            </label>
            {status === "error" && <p className="text-sm text-danger">{errorMsg}</p>}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-amber text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
            >
              {status === "loading" ? "Criando…" : "Criar conta"}
            </button>
          </form>
        )}

        <p className="text-sm text-ink-muted mt-6 text-center">
          Já tem conta?{" "}
          <Link href="/loja/conta/entrar" className="text-amber hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
