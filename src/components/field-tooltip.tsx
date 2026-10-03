"use client";

import { useState, useRef, useEffect } from "react";

// ---------------------------------------------------------------------
// Um "?" pequeno do lado de um campo — clica (ou passa o mouse, no
// desktop) e mostra uma explicação curta do que preencher ali. Fecha
// clicando em qualquer lugar fora.
// ---------------------------------------------------------------------
export function FieldTooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center ml-1.5 align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        aria-label="Ajuda sobre este campo"
        className="w-4 h-4 rounded-full border border-line text-ink-muted text-[10px] leading-none flex items-center justify-center hover:border-amber hover:text-amber transition-colors"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-20 left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] w-56 rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs font-normal text-ink-muted leading-relaxed shadow-lg normal-case"
        >
          {children}
        </span>
      )}
    </span>
  );
}
