"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStoreCheckoutLink } from "@/lib/store/infinitepay";
import { hasFullAccess } from "@/lib/plans/access";
import { redirect } from "next/navigation";

export type CheckoutState = { error?: string } | undefined;

// ---------------------------------------------------------------------
// Chamado pela vitrine pública. Quem chama é um visitante qualquer, sem
// login — por isso a leitura de preços usa o client normal (a política
// pública de "products" já permite ler produtos ativos), mas a criação
// do pedido em "store_orders" também é pública (política de insert
// "with check (true)" criada no schema).
// ---------------------------------------------------------------------
export async function checkoutStoreCart(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const accountId = String(formData.get("accountId") || "");
  const customerName = String(formData.get("customerName") || "").trim();
  const customerEmail = String(formData.get("customerEmail") || "").trim();
  const customerPhone = String(formData.get("customerPhone") || "").trim();
  const cartJson = String(formData.get("cart") || "[]");

  if (!customerName) return { error: "Informe seu nome." };
  if (!customerEmail) return { error: "Informe seu e-mail." };

  let cart: { productId: string; quantity: number }[] = [];
  try {
    cart = JSON.parse(cartJson);
  } catch {
    return { error: "Carrinho inválido." };
  }
  if (!cart.length) return { error: "Seu carrinho está vazio." };

  const supabase = await createClient();

  // Sempre recalcula os preços a partir do banco — nunca confia no valor
  // que veio do navegador, pra ninguém conseguir alterar o preço.
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, active, stock")
    .eq("account_id", accountId)
    .in(
      "id",
      cart.map((i) => i.productId)
    );

  if (!products || products.length === 0) return { error: "Produtos não encontrados." };

  const items = cart.map((cartItem) => {
    const product = products.find((p) => p.id === cartItem.productId);
    if (!product || !product.active) throw new Error(`Produto indisponível.`);
    return {
      productId: product.id,
      description: product.name,
      quantity: cartItem.quantity,
      unitPrice: Number(product.price),
      total: Number(product.price) * cartItem.quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("accounts")
    .select("infinitepay_handle")
    .eq("id", accountId)
    .maybeSingle();

  const handle = (account?.infinitepay_handle || "").trim();
  if (!handle) return { error: "Essa loja ainda não configurou o pagamento. Fale com o vendedor." };

  const { data: order, error } = await admin
    .from("store_orders")
    .insert({
      account_id: accountId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      items,
      subtotal,
      shipping: 0,
      total: subtotal,
      status: "AGUARDANDO_PAGAMENTO",
    })
    .select("id")
    .single();

  if (error || !order) return { error: "Não consegui criar o pedido: " + (error?.message || "") };

  let checkoutUrl: string;
  try {
    checkoutUrl = await createStoreCheckoutLink({
      orderId: order.id,
      handle,
      customerName,
      customerEmail,
      customerPhone,
      items: items.map((i) => ({ description: i.description, quantity: i.quantity, price: i.unitPrice })),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não consegui gerar o link de pagamento." };
  }

  redirect(checkoutUrl);
}

// ---------------------------------------------------------------------
// Usado pela página pública da loja pra carregar os dados sem precisar
// de uma política de RLS pública em "accounts" (evita expor colunas
// sensíveis como e-mail — só devolvemos o que a vitrine precisa).
// ---------------------------------------------------------------------
export async function getStoreBySlug(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("accounts")
    .select("id, company_name, company_logo_url, plan, plan_expires_at")
    .eq("store_slug", slug)
    .maybeSingle();

  if (!data || !hasFullAccess(data.plan)) return null;

  const expired =
    data.plan === "vip_mensal" &&
    data.plan_expires_at &&
    new Date(data.plan_expires_at).getTime() < Date.now();
  if (expired) return null;

  return { id: data.id, companyName: data.company_name, logoUrl: data.company_logo_url };
}
