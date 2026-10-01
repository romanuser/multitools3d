"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type JobState = { error?: string } | undefined;

type FilamentRowInput = { filamentStockId: string; grams: string };

function parseFilamentRows(json: string): { filamentStockId: string; grams: number }[] {
  let rows: FilamentRowInput[] = [];
  try {
    rows = JSON.parse(json);
  } catch {
    return [];
  }
  return rows
    .map((r) => ({ filamentStockId: r.filamentStockId, grams: Number(r.grams) }))
    .filter((r) => r.filamentStockId && r.grams > 0);
}

export async function createJob(_prevState: JobState, formData: FormData): Promise<JobState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const printerId = String(formData.get("printerId") || "");
  const filamentRows = parseFilamentRows(String(formData.get("filamentsJson") || "[]"));
  const estimatedTimeMin = formData.get("estimatedTimeMin")
    ? Number(formData.get("estimatedTimeMin"))
    : null;
  const sellPrice = formData.get("sellPrice") ? Number(formData.get("sellPrice")) : null;

  if (!name) return { error: "Dá um nome pra impressão." };
  if (!printerId) return { error: "Escolha a impressora." };
  if (!filamentRows.length) return { error: "Escolha pelo menos um filamento." };

  // Caso comum (1 filamento só): grava do jeito de sempre, nas colunas
  // antigas — nada muda aqui, é o mesmo caminho que já funcionava.
  const isSingle = filamentRows.length === 1;

  const { data: job, error } = await supabase
    .from("print_jobs")
    .insert({
      account_id: user.id,
      name,
      printer_id: printerId,
      filament_stock_id: isSingle ? filamentRows[0].filamentStockId : null,
      planned_grams: isSingle ? filamentRows[0].grams : null,
      estimated_time_min: estimatedTimeMin,
      sell_price: sellPrice,
      status: "fila",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Caso com mais de um filamento: as linhas extras vão pra tabela nova —
  // o desconto de estoque delas é feito no código, na hora de concluir.
  if (!isSingle && job) {
    const { error: rowsError } = await supabase.from("print_job_filaments").insert(
      filamentRows.map((r) => ({
        job_id: job.id,
        filament_stock_id: r.filamentStockId,
        planned_grams: r.grams,
      }))
    );
    if (rowsError) return { error: rowsError.message };
  }

  revalidatePath("/dashboard/fila");
  return {};
}

export async function startJob(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("print_jobs")
    .select("printer_id")
    .eq("id", jobId)
    .maybeSingle();

  const { error } = await supabase
    .from("print_jobs")
    .update({ status: "imprimindo", started_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) return { error: error.message };

  if (job?.printer_id) {
    await supabase.from("printers").update({ status: "imprimindo" }).eq("id", job.printer_id);
  }

  revalidatePath("/dashboard/fila");
  revalidatePath("/dashboard/impressoras");
  return {};
}

// ---------------------------------------------------------------------
// Concluir com sucesso.
//
// Impressão com 1 filamento só (actualGrams é um número): nada muda — o
// banco (trigger) continua descontando o estoque com base em actual_grams
// e calculando custo/lucro automaticamente, do jeito que já funcionava.
//
// Impressão com VÁRIOS filamentos (actualGrams é uma lista): aqui quem
// desconta o estoque de cada filamento e calcula custo/lucro é este
// código — de propósito, pra não depender de mexer no gatilho do banco
// (que a gente não tem como ver/editar com segurança).
// ---------------------------------------------------------------------
export async function completeJob(
  jobId: string,
  actualGrams: number | { filamentStockId: string; actualGrams: number }[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("print_jobs")
    .select("printer_id, sell_price")
    .eq("id", jobId)
    .maybeSingle();

  if (Array.isArray(actualGrams)) {
    const { error } = await supabase
      .from("print_jobs")
      .update({ status: "concluida", finished_at: new Date().toISOString() })
      .eq("id", jobId);
    if (error) return { error: error.message };

    let totalCost = 0;
    for (const row of actualGrams) {
      const { data: filament } = await supabase
        .from("filament_stock")
        .select("current_grams, cost_per_kg")
        .eq("id", row.filamentStockId)
        .maybeSingle();
      if (!filament) continue;

      totalCost += (row.actualGrams / 1000) * Number(filament.cost_per_kg || 0);

      await supabase
        .from("filament_stock")
        .update({ current_grams: Number(filament.current_grams) - row.actualGrams })
        .eq("id", row.filamentStockId);

      await supabase
        .from("print_job_filaments")
        .update({ actual_grams: row.actualGrams })
        .eq("job_id", jobId)
        .eq("filament_stock_id", row.filamentStockId);
    }

    const profit = job?.sell_price != null ? Number(job.sell_price) - totalCost : null;
    await supabase.from("print_jobs").update({ cost_snapshot: totalCost, profit }).eq("id", jobId);
  } else {
    const { error } = await supabase
      .from("print_jobs")
      .update({
        status: "concluida",
        actual_grams: actualGrams,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    if (error) return { error: error.message };
  }

  if (job?.printer_id) {
    await supabase.from("printers").update({ status: "livre" }).eq("id", job.printer_id);
  }

  revalidatePath("/dashboard/fila");
  revalidatePath("/dashboard/estoque");
  revalidatePath("/dashboard/impressoras");
  return {};
}

export async function failJob(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("print_jobs")
    .select("printer_id")
    .eq("id", jobId)
    .maybeSingle();

  const { error } = await supabase
    .from("print_jobs")
    .update({ status: "falha", finished_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) return { error: error.message };

  if (job?.printer_id) {
    await supabase.from("printers").update({ status: "livre" }).eq("id", job.printer_id);
  }

  revalidatePath("/dashboard/fila");
  revalidatePath("/dashboard/impressoras");
  return {};
}

// ---------------------------------------------------------------------
// Depois de pesar o resíduo na balança: registra o peso perdido e muda
// pra "falha_recalculada", que é quando o banco desconta o estoque.
// ---------------------------------------------------------------------
export async function recalcFailure(jobId: string, wasteGrams: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("print_jobs")
    .update({ status: "falha_recalculada", waste_grams: wasteGrams })
    .eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/fila");
  revalidatePath("/dashboard/estoque");
  return {};
}

export async function deleteJob(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("print_jobs").delete().eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/fila");
  return {};
}
