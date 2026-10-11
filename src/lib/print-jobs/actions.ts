"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type JobState = { error?: string } | undefined;

type FilamentRowInput = { filamentStockId: string; grams: string };
type PartInput = { name: string; filament: string; grams: string; timeMin: string };
export type ParsedPart = { name: string; filamentStockId: string | null; grams: number; timeMin: number | null };

// Partes vindas do editor de partes (JSON num campo escondido). Na fila
// o filamento é sempre um rolo do estoque ("stock:<id>").
function parseParts(json: string): ParsedPart[] {
  let rows: PartInput[] = [];
  try {
    rows = JSON.parse(json);
  } catch {
    return [];
  }
  return rows
    .map((r) => ({
      name: String(r.name || "").trim(),
      filamentStockId: r.filament?.startsWith("stock:") ? r.filament.slice(6) : null,
      grams: Number(r.grams),
      timeMin: r.timeMin ? Number(r.timeMin) : null,
    }))
    .filter((r) => r.name || r.filamentStockId || r.grams > 0);
}

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

  // --- Produto em várias partes: um card só na fila, com as partes dentro ---
  if (formData.get("multipart") === "on") {
    const parts = parseParts(String(formData.get("partsJson") || "[]"));
    if (parts.length < 2) return { error: "Um produto multipartes precisa de pelo menos 2 partes." };
    const incomplete = parts.find((p) => !p.name || !p.filamentStockId || !(p.grams > 0));
    if (incomplete) return { error: "Preencha nome, filamento e gramas de todas as partes." };

    const totalTime = parts.every((p) => p.timeMin) ? parts.reduce((sum, p) => sum + (p.timeMin || 0), 0) : null;
    const { data: job, error } = await supabase
      .from("print_jobs")
      .insert({
        account_id: user.id,
        name,
        printer_id: printerId,
        filament_stock_id: null,
        planned_grams: null,
        estimated_time_min: totalTime,
        sell_price: sellPrice,
        status: "fila",
      })
      .select("id")
      .single();
    if (error || !job) return { error: error?.message ?? "Não consegui criar a impressão." };

    const { error: partsError } = await supabase.from("print_job_parts").insert(
      parts.map((p, i) => ({
        job_id: job.id,
        position: i,
        name: p.name,
        filament_stock_id: p.filamentStockId,
        planned_grams: p.grams,
        estimated_time_min: p.timeMin,
      }))
    );
    if (partsError) {
      await supabase.from("print_jobs").delete().eq("id", job.id);
      return { error: partsError.message };
    }

    revalidatePath("/dashboard/fila");
    return {};
  }

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
// Quem desconta o estoque, grava a movimentação e calcula custo/lucro é
// o GATILHO do banco (handle_print_job_status_change), nos dois casos:
//
// - 1 filamento: grava actual_grams no trabalho e muda o status.
// - Vários filamentos: primeiro grava as gramas reais de cada rolo em
//   print_job_filaments, DEPOIS muda o status — o gatilho lê essas
//   gramas e faz uma baixa por rolo. (Antes este código também
//   descontava o estoque por conta própria, o que dava desconto em
//   dobro depois que o gatilho passou a tratar vários filamentos.)
// ---------------------------------------------------------------------
export async function completeJob(
  jobId: string,
  actualGrams: number | { filamentStockId: string; actualGrams: number }[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("print_jobs")
    .select("printer_id")
    .eq("id", jobId)
    .maybeSingle();

  if (Array.isArray(actualGrams)) {
    for (const row of actualGrams) {
      const { error } = await supabase
        .from("print_job_filaments")
        .update({ actual_grams: row.actualGrams })
        .eq("job_id", jobId)
        .eq("filament_stock_id", row.filamentStockId);
      if (error) return { error: error.message };
    }

    const { error } = await supabase.from("print_jobs").update({ status: "concluida" }).eq("id", jobId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("print_jobs")
      .update({ status: "concluida", actual_grams: actualGrams })
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

// =====================================================================
// PRODUTO MULTIPARTES — uma parte de cada vez.
//
// A baixa de estoque de cada parte é feita pelo gatilho do banco
// (handle_print_job_part_change) quando a parte muda de status:
//   concluida -> desconta o filamento da parte
//   falha     -> desconta o resíduo e devolve a parte pra "pendente"
// Quando a última parte é concluída, o produto inteiro vira "concluida"
// e o gatilho do trabalho soma o custo de todas as partes.
// =====================================================================

function revalidateQueue() {
  revalidatePath("/dashboard/fila");
  revalidatePath("/dashboard/estoque");
  revalidatePath("/dashboard/impressoras");
}

async function loadPart(partId: string) {
  const supabase = await createClient();
  const { data: part } = await supabase
    .from("print_job_parts")
    .select("id, job_id, status, filament_stock_id")
    .eq("id", partId)
    .maybeSingle();
  if (!part) return { supabase, part: null, job: null };
  const { data: job } = await supabase
    .from("print_jobs")
    .select("id, status, printer_id, started_at")
    .eq("id", part.job_id)
    .maybeSingle();
  return { supabase, part, job };
}

export async function setPartFilament(partId: string, filamentStockId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("print_job_parts")
    .update({ filament_stock_id: filamentStockId || null })
    .eq("id", partId)
    .neq("status", "concluida");
  if (error) return { error: error.message };
  revalidatePath("/dashboard/fila");
  return {};
}

export async function startPart(partId: string): Promise<{ error?: string }> {
  const { supabase, part, job } = await loadPart(partId);
  if (!part || !job) return { error: "Parte não encontrada." };
  if (part.status !== "pendente") return { error: "Essa parte não está aguardando impressão." };
  if (!part.filament_stock_id) return { error: "Escolha o filamento dessa parte antes de iniciar." };

  const { count } = await supabase
    .from("print_job_parts")
    .select("id", { count: "exact", head: true })
    .eq("job_id", part.job_id)
    .eq("status", "imprimindo");
  if ((count ?? 0) > 0) return { error: "Já tem uma parte desse produto imprimindo. Conclua ela antes de iniciar outra." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("print_job_parts")
    .update({ status: "imprimindo", started_at: now })
    .eq("id", partId);
  if (error) return { error: error.message };

  if (job.status === "fila") {
    await supabase.from("print_jobs").update({ status: "imprimindo", started_at: job.started_at ?? now }).eq("id", job.id);
  }
  if (job.printer_id) {
    await supabase.from("printers").update({ status: "imprimindo" }).eq("id", job.printer_id);
  }

  revalidateQueue();
  return {};
}

export async function completePart(partId: string, actualGrams: number): Promise<{ error?: string }> {
  const { supabase, part, job } = await loadPart(partId);
  if (!part || !job) return { error: "Parte não encontrada." };
  if (part.status !== "imprimindo") return { error: "Essa parte não está imprimindo." };

  const { error } = await supabase
    .from("print_job_parts")
    .update({ status: "concluida", actual_grams: actualGrams })
    .eq("id", partId);
  if (error) return { error: error.message };

  if (job.printer_id) {
    await supabase.from("printers").update({ status: "livre" }).eq("id", job.printer_id);
  }

  // Era a última? Então o produto inteiro está pronto.
  const { count: remaining } = await supabase
    .from("print_job_parts")
    .select("id", { count: "exact", head: true })
    .eq("job_id", part.job_id)
    .neq("status", "concluida");
  if ((remaining ?? 0) === 0) {
    const { error: jobError } = await supabase.from("print_jobs").update({ status: "concluida" }).eq("id", part.job_id);
    if (jobError) return { error: jobError.message };
  }

  revalidateQueue();
  return {};
}

export async function failPart(partId: string, wasteGrams: number): Promise<{ error?: string }> {
  const { supabase, part, job } = await loadPart(partId);
  if (!part || !job) return { error: "Parte não encontrada." };
  if (part.status !== "imprimindo") return { error: "Essa parte não está imprimindo." };

  const { error } = await supabase
    .from("print_job_parts")
    .update({ status: "falha", waste_grams: Math.max(0, wasteGrams) })
    .eq("id", partId);
  if (error) return { error: error.message };

  if (job.printer_id) {
    await supabase.from("printers").update({ status: "livre" }).eq("id", job.printer_id);
  }

  revalidateQueue();
  return {};
}
