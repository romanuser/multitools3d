"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ContaEntrarPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/loja/conta/callback`,
        shouldCreateUser: true,
      },
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
        <h1 className="font-display text-xl text-ink mb-1">Meus pedidos</h1>
        <p className="text-sm text-ink-muted mb-6">
          Digite seu e-mail e mandamos um link — clica nele e você já entra, sem senha.
        </p>

        {status === "sent" ? (
          <p className="text-sm text-good">
            Mandamos um link pra {email}. Confira sua caixa de entrada e clique nele.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-xs font-medium text-ink-muted mb-1">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </label>
            {status === "error" && <p className="text-sm text-danger">{errorMsg}</p>}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-amber text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50"
            >
              {status === "loading" ? "Enviando…" : "Enviar link de acesso"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
