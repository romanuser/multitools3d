"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendOrderMessage(orderId: string, text: string): Promise<{ error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Escreva uma mensagem." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login pra enviar mensagem." };

  const { data: order } = await supabase
    .from("store_orders")
    .select("id, account_id, customer_name")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { error: "Pedido não encontrado." };

  const isSeller = order.account_id === user.id;

  let senderName = order.customer_name || "Cliente";
  if (isSeller) {
    const { data: account } = await supabase
      .from("accounts")
      .select("company_name")
      .eq("id", user.id)
      .maybeSingle();
    senderName = account?.company_name || "Loja";
  }

  const { error } = await supabase.from("order_messages").insert({
    order_id: orderId,
    account_id: order.account_id,
    sender_role: isSeller ? "lojista" : "cliente",
    sender_name: senderName,
    text: trimmed,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/loja");
  revalidatePath("/loja/conta");
  return {};
}
