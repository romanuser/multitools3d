"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createPrintJobsForOrder } from "@/lib/store/print-integration";
import { createGenericPaymentLink } from "@/lib/store/infinitepay";
import {
  PAYMENT_LINK,
  PAYMENT_METHODS,
  isPendingMethod,
  saleNumberLabel,
  type DirectSaleInput,
  type StoredSaleItem,
} from "./types";

const round2 = (v: number) => Math.round(v * 100) / 100;

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

// ---------------------------------------------------------------------
// Registra uma venda direta (balcão, WhatsApp, feira…):
//   1. itens manuais marcados "salvar no catálogo" viram produto (oculto
//      na loja, pra revisar depois)
//   2. grava a venda — ela já entra paga no faturamento
//   3. manda as peças pra fila de impressão (mesma lógica dos pedidos da
//      loja: receita de impressão, cor do cliente, multipartes)
// ---------------------------------------------------------------------
export async function createDirectSale(
  input: DirectSaleInput
): Promise<{ error?: string; saleId?: string; queued?: number; notQueued?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = input.customer.name.trim();
  const phone = input.customer.phone.replace(/\D/g, "");
  if (!name) return { error: "Informe o nome do cliente." };
  if (phone.length < 10) return { error: "Informe o WhatsApp do cliente com DDD." };
  if (!PAYMENT_METHODS.some((m) => m.value === input.paymentMethod)) return { error: "Escolha a forma de pagamento." };

  // Recebimento:
  //   pix/dinheiro/débito/crédito/outro -> baixa manual, já recebido
  //   a_receber (fiado)                 -> baixa manual depois, em Contas a receber
  //   link                              -> link de cobrança, baixa automática
  const pending = isPendingMethod(input.paymentMethod);
  const byLink = input.paymentMethod === PAYMENT_LINK;
  if (pending && !/^\d{4}-\d{2}-\d{2}$/.test(input.credit?.dueDate ?? "")) {
    return { error: byLink ? "Informe o prazo pra pagar." : "Informe a data de vencimento do fiado." };
  }

  // Link de cobrança precisa da InfiniteTag — confere ANTES de gravar.
  let infinitepayHandle: string | null = null;
  if (byLink) {
    const { data: account } = await supabase
      .from("accounts")
      .select("infinitepay_handle")
      .eq("id", user.id)
      .maybeSingle();
    infinitepayHandle = account?.infinitepay_handle || null;
    if (!infinitepayHandle) {
      return { error: "Pra enviar link de cobrança, cadastre sua InfiniteTag na Loja virtual. Ou use baixa manual." };
    }
  }

  const items = input.items.filter((i) => i.description.trim());
  if (!items.length) return { error: "Adicione pelo menos um item à venda." };
  for (const item of items) {
    if (!(item.quantity >= 1)) return { error: `Quantidade inválida em "${item.description}".` };
    if (!(item.unitPrice >= 0)) return { error: `Preço inválido em "${item.description}".` };
    if (item.kind === "manual" && item.saveAsProduct && !(item.unitPrice > 0)) {
      return { error: `Pra salvar "${item.description}" no catálogo, o preço precisa ser maior que zero.` };
    }
  }

  // 1) Itens manuais que viram produto do catálogo
  for (const item of items) {
    if (item.kind !== "manual" || !item.saveAsProduct) continue;
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        account_id: user.id,
        name: item.description.trim(),
        slug: slugify(item.description),
        description: null,
        price: round2(item.unitPrice),
        stock: null,
        active: false, // fica oculto na loja até você revisar foto e descrição
        print_printer_id: input.manualPrinterId,
        print_filament_id: item.filamentStockId || null,
        print_weight_g: item.grams > 0 ? item.grams : null,
        print_time_min: item.timeMin,
        available_colors: [],
        customizable: false,
        customization_price: 0,
      })
      .select("id")
      .single();
    if (error || !product) return { error: "Não consegui salvar o produto novo: " + (error?.message ?? "") };
    item.productId = product.id;
  }

  // 2) A venda
  const stored: StoredSaleItem[] = items.map((i) => ({
    productId: i.productId ?? null,
    description: i.color ? `${i.description.trim()} (${i.color})` : i.description.trim(),
    color: i.color ?? null,
    quantity: i.quantity,
    unitPrice: round2(i.unitPrice),
    total: round2(i.unitPrice * i.quantity),
    unitCost: round2(i.unitCost),
    grams: i.grams,
    timeMin: i.timeMin,
  }));
  const subtotal = round2(stored.reduce((sum, i) => sum + i.total, 0));
  const discount = round2(Math.min(Math.max(0, input.discount || 0), subtotal));
  const total = round2(subtotal - discount);
  const costEstimate = round2(stored.reduce((sum, i) => sum + (i.unitCost || 0) * i.quantity, 0));
  if (pending && !(total > 0)) return { error: "Venda sem valor não pode ficar a receber." };

  const { data: sale, error: saleError } = await supabase
    .from("direct_sales")
    .insert({
      account_id: user.id,
      customer_name: name,
      customer_phone: phone,
      customer_document: input.customer.document.trim() || null,
      customer_email: input.customer.email.trim() || null,
      customer_address: input.customer.address.trim() || null,
      items: stored,
      subtotal,
      discount,
      total,
      cost_estimate: costEstimate,
      payment_method: input.paymentMethod,
      notes: input.notes.trim() || null,
    })
    .select("id, sale_number")
    .single();
  if (saleError || !sale) return { error: "Não consegui registrar a venda: " + (saleError?.message ?? "") };

  // Não recebida na hora (fiado ou link): a venda não entra no
  // faturamento agora — vira uma conta a receber, e entra quando for
  // quitada (pelo link, sozinha; no fiado, pela baixa manual).
  if (pending) {
    const downPayment = byLink ? 0 : round2(Math.min(Math.max(0, input.credit?.downPayment || 0), total));
    const remaining = round2(total - downPayment);
    const fullyPaid = remaining <= 0;
    const description = `Venda ${saleNumberLabel(sale.sale_number)} — ${name}`;

    const { data: receivable, error: recError } = await supabase
      .from("accounts_receivable")
      .insert({
        account_id: user.id,
        direct_sale_id: sale.id,
        description,
        total_amount: total,
        paid_amount: downPayment,
        due_date: input.credit!.dueDate,
        status: fullyPaid ? "pago" : downPayment > 0 ? "parcial" : "pendente",
        settled_at: fullyPaid ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (recError || !receivable) {
      // sem a conta a receber o valor ficaria "perdido" — desfaz a venda
      await supabase.from("direct_sales").delete().eq("id", sale.id);
      return { error: "Não consegui lançar a venda em Contas a receber: " + (recError?.message ?? "") };
    }

    // Entrada do fiado = primeiro recebimento, na forma escolhida pelo lojista.
    if (downPayment > 0) {
      const method = ["pix", "dinheiro", "debito", "credito", "outro"].includes(input.downPaymentMethod ?? "")
        ? input.downPaymentMethod!
        : "outro";
      await supabase.from("receivable_payments").insert({
        receivable_id: receivable.id,
        account_id: user.id,
        amount: downPayment,
        method,
        source: "manual",
      });
    }

    if (byLink) {
      try {
        const url = await createGenericPaymentLink({
          handle: infinitepayHandle!,
          description,
          amount: remaining,
          referenceId: receivable.id,
        });
        await supabase.from("accounts_receivable").update({ payment_link_url: url }).eq("id", receivable.id);
      } catch (e) {
        // sem link não tem como cobrar — desfaz tudo e deixa tentar de novo
        await supabase.from("accounts_receivable").delete().eq("id", receivable.id);
        await supabase.from("direct_sales").delete().eq("id", sale.id);
        return {
          error:
            "A InfinitePay não gerou o link de cobrança agora" +
            (e instanceof Error && e.message ? ` (${e.message})` : "") +
            ". Nada foi registrado — tente de novo ou use baixa manual.",
        };
      }
    }
  }

  // 3) Fila de impressão
  let queued = 0;
  let notQueued = 0;
  if (input.sendToQueue) {
    const startedAt = new Date(Date.now() - 1000).toISOString();

    const catalogItems = items.filter((i) => i.productId);
    if (catalogItems.length) {
      await createPrintJobsForOrder(
        supabase,
        user.id,
        catalogItems.map((i) => ({
          productId: i.productId!,
          description: i.description,
          quantity: i.quantity,
          color: i.color ?? null,
        }))
      );
    }

    // Item manual (não salvo no catálogo): entra direto, se tiver
    // impressora e filamento escolhidos.
    for (const item of items.filter((i) => !i.productId)) {
      if (!input.manualPrinterId || !item.filamentStockId || !(item.grams > 0)) continue;
      for (let n = 0; n < item.quantity; n++) {
        await supabase.from("print_jobs").insert({
          account_id: user.id,
          name: item.description.trim(),
          printer_id: input.manualPrinterId,
          filament_stock_id: item.filamentStockId,
          planned_grams: item.grams,
          estimated_time_min: item.timeMin,
          sell_price: round2(item.unitPrice),
          status: "fila",
        });
      }
    }

    const { count } = await supabase
      .from("print_jobs")
      .select("id", { count: "exact", head: true })
      .eq("account_id", user.id)
      .gte("created_at", startedAt);
    queued = count ?? 0;
    const unitsSold = items.reduce((sum, i) => sum + i.quantity, 0);
    notQueued = Math.max(0, unitsSold - queued);
  }

  revalidatePath("/dashboard/fila");
  revalidatePath("/dashboard/comprovantes");
  revalidatePath("/dashboard/painel");
  revalidatePath("/dashboard/loja");
  revalidatePath("/dashboard/financeiro/receber");
  return { saleId: sale.id, queued, notQueued };
}
