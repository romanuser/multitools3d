"use client";

import { useState, useTransition } from "react";
import { adminUpdatePlan, adminSendWelcomeEmail } from "@/lib/admin/actions";

type Account = {
  id: string;
  email: string;
  company_name: string | null;
  plan: string;
  plan_expires_at: string | null;
  is_admin: boolean;
};

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "vip_mensal", label: "VIP mensal" },
  { value: "vip_vitalicio", label: "VIP vitalício" },
];

export function AdminAccountRow({ account }: { account: Account }) {
  const [plan, setPlan] = useState(account.plan);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [emailPending, startEmailTransition] = useTransition();
  const [emailState, setEmailState] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [isPromo, setIsPromo] = useState(false);

  function onChange(newPlan: string) {
    setPlan(newPlan);
    setSaved(false);
    startTransition(async () => {
      const result = await adminUpdatePlan(account.id, newPlan as "free" | "vip_mensal" | "vip_vitalicio");
      if (!result.error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  function onSendWelcome() {
    setEmailState(null);
    startEmailTransition(async () => {
      const result = await adminSendWelcomeEmail(account.id, isPromo);
      if (result.error) {
        setEmailState({ error: result.error });
      } else {
        setEmailState({ ok: true });
        setTimeout(() => setEmailState(null), 4000);
      }
    });
  }

  return (
    <div className="border-b border-line last:border-b-0">
      <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 items-center">
        <div>
          <p className="text-ink font-medium">{account.company_name || "(sem nome)"}</p>
          <p className="text-xs text-ink-muted">
            {account.email} {account.is_admin && <span className="text-amber ml-1">· admin</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-good">salvo</span>}
          <select
            value={plan}
            onChange={(e) => onChange(e.target.value)}
            disabled={pending}
            className="input text-sm py-1.5 w-40"
          >
            {PLAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-5 pb-4">
        {emailState?.ok && <span className="text-xs text-good">E-mail enviado!</span>}
        {emailState?.error && <span className="text-xs text-danger max-w-xs text-right">{emailState.error}</span>}
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={isPromo}
            onChange={(e) => setIsPromo(e.target.checked)}
            className="accent-amber"
          />
          bônus dos 100 primeiros
        </label>
        <button
          type="button"
          onClick={onSendWelcome}
          disabled={emailPending}
          className="text-xs text-amber border border-amber/40 rounded-full px-3 py-1.5 hover:bg-amber-soft transition-colors disabled:opacity-50"
        >
          {emailPending ? "Enviando…" : "Enviar boas-vindas"}
        </button>
      </div>
    </div>
  );
}
