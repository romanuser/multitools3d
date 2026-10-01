"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/loja/conta/callback?next=/loja/conta/redefinir-senha`,
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-surface border border-line rounded-2xl p-8">
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink mb-1">Esqueci minha senha</h1>

        {status === "sent" ? (
          <>
            <p className="text-sm text-ink-muted mb-6">
              Se esse e-mail tiver uma conta, enviamos um link pra você redefinir a senha. Pode levar
              alguns minutos — olha também a caixa de spam.
            </p>
            <Link href="/loja/conta/entrar" className="text-sm text-amber hover:underline">
              ← Voltar pro login
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-muted mb-6">
              Informe o e-mail da sua conta de cliente — enviamos um link pra você criar uma senha nova.
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="block text-xs font-medium text-ink-muted mb-1">E-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input"
                />
              </label>
              {status === "error" && <p className="text-sm text-danger">{errorMsg}</p>}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-amber text-on-accent font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
              >
                {status === "loading" ? "Enviando…" : "Enviar link de redefinição"}
              </button>
            </form>
            <p className="text-sm text-ink-muted mt-6 text-center">
              <Link href="/loja/conta/entrar" className="text-amber hover:underline">
                ← Voltar pro login
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
