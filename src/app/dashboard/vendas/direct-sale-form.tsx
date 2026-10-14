"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createDirectSale } from "@/lib/sales/actions";
import {
  ON_CREDIT,
  PAID_NOW_METHODS,
  PAYMENT_LINK,
  paymentLabel,
  type SaleItemInput,
} from "@/lib/sales/types";
import { estimateProduct, type EstimateFilament } from "@/lib/sales/estimate";
import { calcPrice, DEFAULT_PRICE_PARAMS, type PriceParams } from "@/lib/quotes/calc";
import { savePricingParams } from "@/lib/quotes/pricing-actions";
import { FieldTooltip } from "@/components/field-tooltip";
import { Icon } from "@/components/icons";

export type SaleProduct = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  available_colors: string[];
  print_printer_id: string | null;
  print_filament_id: string | null;
  print_weight_g: number | null;
  print_time_min: number | null;
  color_filament_material: string | null;
  color_filament_grams: number | null;
  filament_rows: { filament_stock_id: string; grams: number }[];
  parts: { filament_stock_id: string | null; color_material: string | null; grams: number | null; print_time_min: number | null }[];
};

type Printer = { id: string; name: string };

// Os campos numéricos guardam TEXTO (mesmo motivo da calculadora de
// orçamento: dá pra apagar e redigitar sem o campo forçar "0").
type Line = {
  key: string;
  kind: "catalog" | "manual";
  productId: string | null;
  color: string;
  description: string;
  quantity: string;
  unitPrice: string;
  priceTouched: boolean;
  filamentStockId: string;
  grams: string;
  timeMin: string;
  saveAsProduct: boolean;
};

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const toNumber = (v: string) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const newKey = () => Math.random().toString(36).slice(2);

function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DirectSaleForm({
  products,
  filaments,
  printers,
  hasInfinitepay,
  pricingParams = DEFAULT_PRICE_PARAMS,
}: {
  products: SaleProduct[];
  filaments: EstimateFilament[];
  printers: Printer[];
  hasInfinitepay: boolean;
  pricingParams?: PriceParams;
}) {
  const router = useRouter();

  const [customer, setCustomer] = useState({ name: "", phone: "", document: "", email: "", address: "" });
  const [lines, setLines] = useState<Line[]>([]);
  const [pickProductId, setPickProductId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  // Recebimento: "manual" (o vendedor dá a baixa — na hora ou depois, no
  // fiado) ou "link" (link de cobrança, baixa automática quando pagar).
  const [settlement, setSettlement] = useState<"manual" | "link">("manual");
  const [dueDate, setDueDate] = useState(() => inDays(30));
  const [linkDueDate, setLinkDueDate] = useState(() => inDays(3));
  const [downPayment, setDownPayment] = useState("");
  const [downPaymentMethod, setDownPaymentMethod] = useState("pix");
  const onCredit = settlement === "manual" && paymentMethod === ON_CREDIT;
  const byLink = settlement === "link";
  const effectiveMethod = byLink ? PAYMENT_LINK : paymentMethod;
  const [sendToQueue, setSendToQueue] = useState(true);
  const [manualPrinterId, setManualPrinterId] = useState(printers[0]?.id ?? "");
  const [showParams, setShowParams] = useState(false);
  // Mesmos parâmetros salvos no Orçamento (consumo, kWh, mão de obra,
  // custos fixos, margem) — dá pra ajustar só nesta venda ou salvar.
  const [savedParams, setSavedParams] = useState<PriceParams>(pricingParams);
  const [params, setParams] = useState({
    watts: String(pricingParams.watts),
    kwhPrice: String(pricingParams.kwhPrice),
    labor: String(pricingParams.labor),
    fixedCosts: String(pricingParams.fixedCosts),
    marginPercent: String(pricingParams.marginPercent),
  });
  const [paramsSave, setParamsSave] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "error"; message?: string }>({ kind: "idle" });

  const priceParams = useMemo(
    () => ({
      watts: toNumber(params.watts),
      kwhPrice: toNumber(params.kwhPrice),
      labor: toNumber(params.labor),
      fixedCosts: toNumber(params.fixedCosts),
      marginPercent: toNumber(params.marginPercent),
    }),
    [params]
  );

  const paramsChanged = (Object.keys(priceParams) as (keyof PriceParams)[]).some(
    (k) => Math.abs(priceParams[k] - savedParams[k]) > 0.0001
  );
  async function saveParams() {
    setParamsSave({ kind: "saving" });
    const result = await savePricingParams(priceParams);
    if (result.error) setParamsSave({ kind: "error", message: result.error });
    else {
      setSavedParams(priceParams);
      setParamsSave({ kind: "saved" });
    }
  }
  const fmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  // Cálculo por item: mesma conta do orçamento (filamento + energia +
  // mão de obra + fixos + margem), a partir da receita do produto ou do
  // que foi digitado no item manual.
  const computed = useMemo(
    () =>
      lines.map((line) => {
        let grams = 0;
        let filamentCost = 0;
        let timeMin: number | null = null;
        let hasRecipe = true;
        if (line.kind === "catalog") {
          const product = products.find((p) => p.id === line.productId);
          if (product) {
            const est = estimateProduct(product, line.color || null, filaments);
            grams = est.grams;
            filamentCost = est.filamentCost;
            timeMin = est.timeMin;
            hasRecipe = est.hasRecipe && !!product.print_printer_id;
          }
        } else {
          grams = toNumber(line.grams);
          const perKg = Number(filaments.find((f) => f.id === line.filamentStockId)?.cost_per_kg || 0);
          filamentCost = (grams / 1000) * perKg;
          timeMin = line.timeMin ? toNumber(line.timeMin) : null;
        }
        const price = calcPrice(filamentCost, (timeMin || 0) / 60, priceParams);
        const quantity = Math.max(0, Math.floor(toNumber(line.quantity)));
        const unitPrice = line.priceTouched || line.kind === "catalog" ? toNumber(line.unitPrice) : round2(price.suggested);
        return {
          grams,
          timeMin,
          hasRecipe,
          price,
          quantity,
          unitPrice,
          total: unitPrice * quantity,
          profit: (unitPrice - price.production) * quantity,
        };
      }),
    [lines, products, filaments, priceParams]
  );

  const subtotal = computed.reduce((sum, c) => sum + c.total, 0);
  const discountValue = Math.min(Math.max(0, toNumber(discount)), subtotal);
  const total = subtotal - discountValue;
  const totalCost = computed.reduce((sum, c) => sum + c.price.production * c.quantity, 0);
  const totalProfit = total - totalCost;
  const downPaymentValue = onCredit ? Math.min(Math.max(0, toNumber(downPayment)), total) : 0;

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addCatalog(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        kind: "catalog",
        productId: product.id,
        color: product.available_colors[0] ?? "",
        description: product.name,
        quantity: "1",
        unitPrice: String(product.price),
        priceTouched: false,
        filamentStockId: "",
        grams: "",
        timeMin: "",
        saveAsProduct: false,
      },
    ]);
    setPickProductId("");
  }

  function addManual() {
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        kind: "manual",
        productId: null,
        color: "",
        description: "",
        quantity: "1",
        unitPrice: "",
        priceTouched: false,
        filamentStockId: filaments[0]?.id ?? "",
        grams: "",
        timeMin: "",
        saveAsProduct: true,
      },
    ]);
  }

  async function finish() {
    if (!lines.length) {
      setStatus({ kind: "error", message: "Adicione pelo menos um item à venda." });
      return;
    }
    const badManual = lines.find((l) => l.kind === "manual" && !l.description.trim());
    if (badManual) {
      setStatus({ kind: "error", message: "Dê um nome pra cada item manual." });
      return;
    }
    setStatus({ kind: "saving" });

    const items: SaleItemInput[] = lines.map((line, i) => ({
      kind: line.kind,
      productId: line.productId,
      description: line.description,
      color: line.kind === "catalog" && line.color ? line.color : null,
      quantity: computed[i].quantity,
      unitPrice: computed[i].unitPrice,
      unitCost: computed[i].price.production,
      grams: computed[i].grams,
      timeMin: computed[i].timeMin,
      filamentStockId: line.kind === "manual" ? line.filamentStockId || null : null,
      saveAsProduct: line.kind === "manual" ? line.saveAsProduct : false,
    }));

    const result = await createDirectSale({
      customer,
      items,
      discount: discountValue,
      paymentMethod: effectiveMethod,
      downPaymentMethod,
      notes,
      sendToQueue,
      manualPrinterId: manualPrinterId || null,
      credit: byLink
        ? { dueDate: linkDueDate, downPayment: 0 }
        : onCredit
          ? { dueDate, downPayment: downPaymentValue }
          : undefined,
    });

    if (result.error || !result.saleId) {
      setStatus({ kind: "error", message: result.error || "Não consegui registrar a venda." });
      return;
    }
    const query = new URLSearchParams({ nova: "1" });
    if (sendToQueue) {
      query.set("fila", String(result.queued ?? 0));
      query.set("semfila", String(result.notQueued ?? 0));
    }
    router.push(`/dashboard/comprovantes/venda/${result.saleId}?${query.toString()}`);
  }

  const categories = [...new Set(products.map((p) => p.category || "Sem categoria"))].sort();
  const hasManual = lines.some((l) => l.kind === "manual");

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-6">
        {/* ---------------- Cliente ---------------- */}
        <section className="border border-line bg-surface rounded-2xl p-5">
          <p className="font-display text-lg text-ink mb-4">Cliente</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm text-ink-muted mb-1">Nome *</span>
              <input
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="input"
                placeholder="Nome do cliente"
              />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-1">
                WhatsApp *
                <FieldTooltip>Usado pra mandar o comprovante pro cliente pelo WhatsApp. Com DDD.</FieldTooltip>
              </span>
              <input
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                className="input font-spec"
                inputMode="tel"
                placeholder="(27) 99999-9999"
              />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-1">CPF ou CNPJ (opcional)</span>
              <input
                value={customer.document}
                onChange={(e) => setCustomer({ ...customer, document: e.target.value })}
                className="input font-spec"
              />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-1">E-mail (opcional)</span>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                className="input"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-sm text-ink-muted mb-1">Endereço (opcional)</span>
              <input
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="input"
              />
            </label>
          </div>
        </section>

        {/* ---------------- Itens ---------------- */}
        <section className="border border-line bg-surface rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="font-display text-lg text-ink">Itens</p>
            <button
              type="button"
              onClick={() => setShowParams((v) => !v)}
              className="text-xs text-ink-muted hover:text-ink underline underline-offset-2"
            >
              {showParams ? "Esconder" : "Ajustar"} parâmetros do cálculo
            </button>
          </div>

          {!showParams && (
            <p className="text-[11px] text-ink-muted -mt-2 mb-4">
              Cálculo com {fmt(priceParams.watts)} W · kWh R$ {fmt(priceParams.kwhPrice)} · mão de obra R${" "}
              {fmt(priceParams.labor)} · fixos R$ {fmt(priceParams.fixedCosts)} · margem {fmt(priceParams.marginPercent)}%
              {paramsChanged ? " (alterado nesta venda)" : ""}
            </p>
          )}
          {showParams && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5 rounded-xl border border-line bg-paper/40 p-3">
              {(
                [
                  ["watts", "Potência (W)"],
                  ["kwhPrice", "kWh (R$)"],
                  ["labor", "Mão de obra (R$)"],
                  ["fixedCosts", "Custos fixos (R$)"],
                  ["marginPercent", "Margem (%)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="block text-xs text-ink-muted mb-1">{label}</span>
                  <input
                    value={params[key]}
                    onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                    inputMode="decimal"
                    className="input font-spec"
                  />
                </label>
              ))}
              <div className="col-span-2 sm:col-span-5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-ink-muted">
                  {paramsChanged
                    ? "Valores alterados só nesta venda."
                    : paramsSave.kind === "saved"
                      ? "Salvo! O Orçamento também passa a usar esses valores."
                      : "Mesmos valores salvos no Orçamento. Mão de obra e custos fixos são por unidade."}
                </p>
                {paramsChanged && (
                  <button
                    type="button"
                    onClick={saveParams}
                    disabled={paramsSave.kind === "saving"}
                    className="text-xs bg-amber text-on-accent font-medium rounded-full px-3 py-1.5 disabled:opacity-50"
                  >
                    {paramsSave.kind === "saving" ? "Salvando…" : "Salvar como meu padrão"}
                  </button>
                )}
                {paramsSave.kind === "error" && <p className="w-full text-xs text-danger">{paramsSave.message}</p>}
              </div>
            </div>
          )}

          {lines.length === 0 && (
            <p className="text-sm text-ink-muted border border-dashed border-line rounded-xl p-5 mb-4">
              Nenhum item ainda. Escolha um produto do catálogo ou adicione um item manual.
            </p>
          )}

          <div className="space-y-3 mb-4">
            {lines.map((line, i) => {
              const c = computed[i];
              const product = products.find((p) => p.id === line.productId);
              return (
                <div key={line.key} className="border border-line rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    {line.kind === "catalog" ? (
                      <div className="min-w-0">
                        <p className="text-xs text-ink-muted">Catálogo</p>
                        <p className="font-medium text-ink truncate">{line.description}</p>
                      </div>
                    ) : (
                      <label className="block flex-1 min-w-0">
                        <span className="block text-xs text-ink-muted mb-1">Item manual</span>
                        <input
                          value={line.description}
                          onChange={(e) => updateLine(line.key, { description: e.target.value })}
                          className="input"
                          placeholder="Ex: Chaveiro personalizado"
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      aria-label="Remover item"
                      className="text-ink-muted hover:text-danger p-1 shrink-0"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {line.kind === "catalog" && (product?.available_colors.length ?? 0) > 0 && (
                      <label className="block col-span-2 sm:col-span-1">
                        <span className="block text-xs text-ink-muted mb-1">Cor</span>
                        <select
                          value={line.color}
                          onChange={(e) => updateLine(line.key, { color: e.target.value })}
                          className="input"
                        >
                          {product!.available_colors.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {line.kind === "manual" && (
                      <>
                        <label className="block col-span-2">
                          <span className="block text-xs text-ink-muted mb-1">Filamento</span>
                          <select
                            value={line.filamentStockId}
                            onChange={(e) => updateLine(line.key, { filamentStockId: e.target.value })}
                            className="input"
                          >
                            <option value="">Sem filamento do estoque</option>
                            {filaments.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.material} · {f.color}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="block text-xs text-ink-muted mb-1">Gramas / un.</span>
                          <input
                            value={line.grams}
                            onChange={(e) => updateLine(line.key, { grams: e.target.value })}
                            inputMode="decimal"
                            className="input font-spec"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-xs text-ink-muted mb-1">Minutos / un.</span>
                          <input
                            value={line.timeMin}
                            onChange={(e) => updateLine(line.key, { timeMin: e.target.value })}
                            inputMode="numeric"
                            className="input font-spec"
                          />
                        </label>
                      </>
                    )}
                    <label className="block">
                      <span className="block text-xs text-ink-muted mb-1">Quantidade</span>
                      <input
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                        inputMode="numeric"
                        className="input font-spec"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-ink-muted mb-1">Preço unitário (R$)</span>
                      <input
                        value={line.priceTouched || line.kind === "catalog" ? line.unitPrice : c.unitPrice.toFixed(2)}
                        onChange={(e) => updateLine(line.key, { unitPrice: e.target.value, priceTouched: true })}
                        inputMode="decimal"
                        className="input font-spec"
                      />
                    </label>
                  </div>

                  <div className="mt-3 pt-3 border-t border-line/70 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="text-ink-muted">
                      Custo/un. <span className="font-spec text-ink">{money(c.price.production)}</span>
                    </span>
                    <span className="text-ink-muted">
                      Sugerido/un. <span className="font-spec text-ink">{money(c.price.suggested)}</span>
                    </span>
                    {c.grams > 0 && <span className="text-ink-muted font-spec">{c.grams}g/un.</span>}
                    {(line.priceTouched || line.kind === "catalog") &&
                      Math.abs(c.unitPrice - c.price.suggested) > 0.009 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateLine(line.key, { unitPrice: c.price.suggested.toFixed(2), priceTouched: true })
                          }
                          className="text-amber hover:underline underline-offset-2"
                        >
                          usar sugerido
                        </button>
                      )}
                    <span className="ml-auto text-ink-muted">
                      Total <span className="font-spec text-ink font-medium">{money(c.total)}</span>
                    </span>
                  </div>

                  {line.kind === "catalog" && !c.hasRecipe && sendToQueue && (
                    <p className="text-xs text-warn mt-2">
                      Esse produto não tem receita de impressão completa — vai ser vendido, mas não entra na fila
                      sozinho.
                    </p>
                  )}
                  {line.kind === "manual" && (
                    <label className="flex items-center gap-2 text-xs text-ink mt-3">
                      <input
                        type="checkbox"
                        checked={line.saveAsProduct}
                        onChange={(e) => updateLine(line.key, { saveAsProduct: e.target.checked })}
                        className="accent-amber"
                      />
                      Salvar no catálogo de produtos
                      <FieldTooltip>
                        Cria o produto com esse nome, preço e receita, oculto na loja até você revisar foto e
                        descrição. Da próxima vez é só escolher no catálogo.
                      </FieldTooltip>
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={pickProductId}
              onChange={(e) => {
                setPickProductId(e.target.value);
                if (e.target.value) addCatalog(e.target.value);
              }}
              className="input sm:flex-1"
              aria-label="Adicionar produto do catálogo"
            >
              <option value="">+ Adicionar produto do catálogo…</option>
              {categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {products
                    .filter((p) => (p.category || "Sem categoria") === cat)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {money(Number(p.price))}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              onClick={addManual}
              className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 hover:bg-amber-soft transition-colors whitespace-nowrap"
            >
              + Item manual
            </button>
          </div>
          {products.length === 0 && (
            <p className="text-xs text-ink-muted mt-2">
              Você ainda não tem produtos no catálogo — use o item manual e marque &quot;Salvar no catálogo&quot;.
            </p>
          )}
        </section>
      </div>

      {/* ---------------- Resumo e pagamento ---------------- */}
      <aside className="border border-line bg-surface rounded-2xl p-5 lg:sticky lg:top-6 space-y-4">
        <p className="font-display text-lg text-ink">Recebimento</p>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Como vai receber">
          {(
            [
              ["manual", "Baixa manual", "Você confirma que recebeu"],
              ["link", "Link de cobrança", "Baixa automática ao pagar"],
            ] as const
          ).map(([value, title, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={settlement === value}
              onClick={() => setSettlement(value)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                settlement === value ? "border-amber bg-amber-soft" : "border-line hover:border-amber/40"
              }`}
            >
              <span className={`block text-sm ${settlement === value ? "text-ink font-medium" : "text-ink"}`}>
                {title}
              </span>
              <span className="block text-[11px] text-ink-muted leading-snug mt-0.5">{hint}</span>
            </button>
          ))}
        </div>

        {settlement === "manual" ? (
          <>
            <div>
              <p className="text-xs text-ink-muted mb-1.5">Forma de pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                {[...PAID_NOW_METHODS, ON_CREDIT].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    aria-pressed={paymentMethod === value}
                    className={`text-xs rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      paymentMethod === value
                        ? "border-amber bg-amber-soft text-ink"
                        : "border-line text-ink-muted hover:text-ink"
                    } ${value === ON_CREDIT ? "col-span-2" : ""}`}
                  >
                    {paymentLabel(value)}
                  </button>
                ))}
              </div>
            </div>

            {onCredit ? (
              <div className="rounded-xl border border-amber/30 bg-amber-soft/40 p-3 space-y-3">
                <p className="text-xs text-ink-muted">
                  Vai pra <strong className="text-ink">Contas a receber</strong>. Quando o cliente pagar, você dá a
                  baixa lá (ou pelo comprovante) — só então entra no faturamento.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="block text-xs text-ink-muted mb-1">Vencimento</span>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
                  </label>
                  <label className="block">
                    <span className="block text-xs text-ink-muted mb-1">Entrada (R$)</span>
                    <input
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="input font-spec"
                    />
                  </label>
                </div>
                {downPaymentValue > 0 && (
                  <label className="block">
                    <span className="block text-xs text-ink-muted mb-1">Entrada paga em</span>
                    <select
                      value={downPaymentMethod}
                      onChange={(e) => setDownPaymentMethod(e.target.value)}
                      className="input"
                    >
                      {PAID_NOW_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {paymentLabel(m)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="flex gap-1.5 flex-wrap">
                  {[7, 15, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDueDate(inDays(d))}
                      className="text-[11px] border border-line rounded-full px-2.5 py-1 text-ink-muted hover:text-ink"
                    >
                      {d} dias
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted">
                Venda registrada como <strong className="text-ink">paga</strong> e já entra no faturamento.
              </p>
            )}
          </>
        ) : hasInfinitepay ? (
          <div className="rounded-xl border border-amber/30 bg-amber-soft/40 p-3 space-y-3">
            <p className="text-xs text-ink-muted">
              Ao finalizar, o sistema gera um link da InfinitePay (Pix ou cartão) e você manda no WhatsApp do cliente.
              Quando ele pagar, a venda recebe <strong className="text-ink">baixa automática</strong> e entra no
              faturamento. Se ele pagar por fora, dá pra dar baixa manual no comprovante.
            </p>
            <label className="block">
              <span className="block text-xs text-ink-muted mb-1">Prazo pra pagar</span>
              <input type="date" value={linkDueDate} onChange={(e) => setLinkDueDate(e.target.value)} className="input" />
            </label>
          </div>
        ) : (
          <p className="text-xs text-warn rounded-xl border border-warn/30 bg-warn/10 p-3">
            Pra enviar link de cobrança, cadastre sua InfiniteTag em{" "}
            <a href="/dashboard/loja" className="underline">
              Loja virtual
            </a>
            . Enquanto isso, use a baixa manual.
          </p>
        )}

        <label className="block">
          <span className="block text-xs text-ink-muted mb-1">Desconto (R$)</span>
          <input
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            inputMode="decimal"
            className="input font-spec"
            placeholder="0,00"
          />
        </label>

        <div className="text-sm space-y-1.5 pt-3 border-t border-line">
          <SummaryRow label="Subtotal" value={money(subtotal)} />
          {discountValue > 0 && <SummaryRow label="Desconto" value={`− ${money(discountValue)}`} />}
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-ink">Total</span>
            <span className="font-spec text-xl text-amber font-medium">{money(total)}</span>
          </div>
          {(onCredit || byLink) && (
            <>
              {downPaymentValue > 0 && <SummaryRow label="Entrada agora" value={money(downPaymentValue)} muted />}
              <SummaryRow label="A receber" value={money(total - downPaymentValue)} muted tone="bad" />
            </>
          )}
          <SummaryRow label="Custo estimado" value={money(totalCost)} muted />
          <SummaryRow
            label="Lucro estimado"
            value={money(totalProfit)}
            muted
            tone={totalProfit < 0 ? "bad" : "good"}
          />
        </div>

        <div className="pt-3 border-t border-line space-y-3">
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={sendToQueue}
              onChange={(e) => setSendToQueue(e.target.checked)}
              className="accent-amber mt-0.5"
            />
            <span>
              Mandar as peças pra fila de impressão
              <span className="block text-xs text-ink-muted">Desmarque se as peças já estão prontas.</span>
            </span>
          </label>
          {sendToQueue && hasManual && (
            <label className="block">
              <span className="block text-xs text-ink-muted mb-1">Impressora dos itens manuais</span>
              <select value={manualPrinterId} onChange={(e) => setManualPrinterId(e.target.value)} className="input">
                <option value="">Nenhuma (não entram na fila)</option>
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="block text-xs text-ink-muted mb-1">Observações (opcional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" />
          </label>
        </div>

        {status.kind === "error" && <p className="text-sm text-danger">{status.message}</p>}
        <button
          type="button"
          onClick={finish}
          disabled={status.kind === "saving" || (byLink && !hasInfinitepay)}
          className="w-full bg-amber text-on-accent font-medium rounded-full px-5 py-3 text-sm disabled:opacity-50"
        >
          {status.kind === "saving"
            ? "Registrando…"
            : byLink
              ? `Gerar link de cobrança · ${money(total)}`
              : onCredit
                ? `Registrar fiado · ${money(total)}`
                : `Finalizar venda · ${money(total)}`}
        </button>
      </aside>
    </div>
  );
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function SummaryRow({
  label,
  value,
  muted,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  tone?: "good" | "bad";
}) {
  return (
    <div className={`flex justify-between ${muted ? "text-xs" : ""}`}>
      <span className="text-ink-muted">{label}</span>
      <span
        className={`font-spec ${tone === "good" ? "text-good" : tone === "bad" ? "text-danger" : "text-ink"}`}
      >
        {value}
      </span>
    </div>
  );
}
