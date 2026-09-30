"use client";

import { useTransition } from "react";
import { adminToggleStlFile, adminDeleteStlFile } from "@/lib/stl-packs/actions";

export function FileRow({
  id,
  title,
  tags,
  active,
  filePath,
  timesPublished,
  lastPublishedAt,
}: {
  id: string;
  title: string;
  tags: string[];
  active: boolean;
  filePath: string;
  timesPublished: number;
  lastPublishedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-line last:border-b-0">
      <div className="min-w-0">
        <p className="text-ink font-medium truncate">{title}</p>
        <p className="text-xs text-ink-muted truncate">
          {tags.join(", ") || "sem tags"} · publicado {timesPublished}x
          {lastPublishedAt ? ` · última vez ${new Date(lastPublishedAt).toLocaleDateString("pt-BR")}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          disabled={pending}
          onClick={() => startTransition(() => { void adminToggleStlFile(id, !active); })}
          className="text-xs text-ink-muted border border-line rounded-full px-3 py-1.5 hover:text-ink disabled:opacity-50"
        >
          {active ? "Desativar" : "Ativar"}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Apagar esse arquivo de vez?")) startTransition(() => { void adminDeleteStlFile(id, filePath); });
          }}
          className="text-xs text-danger border border-danger/30 rounded-full px-3 py-1.5 hover:bg-danger/10 disabled:opacity-50"
        >
          Apagar
        </button>
      </div>
    </div>
  );
}
