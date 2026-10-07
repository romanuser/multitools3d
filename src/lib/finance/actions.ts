"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createGenericPaymentLink } from "@/lib/store/infinitepay";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

// ===========================================================================
// FORNECEDORES
// ===========================================================================
export async function saveSupplier(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, userId } = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const contact = String(formData.get("contact") || "").trim();
  if (!name) return { error: "Dá o nome do fornecedor." };

  const { error } = await supabase.from("suppliers").insert({ account_id: userId, name, contact: contact || null });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/financeiro");
  return { success: true };
}

export async function deleteSupplier(id: string): Promise<{ error?: string }> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("suppliers").delete().eq("id", id).eq("account_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/financeiro");
  return {};
}

// ===========================================================================
// CONSIGNADOS
// ===========================================================================
export type ConsignmentState = { error?: string } | undefined;

export async function createConsignment(_prev: ConsignmentState, formData: FormData): Promise<ConsignmentState> {
  const { supabase, userId } = await requireUser();

  const partnerStoreName = String(formData.get("partnerStoreName") || "").trim();
  const quantity = Number(formData.get("quantity") || 0);
  const dateDelivered = String(formData.get("dateDelivered") || "").trim();
  const billingPeriodDays = formData.get("billingPeriodDays") ? Number(formData.get("billingPeriodDays")) : null;
  const existingProductId = String(formData.get("existingProductId") || "").trim();

  if (!partnerStoreName) return { error: "Dá o nome da loja parceira." };
  if (quantity <= 0) return { error: "Informe a quantidade entregue." };
  if (!dateDelivered) return { error: "Informe a data em que os produtos foram entregues." };

  let productId = existingProductId || null;
  let unitPrice: number | null = null;

  if (productId) {
    const { data: product } = await supabase
      .from("products")
      .select("id, price")
      .eq("id", productId)
      .eq("account_id", userId)
      .maybeSingle();
    if (!product) return { error: "Produto não encontrado." };
    unitPrice = Number(product.price);
  } else {
    // Produto novo — cadastra na hora, e esse cadastro já entra também no
    // catálogo da loja virtual (é o mesmo registro).
    const name = String(formData.get("newProductName") || "").trim();
    const price = Number(formData.get("newProductPrice") || 0);
    if (!name) return { error: "Dá o nome do produto novo." };
    if (price <= 0) return { error: "Informe o preço do produto novo." };

    const slugBase = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

    const { data: newProduct, error: productError } = await supabase
      .from("products")
      .insert({ account_id: userId, name, price, slug, active: true })
      .select("id")
      .single();
    if (productError || !newProduct) return { error: productError?.message || "Não consegui criar o produto." };
    productId = newProduct.id;
    unitPrice = price;
  }

  const { error } = await supabase.from("consignments").insert({
    account_id: userId,
    product_id: productId,
    partner_store_name: partnerStoreName,
    unit_price: unitPrice,
    quantity_delivered: quantity,
    quantity_remaining: quantity,
    date_delivered: dateDelivered,
    billing_period_days: billingPeriodDays,
    status: "ativo",
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/financeiro/consignados");
  revalidatePath("/dashboard/loja");
  return {};
}

// Faz o acerto de um lote: registra quanto vendeu e quanto recolheu, e
// decide o que fazer com o valor (link de cobrança, pendência ou baixa).
export async function settleConsignment(
  _prev: ConsignmentState,
  formData: FormData
): Promise<ConsignmentState> {
  const { supabase, userId } = await requireUser();

  const consignmentId = String(formData.get("consignmentId") || "");
  const quantitySold = Number(formData.get("quantitySold") || 0);
  const quantityReturned = Number(formData.get("quantityReturned") || 0);
  const amountPaidNow = Number(formData.get("amountPaidNow") || 0);
  const action = String(formData.get("action") || "cobrar"); // cobrar | pendencia | baixar_sem_cobrar
  const newDueDate = String(formData.get("newDueDate") || "").trim();

  const { data: consignment } = await supabase
    .from("consignments")
    .select("id, account_id, quantity_remaining, unit_price, partner_store_name")
    .eq("id", consignmentId)
    .eq("account_id", userId)
    .maybeSingle();
  if (!consignment) return { error: "Consignado não encontrado." };

  if (quantitySold + quantityReturned <= 0) return { error: "Informe quanto vendeu ou recolheu." };
  if (quantitySold + quantityReturned > consignment.quantity_remaining) {
    return { error: `Só restam ${consignment.quantity_remaining} unidade(s) nesse lote.` };
  }

  const amountDue = quantitySold * Number(consignment.unit_price);

  const { data: settlement, error: settlementError } = await supabase
    .from("consignment_settlements")
    .insert({
      consignment_id: consignmentId,
      account_id: userId,
      quantity_sold: quantitySold,
      quantity_returned: quantityReturned,
      amount_due: amountDue,
    })
    .select("id")
    .single();
  if (settlementError || !settlement) return { error: settlementError?.message || "Erro ao registrar o acerto." };

  const newRemaining = consignment.quantity_remaining - quantitySold - quantityReturned;
  await supabase
    .from("consignments")
    .update({ quantity_remaining: newRemaining, status: newRemaining <= 0 ? "encerrado" : "ativo" })
    .eq("id", consignmentId);

  // Sem valor a cobrar (só recolhimento, nada vendido) — não cria conta a receber.
  if (amountDue <= 0) {
    revalidatePath("/dashboard/financeiro/consignados");
    return {};
  }

  const description = `Consignado — ${consignment.partner_store_name} (${quantitySold}x vendido)`;

  if (action === "baixar_sem_cobrar") {
    // Dar baixa recebendo só o que pagou agora, sem perseguir o resto.
    await supabase.from("accounts_receivable").insert({
      account_id: userId,
      consignment_settlement_id: settlement.id,
      description,
      total_amount: amountDue,
      paid_amount: Math.min(amountPaidNow, amountDue),
      due_date: new Date().toISOString().slice(0, 10),
      status: amountPaidNow >= amountDue ? "pago" : "baixado_sem_pagar",
      settled_at: new Date().toISOString(),
    });
  } else if (action === "pendencia") {
    if (!newDueDate) return { error: "Informe o novo prazo da pendência." };
    await supabase.from("accounts_receivable").insert({
      account_id: userId,
      consignment_settlement_id: settlement.id,
      description,
      total_amount: amountDue,
      paid_amount: Math.min(amountPaidNow, amountDue),
      due_date: newDueDate,
      status: amountPaidNow > 0 ? "parcial" : "pendente",
    });
  } else {
    // "cobrar" — gera o link de pagamento do valor cheio.
    const { data: account } = await supabase
      .from("accounts")
      .select("infinitepay_handle")
      .eq("id", userId)
      .maybeSingle();

    const { data: receivable, error: recError } = await supabase
      .from("accounts_receivable")
      .insert({
        account_id: userId,
        consignment_settlement_id: settlement.id,
        description,
        total_amount: amountDue,
        due_date: new Date().toISOString().slice(0, 10),
        status: "pendente",
      })
      .select("id")
      .single();
    if (recError || !receivable) return { error: recError?.message || "Erro ao criar a conta a receber." };

    if (account?.infinitepay_handle) {
      try {
        const url = await createGenericPaymentLink({
          handle: account.infinitepay_handle,
          description,
          amount: amountDue,
          referenceId: receivable.id,
        });
        await supabase.from("accounts_receivable").update({ payment_link_url: url }).eq("id", receivable.id);
      } catch {
        // sem link, mas a conta já ficou registrada — lojista pode gerar na mão depois
      }
    }
  }

  revalidatePath("/dashboard/financeiro/consignados");
  revalidatePath("/dashboard/financeiro/receber");
  return {};
}

// ===========================================================================
// CONTAS A RECEBER
// ===========================================================================
export async function markReceivablePaid(
  id: string,
  paidAmount: number
): Promise<{ error?: string }> {
  const { supabase, userId } = await requireUser();
  const { data: row } = await supabase
    .from("accounts_receivable")
    .select("total_amount")
    .eq("id", id)
    .eq("account_id", userId)
    .maybeSingle();
  if (!row) return { error: "Não encontrado." };

  const status = paidAmount >= Number(row.total_amount) ? "pago" : "parcial";
  const { error } = await supabase
    .from("accounts_receivable")
    .update({ paid_amount: paidAmount, status, settled_at: status === "pago" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("account_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/financeiro/receber");
  return {};
}

// ===========================================================================
// CONTAS A PAGAR
// ===========================================================================
export async function savePayable(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, userId } = await requireUser();

  const category = String(formData.get("category") || "outro");
  const supplierId = String(formData.get("supplierId") || "") || null;
  const description = String(formData.get("description") || "").trim();
  const totalAmount = Number(formData.get("totalAmount") || 0);
  const dueDate = String(formData.get("dueDate") || "").trim();
  const recurrence = String(formData.get("recurrence") || "").trim() || null;

  if (!description) return { error: "Descreva essa conta." };
  if (totalAmount <= 0) return { error: "Informe o valor." };
  if (!dueDate) return { error: "Informe o prazo." };

  const { error } = await supabase.from("accounts_payable").insert({
    account_id: userId,
    category,
    supplier_id: supplierId,
    description,
    total_amount: totalAmount,
    due_date: dueDate,
    recurrence,
    status: "pendente",
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/financeiro/pagar");
  return { success: true };
}

export async function markPayablePaid(id: string, paidAmount: number): Promise<{ error?: string }> {
  const { supabase, userId } = await requireUser();
  const { data: row } = await supabase
    .from("accounts_payable")
    .select("total_amount")
    .eq("id", id)
    .eq("account_id", userId)
    .maybeSingle();
  if (!row) return { error: "Não encontrado." };

  const status = paidAmount >= Number(row.total_amount) ? "pago" : "parcial";
  const { error } = await supabase
    .from("accounts_payable")
    .update({ paid_amount: paidAmount, status, settled_at: status === "pago" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("account_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/financeiro/pagar");
  return {};
}

export async function deletePayable(id: string): Promise<{ error?: string }> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("accounts_payable").delete().eq("id", id).eq("account_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/financeiro/pagar");
  return {};
}
