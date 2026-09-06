"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type JobState = { error?: string } | undefined;

export async function createJob(_prevState: JobState, formData: FormData): Promise<JobState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const printerId = String(formData.get("printerId") || "");
  const filamentStockId = String(formData.get("filamentStockId") || "");
  const plannedGrams = Number(formData.get("plannedGrams") || 0);
  const estimatedTimeMin = formData.get("estimatedTimeMin")
    ? Number(formData.get("estimatedTimeMin"))
    : null;
  const sellPrice = formData.get("sellPrice") ? Number(formData.get("sellPrice")) : null;

  if (!name) return { error: "Dá um nome pra impressão." };
  if (!printerId) return { error: "Escolha a impressora." };
  if (!filamentStockId) return { error: "Escolha o filamento." };
  if (plannedGrams <= 0) return { error: "Informe a gramagem planejada." };

  const { error } = await supabase.from("print_jobs").insert({
    account_id: user.id,
    name,
    printer_id: printerId,
    filament_stock_id: filamentStockId,
    planned_grams: plannedGrams,
    estimated_time_min: estimatedTimeMin,
    sell_price: sellPrice,
    status: "fila",
  });

  if (error) return { error: error.message };

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
// Concluir com sucesso. O banco (trigger) desconta o estoque com base em
// actual_grams e calcula custo/lucro automaticamente.
// ---------------------------------------------------------------------
export async function completeJob(jobId: string, actualGrams: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("print_jobs")
    .select("printer_id")
    .eq("id", jobId)
    .maybeSingle();

  const { error } = await supabase
    .from("print_jobs")
    .update({
      status: "concluida",
      actual_grams: actualGrams,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) return { error: error.message };

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
