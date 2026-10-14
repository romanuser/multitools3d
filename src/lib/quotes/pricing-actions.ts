"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PriceParams } from "./calc";

// Salva os parâmetros de preço da conta (consumo, kWh, mão de obra, custos
// fixos e margem). Usados pela calculadora de Orçamento e pela Venda direta,
// pra as duas telas darem sempre o mesmo valor.
export async function savePricingParams(params: PriceParams): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login de novo." };

  const clean: PriceParams = {
    watts: Number(params.watts),
    kwhPrice: Number(params.kwhPrice),
    labor: Number(params.labor),
    fixedCosts: Number(params.fixedCosts),
    marginPercent: Number(params.marginPercent),
  };
  for (const [key, value] of Object.entries(clean)) {
    if (!Number.isFinite(value) || value < 0) return { error: `Valor inválido em "${key}".` };
  }
  if (clean.watts > 5000) return { error: "Consumo da impressora parece alto demais (máx. 5000 W)." };
  if (clean.marginPercent > 1000) return { error: "Margem acima de 1000% — confira o valor." };

  const { error } = await supabase.from("accounts").update({ pricing_params: clean }).eq("id", user.id);
  if (error) return { error: "Não consegui salvar: " + error.message };

  revalidatePath("/dashboard/orcamentos");
  revalidatePath("/dashboard/vendas");
  return {};
}
