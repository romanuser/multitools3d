"use server";

import { createClient } from "@/lib/supabase/server";
import { parseIntent } from "./parser";

export type AssistantReply = { reply: string; redirectTo?: string; refresh?: boolean; pending?: PendingState };

export type PendingState =
  | {
      flow: "add_product";
      step: "name" | "price" | "print_time" | "weight";
      name?: string;
      price?: number;
      printTimeMin?: number;
    }
  | null;

const HELP_TEXT =
  'Não entendi ainda 🙈 Tente algo como: "cadastrar impressora Ender 3", "adicionar 5kg de PLA vermelho ao estoque", "cadastrar produto" ou "quero me cadastrar".';

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") + "-" + Math.random().toString(36).slice(2, 6)
  );
}

function parseNumber(text: string): number | null {
  const match = text.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function runAssistantCommand(text: string, pending?: PendingState): Promise<AssistantReply> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Continua uma conversa de várias etapas já em andamento (ex: cadastro
  // de produto, que pergunta nome, preço, tempo e peso um de cada vez).
  if (pending?.flow === "add_product") {
    if (!user) return { reply: "Sua sessão caiu. Faça login e tente de novo." };

    if (pending.step === "name") {
      const name = text.trim();
      if (!name) return { reply: "Preciso de um nome pro produto. Como ele se chama?", pending };
      return {
        reply: `Show! "${name}". Qual o preço de venda (em R$)?`,
        pending: { flow: "add_product", step: "price", name },
      };
    }

    if (pending.step === "price") {
      const price = parseNumber(text);
      if (!price) return { reply: "Não peguei o preço. Manda só o número, tipo 45.90.", pending };
      return {
        reply: "Quanto tempo leva pra imprimir essa peça (em minutos)?",
        pending: { ...pending, step: "print_time", price },
      };
    }

    if (pending.step === "print_time") {
      const minutes = parseNumber(text);
      if (!minutes) return { reply: "Manda só o número de minutos, tipo 90.", pending };
      return {
        reply: "E qual o peso da peça pronta (em gramas)?",
        pending: { ...pending, step: "weight", printTimeMin: minutes },
      };
    }

    if (pending.step === "weight") {
      const grams = parseNumber(text);
      if (!grams) return { reply: "Manda só o número em gramas, tipo 35.", pending };

      const { error } = await supabase.from("products").insert({
        account_id: user.id,
        name: pending.name,
        slug: slugify(pending.name || "produto"),
        price: pending.price,
        print_time_min: pending.printTimeMin,
        print_weight_g: grams,
        active: false,
      });

      if (error) return { reply: "Não consegui cadastrar: " + error.message, pending: null };

      return {
        reply: `Prontinho! Cadastrei "${pending.name}" — ele está inativo por enquanto. Só falta você subir uma foto e ativar em Loja → Produtos.`,
        pending: null,
        refresh: true,
      };
    }
  }

  const intent = parseIntent(text);

  if (intent.type === "greeting") {
    return {
      reply: user
        ? 'Oi! Posso cadastrar impressora, adicionar filamento ao estoque ou cadastrar um produto novo. Tenta: "cadastrar produto".'
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

  if (intent.type === "add_product_start") {
    return {
      reply: "Bora cadastrar um produto novo! Qual o nome dele?",
      pending: { flow: "add_product", step: "name" },
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
