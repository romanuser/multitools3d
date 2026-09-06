"use server";

import { createClient } from "@/lib/supabase/server";
import { parseIntent } from "./parser";

export type AssistantReply = { reply: string; redirectTo?: string; refresh?: boolean };

const HELP_TEXT =
  'Não entendi ainda 🙈 Tente algo como: "cadastrar impressora Ender 3", "adicionar 5kg de PLA vermelho ao estoque" ou "quero me cadastrar".';

export async function runAssistantCommand(text: string): Promise<AssistantReply> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const intent = parseIntent(text);

  if (intent.type === "greeting") {
    return {
      reply: user
        ? 'Oi! Posso cadastrar uma impressora ou adicionar filamento ao estoque pra você. Tenta: "cadastrar impressora Ender 3" ou "adicionar 5kg de PLA vermelho ao estoque".'
        : 'Oi! Posso te ajudar a criar sua conta grátis. É só dizer "quero me cadastrar".',
    };
  }

  if (intent.type === "register") {
    if (user) return { reply: "Você já tem conta! Vou te levar pro painel.", redirectTo: "/dashboard" };
    return { reply: "Show! Vou te levar pra criar sua conta grátis.", redirectTo: "/cadastro" };
  }

  if (!user) {
    return {
      reply: "Pra fazer isso eu preciso que você esteja logado. Quer criar uma conta grátis?",
    };
  }

  if (intent.type === "add_printer") {
    const { error } = await supabase.from("printers").insert({
      account_id: user.id,
      name: intent.name,
      status: "livre",
    });
    if (error) return { reply: "Não consegui cadastrar: " + error.message };
    return {
      reply: `Prontinho! Cadastrei a impressora "${intent.name}". Já aparece em Impressoras.`,
      refresh: true,
    };
  }

  if (intent.type === "add_filament") {
    const { data: existing } = await supabase
      .from("filament_stock")
      .select("id, current_grams")
      .eq("account_id", user.id)
      .ilike("material", intent.material)
      .ilike("color", intent.color)
      .maybeSingle();

    if (existing) {
      const newGrams = Number(existing.current_grams) + intent.grams;
      await supabase.from("filament_stock").update({ current_grams: newGrams }).eq("id", existing.id);
      await supabase.from("filament_movements").insert({
        filament_stock_id: existing.id,
        type: "ajuste_entrada",
        grams: intent.grams,
        note: "Adicionado pelo assistente",
      });
      return {
        reply: `Prontinho! Adicionei ${intent.grams}g em "${intent.material} · ${intent.color}". Agora tem ${newGrams}g no estoque.`,
        refresh: true,
      };
    }

    const { error } = await supabase.from("filament_stock").insert({
      account_id: user.id,
      material: intent.material,
      color: intent.color,
      spool_weight_g: intent.grams,
      current_grams: intent.grams,
      cost_per_kg: 0,
      low_stock_alert_g: Math.round(intent.grams * 0.1),
    });
    if (error) return { reply: "Não consegui adicionar: " + error.message };
    return {
      reply: `Prontinho! Cadastrei ${intent.grams}g de ${intent.material} · ${intent.color} no estoque. Só não esquece de ajustar o preço por kg na tela de Estoque, coloquei 0 por padrão.`,
      refresh: true,
    };
  }

  return { reply: HELP_TEXT };
}
