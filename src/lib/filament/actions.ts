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
  // carretel novo: quantos iguais e se já está aberto
  const quantidade = Math.max(1, Math.min(20, Math.floor(Number(formData.get("quantidade") || 1))));
  const situacao = String(formData.get("situacao") || "lacrado") === "em_uso" ? "em_uso" : "lacrado";

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

  // novo: N carretéis iguais (cada um ganha o seu número). Lacrado entra cheio.
  // Se marcou "já aberto", só o primeiro entra aberto; os outros, lacrados.
  const novos = Array.from({ length: quantidade }, (_, i) => {
    const aberto = situacao === "em_uso" && i === 0;
    return { ...payload, status: aberto ? "em_uso" : "lacrado", current_grams: aberto ? currentGrams : spoolWeightG };
  });
  const { error } = filamentId
    ? await supabase.from("filament_stock").update(payload).eq("id", filamentId)
    : await supabase.from("filament_stock").insert(novos);

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

// ---------------------------------------------------------------------
// Situação do carretel: abrir (lacrado → em uso) ou marcar como acabado
// (zera o saldo e registra a saída). Pra "restaurar" um acabado, é só
// ajustar o saldo: o banco volta ele pra "em uso" sozinho.
// ---------------------------------------------------------------------
export async function mudarSituacaoCarretel(filamentId: string, situacao: "em_uso" | "acabado"): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: atual } = await supabase
    .from("filament_stock")
    .select("current_grams, status")
    .eq("id", filamentId)
    .eq("account_id", user.id)
    .maybeSingle();
  if (!atual) return { error: "Carretel não encontrado." };

  if (situacao === "em_uso") {
    const { error } = await supabase.from("filament_stock").update({ status: "em_uso", aberto_em: new Date().toISOString() }).eq("id", filamentId);
    if (error) return { error: error.message };
  } else {
    const resto = Number(atual.current_grams);
    const { error } = await supabase.from("filament_stock").update({ current_grams: 0, status: "acabado" }).eq("id", filamentId);
    if (error) return { error: error.message };
    if (resto > 0) {
      await supabase.from("filament_movements").insert({ filament_stock_id: filamentId, type: "ajuste_saida", grams: resto, note: "Marcado como acabado" });
    }
  }
  revalidatePath("/dashboard/estoque");
  revalidatePath("/dashboard/fila");
  return {};
}
