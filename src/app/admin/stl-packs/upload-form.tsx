"use client";

import { useState } from "react";
import { adminCreateStlUploadUrl, adminFinalizeStlUpload } from "@/lib/stl-packs/actions";
import { createClient } from "@/lib/supabase/client";
import { STL_FILES_BUCKET } from "@/lib/stl-packs/config";

type Status = "idle" | "uploading" | "saving" | "done" | "error";

export function UploadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") || "");
    const tags = String(fd.get("tags") || "");
    const file = fd.get("file") as File | null;
    const cover = fd.get("cover") as File | null;

    if (!file || file.size === 0) {
      setError("Escolhe o arquivo (.stl ou .zip).");
      return;
    }

    try {
      setStatus("uploading");
      const { path, token, error: urlError } = await adminCreateStlUploadUrl(file.name);
      if (urlError || !path || !token) throw new Error(urlError || "Não consegui iniciar o upload.");

      // Envia o arquivo direto do navegador pro Storage, sem passar pelo
      // servidor do site — é isso que evita travar em arquivo grande.
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(STL_FILES_BUCKET)
        .uploadToSignedUrl(path, token, file);
      if (uploadError) throw new Error("Falha no upload: " + uploadError.message);

      setStatus("saving");
      const finalizeData = new FormData();
      finalizeData.set("title", title);
      finalizeData.set("tags", tags);
      finalizeData.set("path", path);
      if (cover && cover.size > 0) finalizeData.set("cover", cover);

      const result = await adminFinalizeStlUpload(finalizeData);
      if (result.error) throw new Error(result.error);

      setStatus("done");
      form.reset();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  const busy = status === "uploading" || status === "saving";

  return (
    <form onSubmit={onSubmit} className="border border-line bg-surface rounded-2xl p-6 space-y-4 max-w-xl mb-8">
      <p className="font-display text-lg text-ink">Novo arquivo</p>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Título</span>
        <input name="title" required className="input" placeholder="Ex: Dragão articulado" />
      </label>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Tags (separadas por vírgula)</span>
        <input name="tags" className="input" placeholder="dragão, fantasia, rpg" />
      </label>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Arquivo (.stl ou .zip)</span>
        <input name="file" type="file" accept=".stl,.zip" required className="input" />
      </label>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Capa (opcional)</span>
        <input name="cover" type="file" accept="image/*" className="input" />
      </label>

      {status === "uploading" && <p className="text-xs text-ink-muted">Enviando arquivo…</p>}
      {status === "saving" && <p className="text-sm text-ink-muted">Salvando…</p>}
      {status === "done" && <p className="text-sm text-good">Arquivo adicionado!</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
      >
        {busy ? "Enviando…" : "Adicionar ao pacote"}
      </button>
    </form>
  );
}
