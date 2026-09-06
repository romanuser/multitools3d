"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ContaEntrarPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg("E-mail ou senha incorretos.");
      setStatus("error");
      return;
    }
    router.push("/loja/conta");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-surface border border-line rounded-2xl p-8">
        <h1 className="font-display text-xl text-ink mb-1">Meus pedidos</h1>
        <p className="text-sm text-ink-muted mb-6">Entre com seu e-mail e senha.</p>

        <form onSubmit={onSubmit} className="space-y-4">
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
              className="input"
            />
          </label>
          {status === "error" && <p className="text-sm text-danger">{errorMsg}</p>}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-amber text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
          >
            {status === "loading" ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-sm text-ink-muted mt-6 text-center">
          Não tem conta?{" "}
          <Link href="/loja/conta/cadastro" className="text-amber hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}

