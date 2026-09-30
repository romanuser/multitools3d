"use client";

import { useState, useTransition } from "react";
import { getStlDownloadUrl } from "@/lib/stl-packs/actions";
import { Icon } from "@/components/icons";

export function StlPickCard({
  title,
  tags,
  coverUrl,
  fileId,
}: {
  title: string;
  tags: string[];
  coverUrl: string | null;
  fileId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDownload() {
    setError(null);
    startTransition(async () => {
      const result = await getStlDownloadUrl(fileId);
      if (result.error || !result.url) {
        setError(result.error || "Erro ao gerar o link.");
        return;
      }
      window.location.href = result.url;
    });
  }

  return (
    <div className="border border-line bg-surface rounded-2xl overflow-hidden flex flex-col">
      <div className="aspect-square bg-paper flex items-center justify-center">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <Icon name="cube" size={40} className="text-ink-muted" />
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <span className="text-xs text-ink-muted mb-1.5">Escolhido do pacote de hoje</span>
        <p className="text-ink font-medium mb-1">{title}</p>
        {tags.length > 0 && <p className="text-xs text-ink-muted mb-3">{tags.join(" · ")}</p>}
        <div className="mt-auto pt-2">
          <button
            onClick={onDownload}
            disabled={pending}
            className="w-full bg-amber text-on-accent text-sm font-medium rounded-full py-2 disabled:opacity-50"
          >
            {pending ? "Gerando link…" : "Baixar STL"}
          </button>
          {error && <p className="text-xs text-danger mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
