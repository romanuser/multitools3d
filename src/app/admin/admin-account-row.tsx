"use client";

import { useState, useTransition } from "react";
import { adminUpdatePlan } from "@/lib/admin/actions";

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
    <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 border-b border-line last:border-b-0 items-center">
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
