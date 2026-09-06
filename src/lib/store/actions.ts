"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "./order-status";
import { createPrintJobsForOrder } from "./print-integration";

const PRODUCT_LIMIT = 300;

export type StoreSettingsState = { error?: string; success?: string } | undefined;

// ---------------------------------------------------------------------
// Slug público da loja (ex: minhaloja -> multiferramenta3d.com/loja/minhaloja)
// e a InfiniteTag do PRÓPRIO assinante, pra ele receber o dinheiro das
// vendas da loja dele (não é a mesma tag da plataforma).
// ---------------------------------------------------------------------
export async function saveStoreSettings(
  _prevState: StoreSettingsState,
  formData: FormData
): Promise<StoreSettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let storeSlug = String(formData.get("storeSlug") || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const infinitepayHandle = String(formData.get("infinitepayHandle") || "")
    .trim()
    .replace(/^\$/, "");
  const whatsappNumber = String(formData.get("whatsappNumber") || "").replace(/\D/g, "");

  if (!storeSlug) return { error: "Escolha um link pra sua loja." };
  if (!infinitepayHandle) return { error: "Informe sua InfiniteTag pra receber os pagamentos." };

  const { error } = await supabase
    .from("accounts")
    .update({
      store_slug: storeSlug,
      infinitepay_handle: infinitepayHandle,
      whatsapp_number: whatsappNumber || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Esse link já está em uso por outra loja. Escolha outro." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/loja");
  return { success: "Configurações da loja salvas." };
}

export type ProductState = { error?: string } | undefined;

export async function saveProduct(_prevState: ProductState, formData: FormData): Promise<ProductState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const productId = String(formData.get("productId") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price") || 0);
  const stock = formData.get("stock") ? Number(formData.get("stock")) : null;
  const active = formData.get("active") === "on";
  const photoFile = formData.get("photo") as File | null;
  const printPrinterId = String(formData.get("printPrinterId") || "") || null;
  const printFilamentId = String(formData.get("printFilamentId") || "") || null;
  const printWeightG = formData.get("printWeightG") ? Number(formData.get("printWeightG")) : null;
  const printTimeMin = formData.get("printTimeMin") ? Number(formData.get("printTimeMin")) : null;

  if (!name) return { error: "Dá um nome pro produto." };
  if (price <= 0) return { error: "Informe um preço válido." };

  if (!productId) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("account_id", user.id);
    if ((count ?? 0) >= PRODUCT_LIMIT) {
      return { error: `Seu plano permite até ${PRODUCT_LIMIT} produtos.` };
    }
  }

  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    + "-" + Math.random().toString(36).slice(2, 6);

  const payload: {
    account_id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number | null;
    active: boolean;
    slug?: string;
    image_url?: string;
    print_printer_id: string | null;
    print_filament_id: string | null;
    print_weight_g: number | null;
    print_time_min: number | null;
  } = {
    account_id: user.id,
    name,
    description: description || null,
    price,
    stock,
    active,
    print_printer_id: printPrinterId,
    print_filament_id: printFilamentId,
    print_weight_g: printWeightG,
    print_time_min: printTimeMin,
  };

  if (!productId) payload.slug = slug;

  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > 3 * 1024 * 1024) return { error: "A foto precisa ter até 3 MB." };
    if (!photoFile.type.startsWith("image/")) return { error: "Envie um arquivo de imagem." };

    const extension = photoFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${productId || crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-photos")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type });

    if (uploadError) return { error: "Não consegui salvar a foto: " + uploadError.message };

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-photos").getPublicUrl(path);

    payload.image_url = `${publicUrl}?v=${Date.now()}`;
  }

  const { error } = productId
    ? await supabase.from("products").update(payload).eq("id", productId)
    : await supabase.from("products").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/loja");
  return {};
}

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("account_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/loja");
  return {};
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: current } = await supabase
    .from("store_orders")
    .select("status, items")
    .eq("id", orderId)
    .eq("account_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("store_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("account_id", user.id);

  if (error) return { error: error.message };

  // Se acabou de virar "pago" agora (não era antes), cria as impressões
  // na fila automaticamente, seguindo a receita de cada produto.
  if (status === "PAGAMENTO_CONFIRMADO" && current?.status !== "PAGAMENTO_CONFIRMADO") {
    await createPrintJobsForOrder(supabase, user.id, current?.items || []);
  }

  revalidatePath("/dashboard/loja");
  revalidatePath("/dashboard/fila");
  return {};
}

export async function deleteOrder(orderId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("store_orders")
    .delete()
    .eq("id", orderId)
    .eq("account_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/loja");
  return {};
}
