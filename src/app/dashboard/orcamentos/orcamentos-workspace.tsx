"use client";

import { useState } from "react";
import { QuoteCalculator } from "./quote-calculator";
import { PatternLibrary } from "./pattern-library";
import type { QuotePattern } from "@/lib/quotes/types";

export function OrcamentosWorkspace({
  company,
  patterns,
}: {
  company: { name: string | null; logoUrl: string | null };
  patterns: QuotePattern[];
}) {
  const [tab, setTab] = useState<"calculadora" | "padroes">("calculadora");

  return (
    <div>
      <div className="flex gap-6 border-b border-line mb-8">
        <TabButton active={tab === "calculadora"} onClick={() => setTab("calculadora")}>
          Gerador de orçamentos
        </TabButton>
        <TabButton active={tab === "padroes"} onClick={() => setTab("padroes")}>
          Padrões de peças
        </TabButton>
      </div>

      {tab === "calculadora" ? (
        <QuoteCalculator company={company} patterns={patterns} />
      ) : (
        <PatternLibrary patterns={patterns} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-amber text-ink"
          : "border-transparent text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
