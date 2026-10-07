import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getAccountPlanStatus, hasFullAccess } from "@/lib/plans/access";
import { StlPickCard } from "./stl-pick-card";
import { STL_COVERS_BUCKET } from "@/lib/stl-packs/config";

export const metadata = { title: "Pacote de STLs" };

export default async function StlPacksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Exclusivo do plano VIP.
  const { plan } = await getAccountPlanStatus(user.id);
  if (!hasFullAccess(plan)) redirect("/dashboard/plano");

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: picks } = await admin
    .from("stl_daily_picks")
    .select("stl_pack_files(id, title, tags, cover_image_path)")
    .eq("pick_date", today);

  const items = (picks ?? [])
    .map((pick) => {
      const file = pick.stl_pack_files as unknown as {
        id: string;
        title: string;
        tags: string[];
        cover_image_path: string | null;
      } | null;
      if (!file) return null;
      const coverUrl = file.cover_image_path
        ? admin.storage.from(STL_COVERS_BUCKET).getPublicUrl(file.cover_image_path).data.publicUrl
        : null;
      return {
        fileId: file.id,
        title: file.title,
        tags: file.tags ?? [],
        coverUrl,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mb-1">Pacote de STLs</h1>
        <p className="text-sm text-ink-muted mb-8">
          Todo dia, novos arquivos escolhidos do nosso pacote — priorizando o que está em alta.
        </p>

        {items.length === 0 ? (
          <div className="border border-line bg-surface rounded-2xl p-8 text-center">
            <p className="text-ink-muted text-sm">
              Ainda não tem nenhum arquivo publicado hoje. Volte mais tarde!
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {items.map((item) => (
              <StlPickCard key={item.fileId} {...item} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
