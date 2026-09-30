import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { UploadForm } from "./upload-form";
import { PublishNowButton } from "./publish-now-button";
import { FileRow } from "./file-row";

export default async function AdminStlPacksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("accounts").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: files } = await admin
    .from("stl_pack_files")
    .select("id, title, tags, active, file_path, times_published, last_published_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/admin" className="text-sm text-ink-muted hover:text-ink">
          ← Clientes
        </Link>
        <h1 className="font-display text-2xl text-ink mt-4 mb-1">Pacote de STLs</h1>
        <p className="text-sm text-ink-muted mb-8">
          {files?.length ?? 0} arquivo(s) no pacote. O robô publica automaticamente todo dia — o
          botão abaixo dispara a mesma seleção na hora, útil pra testar.
        </p>

        <PublishNowButton />
        <UploadForm />

        <div className="border border-line rounded-2xl overflow-hidden">
          {(files ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted p-5">Nenhum arquivo ainda.</p>
          ) : (
            (files ?? []).map((f) => (
              <FileRow
                key={f.id}
                id={f.id}
                title={f.title}
                tags={f.tags ?? []}
                active={f.active}
                filePath={f.file_path}
                timesPublished={f.times_published}
                lastPublishedAt={f.last_published_at}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
