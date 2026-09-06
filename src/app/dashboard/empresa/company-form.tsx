"use client";

import { useActionState, useState } from "react";
import { updateCompany } from "@/lib/company/actions";

export function CompanyForm({
  initialName,
  initialLogoUrl,
}: {
  initialName: string;
  initialLogoUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateCompany, undefined);
  const [preview, setPreview] = useState<string | null>(initialLogoUrl);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-ink mb-2">Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full border border-line bg-surface overflow-hidden flex items-center justify-center shrink-0">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-ink-muted text-xs text-center px-2">sem logo</span>
            )}
          </div>
          <label className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 cursor-pointer hover:bg-amber-soft transition-colors">
            Escolher arquivo
            <input
              type="file"
              name="logo"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </label>
        </div>
        <p className="text-xs text-ink-muted mt-2">PNG, JPG ou SVG, até 2 MB.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Nome da empresa</label>
        <input
          name="companyName"
          defaultValue={initialName}
          required
          className="w-full rounded-lg bg-surface border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amber/40"
        />
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-good">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-amber text-white font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Salvar dados da empresa"}
      </button>
    </form>
  );
}
