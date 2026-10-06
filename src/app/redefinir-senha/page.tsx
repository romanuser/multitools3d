"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setStatus("done");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-surface border border-line rounded-2xl p-8">
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink mb-1">Nova senha</h1>

        {!ready ? (
          <p className="text-sm text-ink-muted">
            Esse link parece inválido ou expirado. Peça um novo em{" "}
            <Link href="/esqueci-senha" className="text-amber hover:underline">
              Esqueci minha senha
            </Link>
            .
          </p>
        ) : status === "done" ? (
          <p className="text-sm text-good">Senha atualizada! Redirecionando…</p>
        ) : (
          <>
            <p className="text-sm text-ink-muted mb-6">Escolha uma senha nova pra sua conta.</p>
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="block text-xs font-medium text-ink-muted mb-1">Nova senha</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
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
                {status === "loading" ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
