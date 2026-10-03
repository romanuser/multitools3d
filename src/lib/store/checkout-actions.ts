"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStoreCheckoutLink } from "@/lib/store/infinitepay";
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
  const customerAddress = String(formData.get("customerAddress") || "").trim();
  const isPickup = String(formData.get("isPickup") || "") === "true";
  const shippingPrice = isPickup ? 0 : Number(formData.get("shippingPrice") || 0) || 0;
  const shippingLabel = isPickup ? "Retirada no local" : String(formData.get("shippingLabel") || "").trim();
  const shippingDaysRaw = formData.get("shippingDays");
  const shippingDays = isPickup ? 0 : shippingDaysRaw ? Number(shippingDaysRaw) : null;
  const cartJson = String(formData.get("cart") || "[]");

  if (!customerName) return { error: "Informe seu nome." };
  if (!customerEmail) return { error: "Informe seu e-mail." };

  let cart: { productId: string; quantity: number; color?: string | null; customized?: boolean }[] = [];
  try {
    cart = JSON.parse(cartJson);
  } catch {
    return { error: "Carrinho inválido." };
  }
  if (!cart.length) return { error: "Seu carrinho está vazio." };

  const supabase = await createClient();

  // Sempre recalcula os preços a partir do banco — nunca confia no valor
  // que veio do navegador, pra ninguém conseguir alterar o preço (nem a
  // taxa de personalização).
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, active, stock, available_colors, customizable, customization_price, print_time_min")
    .eq("account_id", accountId)
    .in(
      "id",
      cart.map((i) => i.productId)
    );

  if (!products || products.length === 0) return { error: "Produtos não encontrados." };

  const items = cart.map((cartItem) => {
    const product = products.find((p) => p.id === cartItem.productId);
    if (!product || !product.active) throw new Error(`Produto indisponível.`);

    const color = cartItem.color && product.available_colors?.includes(cartItem.color) ? cartItem.color : null;
    const customized = Boolean(cartItem.customized && product.customizable);
    const extra = customized ? Number(product.customization_price || 0) : 0;
    const unitPrice = Number(product.price) + extra;

    const details = [color ? `Cor: ${color}` : null, customized ? "Personalizado" : null].filter(Boolean).join(" · ");

    return {
      productId: product.id,
      description: details ? `${product.name} (${details})` : product.name,
      quantity: cartItem.quantity,
      color,
      customized,
      unitPrice,
      total: unitPrice * cartItem.quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  // Prazo de produção: soma o tempo de impressão de cada item (tempo
  // unitário × quantidade) — congelado no pedido na hora da compra, pra
  // não mudar se o produto for editado depois.
  const productionMinutes = cart.reduce((sum, cartItem) => {
    const product = products.find((p) => p.id === cartItem.productId);
    return sum + (product?.print_time_min || 0) * cartItem.quantity;
  }, 0);

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
      customer_address: customerAddress || null,
      items,
      subtotal,
      shipping: shippingPrice,
      shipping_label: shippingLabel || null,
      shipping_days: shippingDays,
      is_pickup: isPickup,
      production_minutes: productionMinutes,
      total: subtotal + shippingPrice,
      status: "AGUARDANDO_PAGAMENTO",
    })
    .select("id")
    .single();

  if (error || !order) return { error: "Não consegui criar o pedido: " + (error?.message || "") };

  let checkoutUrl: string;
  try {
    const paymentItems = items.map((i) => ({ description: i.description, quantity: i.quantity, price: i.unitPrice }));
    if (shippingPrice > 0) {
      paymentItems.push({ description: shippingLabel || "Frete", quantity: 1, price: shippingPrice });
    }
    checkoutUrl = await createStoreCheckoutLink({
      orderId: order.id,
      handle,
      customerName,
      customerEmail,
      customerPhone,
      items: paymentItems,
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

  // A loja virtual agora é gratuita pra qualquer plano — só o Pacote de
  // STLs continua exclusivo do VIP.
  if (!data) return null;

  return { id: data.id, companyName: data.company_name, logoUrl: data.company_logo_url };
}
