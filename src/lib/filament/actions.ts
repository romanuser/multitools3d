"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type FilamentState = { error?: string } | undefined;

export async function saveFilament(
  _prevState: FilamentState,
  formData: FormData
): Promise<FilamentState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const filamentId = String(formData.get("filamentId") || "");
  const material = String(formData.get("material") || "").trim();
  const color = String(formData.get("color") || "").trim();
  const colorHex = String(formData.get("colorHex") || "").trim();
  const brand = String(formData.get("brand") || "").trim();
  const spoolWeightG = Number(formData.get("spoolWeightG") || 1000);
  const currentGrams = Number(formData.get("currentGrams") || 0);
  const costPerKg = Number(formData.get("costPerKg") || 0);
  const lowStockAlertG = Number(formData.get("lowStockAlertG") || 100);

  if (!material) return { error: "Escolha o material." };
  if (!color) return { error: "Dá um nome pra cor (ex: Preto)." };

  const payload = {
    account_id: user.id,
    material,
    color,
    color_hex: colorHex || null,
    brand: brand || null,
    spool_weight_g: spoolWeightG,
    current_grams: currentGrams,
    cost_per_kg: costPerKg,
    low_stock_alert_g: lowStockAlertG,
  };

  const { error } = filamentId
    ? await supabase.from("filament_stock").update(payload).eq("id", filamentId)
    : await supabase.from("filament_stock").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/estoque");
  revalidatePath("/dashboard/fila");
  return {};
}

export async function deleteFilament(filamentId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("filament_stock")
    .delete()
    .eq("id", filamentId)
    .eq("account_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/estoque");
  return {};
}

// ---------------------------------------------------------------------
// Ajuste manual de quantidade (ex: comprou um rolo novo, ou corrigindo
// uma contagem). Grava o novo valor e registra o movimento pra manter
// o histórico coerente.
// ---------------------------------------------------------------------
export async function adjustFilament(
  filamentId: string,
  newGrams: number,
  note: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: current, error: findError } = await supabase
    .from("filament_stock")
    .select("current_grams")
    .eq("id", filamentId)
    .eq("account_id", user.id)
    .maybeSingle();

  if (findError || !current) return { error: "Filamento não encontrado." };

  const delta = newGrams - Number(current.current_grams);

  const { error: updateError } = await supabase
    .from("filament_stock")
    .update({ current_grams: newGrams })
    .eq("id", filamentId);

  if (updateError) return { error: updateError.message };

  await supabase.from("filament_movements").insert({
    filament_stock_id: filamentId,
    type: delta >= 0 ? "ajuste_entrada" : "ajuste_saida",
    grams: Math.abs(delta),
    note: note || null,
  });

  revalidatePath("/dashboard/estoque");
  return {};
}
