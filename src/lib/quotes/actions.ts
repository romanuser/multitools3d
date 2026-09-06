"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PatternAccessory, QuoteInput, SavedQuote } from "./types";

// ---------------------------------------------------------------------
// Salva um orçamento no histórico. O número (ORC-AAAAMMDD-NNN) é gerado
// automaticamente pelo trigger do banco — aqui a gente insere e devolve
// o registro completo, já com o número, pra usar no PDF.
// ---------------------------------------------------------------------
export async function createQuoteRecord(
  input: QuoteInput
): Promise<{ data?: SavedQuote; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      account_id: user.id,
      client_name: input.clientName,
      client_company: input.clientCompany || null,
      client_email: input.clientEmail || null,
      client_phone: input.clientPhone || null,
      description: input.description,
      quantity: input.quantity,
      validity_days: input.validityDays,
      notes: input.notes || null,
      items: [
        {
          description: input.description,
          quantity: input.quantity,
          unit_price: input.unitPrice,
          total: input.total,
        },
      ],
      filament_cost: input.filamentCost,
      energy_cost: input.energyCost,
      labor_cost: input.laborCost,
      fixed_cost: input.fixedCost,
      margin_percent: input.marginPercent,
      unit_price: input.unitPrice,
      total: input.total,
    })
    .select("id, quote_number")
    .single();

  if (error) return { error: "Não consegui salvar o orçamento: " + error.message };

  revalidatePath("/dashboard/orcamentos");
  return { data };
}

export type PatternState = { error?: string; success?: string } | undefined;

// ---------------------------------------------------------------------
// Cria ou atualiza um padrão de peça. Se vier "patternId" no formulário,
// atualiza; senão, cria um novo.
// ---------------------------------------------------------------------
export async function savePattern(
  _prevState: PatternState,
  formData: FormData
): Promise<PatternState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const patternId = String(formData.get("patternId") || "");
  const name = String(formData.get("name") || "").trim();
  const dimensions = String(formData.get("dimensions") || "").trim();
  const weight = String(formData.get("weight") || "").trim();
  const productionTime = String(formData.get("productionTime") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name) return { error: "Dá um nome pro padrão (ex: Chaveiro padrão)." };

  let accessories: PatternAccessory[] = [];
  const rawAccessories = String(formData.get("accessoriesJson") || "[]");
  try {
    accessories = JSON.parse(rawAccessories);
  } catch {
    accessories = [];
  }

  const payload = {
    account_id: user.id,
    name,
    dimensions: dimensions || null,
    weight: weight || null,
    production_time: productionTime || null,
    notes: notes || null,
    accessories,
    updated_at: new Date().toISOString(),
  };

  const { error } = patternId
    ? await supabase.from("quote_patterns").update(payload).eq("id", patternId)
    : await supabase.from("quote_patterns").insert(payload);

  if (error) return { error: "Não consegui salvar o padrão: " + error.message };

  revalidatePath("/dashboard/orcamentos");
  return { success: patternId ? "Padrão atualizado." : "Padrão criado." };
}

export async function deletePattern(patternId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("quote_patterns")
    .delete()
    .eq("id", patternId)
    .eq("account_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/orcamentos");
  return {};
}
