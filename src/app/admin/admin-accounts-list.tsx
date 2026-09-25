"use client";

import { useState, useTransition } from "react";
import { adminUpdatePlan } from "@/lib/admin/actions";
import { buildGmailComposeUrl } from "@/lib/email/welcome-text";

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

export function AdminAccountsList({ accounts }: { accounts: Account[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPromo, setIsPromo] = useState(false);

  const allSelected = accounts.length > 0 && selected.size === accounts.length;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(accounts.map((a) => a.id)));
  }

  function onSendWelcome() {
    const emails = accounts.filter((a) => selected.has(a.id)).map((a) => a.email);
    if (!emails.length) return;
    const url = buildGmailComposeUrl(emails, isPromo, window.location.origin);
    window.open(url, "_blank");
  }

  return (
    <div className="border border-line rounded-2xl overflow-hidden mb-10">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-line bg-surface">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-amber" />
          {selected.size > 0 ? `${selected.size} selecionada(s)` : "Selecionar"}
        </label>

        <div className="flex-1" />

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
          disabled={selected.size === 0}
          className="text-xs text-amber border border-amber/40 rounded-full px-3 py-1.5 hover:bg-amber-soft transition-colors disabled:opacity-40"
        >
          Enviar boas-vindas ({selected.size})
        </button>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3 text-xs text-ink-muted border-b border-line bg-surface">
        <span className="w-4" />
        <span>Conta</span>
        <span>Plano</span>
      </div>

      {accounts.map((account) => (
        <AccountRow
          key={account.id}
          account={account}
          checked={selected.has(account.id)}
          onToggle={() => toggleOne(account.id)}
        />
      ))}
    </div>
  );
}

function AccountRow({
  account,
  checked,
  onToggle,
}: {
  account: Account;
  checked: boolean;
  onToggle: () => void;
}) {
  const [plan, setPlan] = useState(account.plan);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-4 border-b border-line last:border-b-0 items-center">
      <input type="checkbox" checked={checked} onChange={onToggle} className="accent-amber" />
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
  );
}
