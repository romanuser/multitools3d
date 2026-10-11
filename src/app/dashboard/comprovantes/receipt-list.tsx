"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type ReceiptEntry = {
  id: string;
  origin: "venda" | "loja";
  number: string;
  customer: string;
  detail: string;
  total: number;
  createdAt: string;
  href: string;
};

type Filter = "todos" | "venda" | "loja";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function ReceiptList({ entries, initialOrigin }: { entries: ReceiptEntry[]; initialOrigin: Filter }) {
  const [filter, setFilter] = useState<Filter>(initialOrigin);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");

  const months = useMemo(
    () => [...new Set(entries.map((e) => e.createdAt.slice(0, 7)))].sort().reverse(),
    [entries]
  );

  const visible = entries.filter(
    (e) =>
      (filter === "todos" || e.origin === filter) &&
      (!month || e.createdAt.startsWith(month)) &&
      (!query || norm(`${e.customer} ${e.number}`).includes(norm(query)))
  );
  const visibleTotal = visible.reduce((sum, e) => sum + e.total, 0);

  const tabs: { value: Filter; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "venda", label: "Venda direta" },
    { value: "loja", label: "Loja virtual" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setFilter(t.value)}
            aria-pressed={filter === t.value}
            className={`text-xs rounded-full px-3.5 py-1.5 border transition-colors ${
              filter === t.value ? "bg-amber text-on-accent border-amber" : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-[1fr_180px] gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por cliente ou número"
          className="input"
          aria-label="Buscar comprovante"
        />
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="input" aria-label="Mês">
          <option value="">Todos os meses</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(`${m}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
          {entries.length === 0
            ? "Nenhum comprovante ainda. Registre uma venda direta ou aguarde uma venda paga na loja."
            : "Nenhum comprovante com esse filtro."}
        </p>
      ) : (
        <>
          <div className="border border-line rounded-2xl overflow-hidden">
            {visible.map((e) => (
              <Link
                key={`${e.origin}-${e.id}`}
                href={e.href}
                className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line last:border-b-0 hover:bg-surface-raised/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink font-medium truncate">{e.customer}</p>
                  <p className="text-xs text-ink-muted">
                    <span className="font-spec">{e.number}</span> ·{" "}
                    {new Date(e.createdAt).toLocaleDateString("pt-BR")} · {e.detail}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-spec text-sm text-ink">{money(e.total)}</p>
                  <span
                    className={`text-[11px] ${e.origin === "venda" ? "text-amber" : "text-ink-muted"}`}
                  >
                    {e.origin === "venda" ? "Venda direta" : "Loja"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <p className="text-xs text-ink-muted text-right mt-2">
            {visible.length} {visible.length === 1 ? "comprovante" : "comprovantes"} · {money(visibleTotal)}
          </p>
        </>
      )}
    </div>
  );
}
