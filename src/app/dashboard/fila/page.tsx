import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PrintQueueBoard } from "./print-queue-board";

export default async function FilaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: jobs }, { data: printers }, { data: filaments }] = await Promise.all([
    supabase
      .from("print_jobs")
      .select(
        "id, sequence_number, name, printer_id, filament_stock_id, planned_grams, actual_grams, waste_grams, status, estimated_time_min, started_at, sell_price, cost_snapshot, profit, created_at"
      )
      .eq("account_id", user.id)
      .order("sequence_number", { ascending: false }),
    supabase.from("printers").select("id, name").eq("account_id", user.id),
    supabase.from("filament_stock").select("id, material, color").eq("account_id", user.id),
  ]);

  // Impressões com mais de um filamento — as linhas extras moram numa
  // tabela à parte (jobs com só 1 filamento usam direto as colunas de
  // print_jobs e nem aparecem aqui).
  const jobIds = (jobs ?? []).map((j) => j.id);
  const { data: jobFilaments } = jobIds.length
    ? await supabase
        .from("print_job_filaments")
        .select("job_id, filament_stock_id, planned_grams, actual_grams")
        .in("job_id", jobIds)
    : { data: [] };

  const filamentsByJob = new Map<string, { filament_stock_id: string; planned_grams: number; actual_grams: number | null }[]>();
  for (const row of jobFilaments ?? []) {
    const list = filamentsByJob.get(row.job_id) ?? [];
    list.push(row);
    filamentsByJob.set(row.job_id, list);
  }

  // Produtos multipartes — cada parte é impressa separada, mas o produto
  // aparece como um card só na fila.
  const { data: jobParts } = jobIds.length
    ? await supabase
        .from("print_job_parts")
        .select(
          "id, job_id, position, name, filament_stock_id, planned_grams, actual_grams, estimated_time_min, status, started_at, cost_snapshot, failure_count"
        )
        .in("job_id", jobIds)
        .order("position", { ascending: true })
    : { data: [] };

  type JobPartRow = {
    id: string;
    job_id: string;
    position: number;
    name: string;
    filament_stock_id: string | null;
    planned_grams: number | null;
    actual_grams: number | null;
    estimated_time_min: number | null;
    status: string;
    started_at: string | null;
    cost_snapshot: number | null;
    failure_count: number;
  };
  const partsByJob = new Map<string, JobPartRow[]>();
  for (const part of (jobParts ?? []) as JobPartRow[]) {
    const list = partsByJob.get(part.job_id) ?? [];
    list.push(part);
    partsByJob.set(part.job_id, list);
  }

  const jobsWithFilaments = (jobs ?? []).map((job) => ({
    ...job,
    filaments: filamentsByJob.get(job.id) ?? [],
    parts: partsByJob.get(job.id) ?? [],
  }));

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Fila de impressão</h1>
        <p className="text-sm text-ink-muted mb-8">
          Acompanhe suas impressões. O estoque de filamento é descontado sozinho quando você
          conclui ou registra uma falha.
        </p>

        {(!printers?.length || !filaments?.length) && (
          <p className="text-sm text-amber border border-amber/30 bg-amber-soft rounded-xl px-4 py-3 mb-6">
            {!printers?.length && "Cadastre pelo menos uma impressora"}
            {!printers?.length && !filaments?.length && " e "}
            {!filaments?.length && "cadastre um filamento no estoque"} antes de criar uma
            impressão.
          </p>
        )}

        <PrintQueueBoard
          jobs={jobsWithFilaments}
          printers={printers ?? []}
          filaments={(filaments ?? []).map((f) => ({ id: f.id, label: `${f.material} · ${f.color}` }))}
        />
      </div>
    </main>
  );
}
