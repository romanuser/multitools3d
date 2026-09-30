"use client";

import { useState, useTransition } from "react";
import { adminRunDailyStlSelectionNow } from "@/lib/stl-packs/actions";

export function PublishNowButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function onClick() {
    setResult(null);
    startTransition(async () => {
      const res = await adminRunDailyStlSelectionNow();
      if (res.error) setResult("Erro: " + res.error);
      else setResult(`Publicados ${res.picked} arquivo(s) hoje.`);
    });
  }

  return (
    <div className="flex items-center gap-3 mb-8">
      <button
        onClick={onClick}
        disabled={pending}
        className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 hover:bg-amber-soft transition-colors disabled:opacity-50"
      >
        {pending ? "Publicando…" : "Publicar de hoje agora"}
      </button>
      {result && <span className="text-sm text-ink-muted">{result}</span>}
    </div>
  );
}
