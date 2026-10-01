"use client";

import { useState, useTransition } from "react";
import { changeCustomerPassword } from "@/lib/customer-auth/actions";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; success?: boolean } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await changeCustomerPassword(password);
      if (result.error) setMessage({ error: result.error });
      else {
        setMessage({ success: true });
        setPassword("");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="border border-line bg-surface rounded-2xl p-6 space-y-4 max-w-md">
      <p className="font-display text-lg text-ink">Trocar senha</p>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Nova senha</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
          className="input"
        />
      </label>
      {message?.error && <p className="text-sm text-danger">{message.error}</p>}
      {message?.success && <p className="text-sm text-good">Senha atualizada!</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Trocar senha"}
      </button>
    </form>
  );
}
