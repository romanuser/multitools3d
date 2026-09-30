import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_QUOTA } from "./config";

type StlFile = {
  id: string;
  last_published_at: string | null;
  times_published: number;
};

// ---------------------------------------------------------------------
// Roda 1x por dia (função agendada da Netlify) ou na hora, pelo botão
// "Publicar de hoje agora" no Admin. Escolhe DAILY_QUOTA arquivos do
// pacote, sempre priorizando quem está há mais tempo SEM aparecer —
// arquivo nunca publicado vem sempre primeiro. Isso faz o pacote
// "reiniciar o ciclo" sozinho quando todo mundo já apareceu pelo menos
// uma vez, sem nunca travar esperando novo conteúdo.
// ---------------------------------------------------------------------
export async function runDailyStlSelection(pickDate = new Date().toISOString().slice(0, 10)) {
  const admin = createAdminClient();

  const { data: alreadyPicked } = await admin
    .from("stl_daily_picks")
    .select("file_id")
    .eq("pick_date", pickDate);
  const alreadyPickedIds = new Set((alreadyPicked ?? []).map((p) => p.file_id as string));

  const remainingQuota = DAILY_QUOTA - alreadyPickedIds.size;
  if (remainingQuota <= 0) {
    return { picked: 0, reason: "já tinha a cota completa pra essa data" as const };
  }

  const { data: files } = await admin
    .from("stl_pack_files")
    .select("id, last_published_at, times_published")
    .eq("active", true);

  const pool = ((files ?? []) as StlFile[]).filter((f) => !alreadyPickedIds.has(f.id));
  if (!pool.length) {
    return { picked: 0, reason: "nenhum arquivo ativo no pacote" as const };
  }

  pool.sort((a, b) => {
    if (!a.last_published_at && !b.last_published_at) return 0;
    if (!a.last_published_at) return -1;
    if (!b.last_published_at) return 1;
    return a.last_published_at.localeCompare(b.last_published_at);
  });

  const chosen = pool.slice(0, remainingQuota);
  const now = new Date().toISOString();

  await admin.from("stl_daily_picks").insert(
    chosen.map((file) => ({
      pick_date: pickDate,
      file_id: file.id,
    }))
  );

  for (const file of chosen) {
    await admin
      .from("stl_pack_files")
      .update({ last_published_at: now, times_published: file.times_published + 1 })
      .eq("id", file.id);
  }

  return { picked: chosen.length, reason: "ok" as const };
}
