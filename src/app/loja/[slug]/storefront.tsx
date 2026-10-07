"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { checkoutStoreCart } from "@/lib/store/checkout-actions";
import { formatDeliveryEstimate } from "@/lib/store/delivery-estimate";
import { StoreHeader } from "./store-header";
import { StoreAssistantWidget } from "./store-assistant-widget";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  image_url: string | null;
  available_colors: string[];
  customizable: boolean;
  customization_price: number;
  category: string | null;
  print_time_min: number | null;
};

type CartLine = {
  key: string;
  productId: string;
  color: string | null;
  customized: boolean;
  quantity: number;
};

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function lineKey(productId: string, color: string | null, customized: boolean) {
  return `${productId}::${color || ""}::${customized ? 1 : 0}`;
}

export function Storefront({
  accountId,
  storeSlug,
  companyName,
  logoUrl,
  products,
  customerEmail,
  whatsappNumber,
}: {
  accountId: string;
  storeSlug: string;
  companyName: string;
  logoUrl: string | null;
  products: Product[];
  customerEmail: string | null;
  whatsappNumber: string | null;
}) {
  // O carrinho fica salvo no navegador, por loja — assim, se o cliente
  // sair e voltar depois (ou só atualizar a página sem querer), o que
  // ele já tinha colocado continua lá.
  const cartStorageKey = `mf3d-cart-${storeSlug}`;
  const [cart, setCart] = useState<Record<string, CartLine>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartStorageKey);
      if (saved) setCart(JSON.parse(saved));
    } catch {
      // carrinho salvo corrompido ou bloqueado — só começa vazio mesmo
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (Object.keys(cart).length > 0) {
        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
      } else {
        localStorage.removeItem(cartStorageKey);
      }
    } catch {
      // localStorage bloqueado (modo anônimo, etc.) — carrinho segue
      // funcionando normal, só não persiste entre visitas
    }
  }, [cart, cartStorageKey]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const openProduct = products.find((p) => p.id === openProductId) ?? null;

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter((c): c is string => !!c))).sort(),
    [products]
  );
  const visibleProducts = selectedCategory ? products.filter((p) => p.category === selectedCategory) : products;

  function addToCart(productId: string, color: string | null = null, customized = false) {
    const key = lineKey(productId, color, customized);
    setCart((c) => ({
      ...c,
      [key]: { key, productId, color, customized, quantity: (c[key]?.quantity || 0) + 1 },
    }));
    // Abre o carrinho na hora, assim que adiciona qualquer produto — o
    // cliente já vê o que colocou, sem precisar procurar a barrinha
    // embaixo da tela.
    setShowCheckout(true);
  }
  function changeQty(key: string, qty: number) {
    setCart((c) => {
      if (qty <= 0) {
        const next = { ...c };
        delete next[key];
        return next;
      }
      return { ...c, [key]: { ...c[key], quantity: qty } };
    });
  }

  const cartItems = useMemo(
    () =>
      Object.values(cart)
        .map((line) => {
          const product = products.find((p) => p.id === line.productId);
          return product ? { line, product } : null;
        })
        .filter((x): x is { line: CartLine; product: Product } => !!x),
    [cart, products]
  );

  function unitPrice(product: Product, line: CartLine) {
    return product.price + (line.customized ? product.customization_price : 0);
  }

  const total = cartItems.reduce((sum, { product, line }) => sum + unitPrice(product, line) * line.quantity, 0);
  const cartCount = cartItems.reduce((sum, { line }) => sum + line.quantity, 0);

  return (
    <main className="min-h-screen bg-paper">
      <StoreHeader storeSlug={storeSlug} companyName={companyName} logoUrl={logoUrl} customerEmail={customerEmail} />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div id="produtos" />

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
                selectedCategory === null
                  ? "bg-amber text-on-accent border-amber"
                  : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
                  selectedCategory === cat
                    ? "bg-amber text-on-accent border-amber"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <p className="text-sm text-ink-muted">Essa loja ainda não tem produtos disponíveis.</p>
        ) : visibleProducts.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum produto nessa categoria.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 mb-24">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
                onOpenDetail={() => setOpenProductId(product.id)}
              />
            ))}
          </div>
        )}

        {cartCount > 0 && !showCheckout && (
          <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line px-6 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <p className="text-sm text-ink">
                {cartCount} {cartCount === 1 ? "item" : "itens"} ·{" "}
                <span className="font-spec text-amber font-medium">{money(total)}</span>
              </p>
              <button
                type="button"
                onClick={() => setShowCheckout(true)}
                className="bg-amber text-on-accent text-sm font-medium rounded-full px-5 py-2.5"
              >
                Finalizar pedido
              </button>
            </div>
          </div>
        )}

        {openProduct && (
          <ProductDetailModal
            product={openProduct}
            onAdd={addToCart}
            onClose={() => setOpenProductId(null)}
          />
        )}

        {showCheckout && (
          <CheckoutModal
            accountId={accountId}
            items={cartItems}
            total={total}
            unitPrice={unitPrice}
            onChangeQty={changeQty}
            onClose={() => setShowCheckout(false)}
          />
        )}
      </div>

      {whatsappNumber && <WhatsAppBubble whatsappNumber={whatsappNumber} companyName={companyName} />}

      <StoreAssistantWidget
        products={products.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
        customerEmail={customerEmail}
        onAddToCart={(productId) => addToCart(productId)}
      />
    </main>
  );
}

function WhatsAppBubble({ whatsappNumber, companyName }: { whatsappNumber: string; companyName: string }) {
  const digits = whatsappNumber.replace(/\D/g, "");
  // Número brasileiro sem DDI (10 ou 11 dígitos) ganha o 55 na frente —
  // com DDI (12+ dígitos) usa como está.
  const phone = digits.length <= 11 ? `55${digits}` : digits;
  const message = `Oi! Vim da loja ${companyName} e queria tirar uma dúvida.`;
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a loja no WhatsApp"
      className="fixed bottom-24 right-5 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12.04 2c-5.46 0-9.886 4.426-9.886 9.886 0 1.742.457 3.442 1.325 4.943L2.057 22l5.3-1.39a9.86 9.86 0 0 0 4.683 1.192h.004c5.46 0 9.886-4.426 9.886-9.886S17.5 2 12.04 2zm0 17.896a8.23 8.23 0 0 1-4.198-1.149l-.3-.178-3.146.825.84-3.07-.196-.315a8.22 8.22 0 0 1-1.258-4.37c0-4.546 3.699-8.245 8.258-8.245 4.546 0 8.245 3.699 8.245 8.258 0 4.546-3.699 8.244-8.245 8.244z" />
      </svg>
    </a>
  );
}

function ProductCard({
  product,
  onAdd,
  onOpenDetail,
}: {
  product: Product;
  onAdd: (productId: string, color: string | null, customized: boolean) => void;
  onOpenDetail: () => void;
}) {
  const outOfStock = product.stock != null && product.stock <= 0;
  const hasColors = product.available_colors.length > 0;

  const [color, setColor] = useState<string | null>(hasColors ? product.available_colors[0] : null);
  const [customized, setCustomized] = useState(false);

  return (
    <div className="border border-line bg-surface rounded-2xl overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={onOpenDetail}
        aria-label={`Ver detalhes de ${product.name}`}
        className="aspect-square bg-paper flex items-center justify-center text-left w-full"
      >
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-ink-muted text-xs">sem foto</span>
        )}
      </button>
      <div className="p-4 flex-1 flex flex-col">
        {product.category && <p className="text-xs text-amber mb-0.5">{product.category}</p>}
        <button type="button" onClick={onOpenDetail} className="text-left font-medium text-ink hover:underline underline-offset-2">
          {product.name}
        </button>
        {product.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{product.description}</p>}
        <p className="font-spec text-amber font-medium mt-2">
          {money(product.price + (customized ? product.customization_price : 0))}
        </p>

        {hasColors && (
          <label className="block mt-3">
            <span className="block text-xs text-ink-muted mb-1">Cor</span>
            <select value={color || ""} onChange={(e) => setColor(e.target.value)} className="input text-sm py-1.5">
              {product.available_colors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}

        {product.customizable && (
          <label className="flex items-center gap-2 mt-3 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={customized}
              onChange={(e) => setCustomized(e.target.checked)}
              className="accent-amber"
            />
            Personalizar (+ {money(product.customization_price)})
          </label>
        )}

        <div className="mt-auto pt-3">
          {outOfStock ? (
            <p className="text-xs text-danger">Esgotado</p>
          ) : (
            <button
              type="button"
              onClick={() => onAdd(product.id, color, customized)}
              className="w-full bg-amber text-on-accent text-sm font-medium rounded-full py-2"
            >
              Adicionar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductDetailModal({
  product,
  onAdd,
  onClose,
}: {
  product: Product;
  onAdd: (productId: string, color: string | null, customized: boolean) => void;
  onClose: () => void;
}) {
  const outOfStock = product.stock != null && product.stock <= 0;
  const hasColors = product.available_colors.length > 0;

  const [color, setColor] = useState<string | null>(hasColors ? product.available_colors[0] : null);
  const [customized, setCustomized] = useState(false);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    onAdd(product.id, color, customized);
    setAdded(true);
    // Fecha o detalhe logo em seguida — o carrinho já abre por cima
    // sozinho (addToCart cuida disso), então não precisa dos dois
    // abertos ao mesmo tempo.
    setTimeout(onClose, 400);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-surface border border-line rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
          >
            ← Voltar ao catálogo
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-ink-muted hover:text-ink text-xl leading-none">
            ×
          </button>
        </div>

        <div className="aspect-square bg-paper flex items-center justify-center">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-ink-muted text-sm">sem foto</span>
          )}
        </div>

        <div className="p-5">
          {product.category && <p className="text-xs text-amber mb-1">{product.category}</p>}
          <p className="font-display text-xl font-semibold tracking-tight text-ink">{product.name}</p>
          {product.description && <p className="text-sm text-ink-muted mt-2 leading-relaxed">{product.description}</p>}
          <p className="font-spec text-amber font-medium text-lg mt-3">
            {money(product.price + (customized ? product.customization_price : 0))}
          </p>

          {hasColors && (
            <label className="block mt-4">
              <span className="block text-sm text-ink-muted mb-1">Cor</span>
              <select value={color || ""} onChange={(e) => setColor(e.target.value)} className="input">
                {product.available_colors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}

          {product.customizable && (
            <label className="flex items-center gap-2 mt-4 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={customized}
                onChange={(e) => setCustomized(e.target.checked)}
                className="accent-amber"
              />
              Personalizar (+ {money(product.customization_price)})
            </label>
          )}

          <div className="mt-6">
            {outOfStock ? (
              <p className="text-sm text-danger">Esgotado</p>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="w-full bg-amber text-on-accent font-medium rounded-full py-3 text-sm"
              >
                {added ? "Adicionado!" : "Adicionar ao carrinho"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutModal({
  accountId,
  items,
  total,
  unitPrice,
  onChangeQty,
  onClose,
}: {
  accountId: string;
  items: { line: CartLine; product: Product }[];
  total: number;
  unitPrice: (product: Product, line: CartLine) => number;
  onChangeQty: (key: string, qty: number) => void;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(checkoutStoreCart, undefined);
  const cartJson = JSON.stringify(
    items.map(({ line }) => ({
      productId: line.productId,
      quantity: line.quantity,
      color: line.color,
      customized: line.customized,
    }))
  );

  const [isPickup, setIsPickup] = useState(false);
  const [cep, setCep] = useState("");
  const [quotes, setQuotes] = useState<{ id: number; name: string; company: string; price: number; deliveryTime?: number }[] | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<number | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");

  const shippingPrice = isPickup ? 0 : quotes?.find((q) => q.id === selectedQuote)?.price ?? 0;
  const grandTotal = total + shippingPrice;

  const productionMinutes = items.reduce((sum, { line, product }) => sum + (product.print_time_min || 0) * line.quantity, 0);
  const chosenDeliveryDays = isPickup ? 0 : quotes?.find((q) => q.id === selectedQuote)?.deliveryTime ?? null;
  const deliveryEstimate = formatDeliveryEstimate(productionMinutes, chosenDeliveryDays, isPickup);

  async function calculateShipping() {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setShippingError("Digite um CEP válido.");
      return;
    }
    setShippingLoading(true);
    setShippingError("");
    setQuotes(null);
    setSelectedQuote(null);

    try {
      const response = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          cep: digits,
          items: items.map(({ line }) => ({ productId: line.productId, quantity: line.quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Não foi possível calcular o frete.");
      setQuotes(result.quotes || []);
      if (result.quotes?.length) setSelectedQuote(result.quotes[0].id);
    } catch (err) {
      setShippingError(err instanceof Error ? err.message : "Erro ao calcular o frete.");
    } finally {
      setShippingLoading(false);
    }
  }

  const chosenQuote = quotes?.find((q) => q.id === selectedQuote);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-line rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="font-display text-lg text-ink">Finalizar pedido</p>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onClose} className="text-sm text-amber hover:underline">
              Continuar comprando
            </button>
            <button type="button" onClick={onClose} aria-label="Fechar" className="text-ink-muted hover:text-ink text-xl leading-none">
              ×
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm mb-4 pb-4 border-b border-line">
          {items.map(({ line, product }) => {
            const details = [line.color ? `Cor: ${line.color}` : null, line.customized ? "Personalizado" : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={line.key} className="flex justify-between gap-3 text-ink">
                <div className="min-w-0">
                  <p className="truncate">{product.name}</p>
                  {details && <p className="text-xs text-ink-muted">{details}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => onChangeQty(line.key, line.quantity - 1)}
                      aria-label="Diminuir quantidade"
                      className="w-6 h-6 flex items-center justify-center rounded-full border border-line text-ink hover:border-amber/50 transition-colors"
                    >
                      −
                    </button>
                    <span className="font-spec text-sm w-5 text-center">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onChangeQty(line.key, line.quantity + 1)}
                      disabled={product.stock != null && line.quantity >= product.stock}
                      aria-label="Aumentar quantidade"
                      className="w-6 h-6 flex items-center justify-center rounded-full border border-line text-ink hover:border-amber/50 transition-colors disabled:opacity-30 disabled:hover:border-line"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeQty(line.key, 0)}
                      aria-label="Remover item"
                      className="text-ink-muted hover:text-danger text-xs ml-1"
                    >
                      remover
                    </button>
                  </div>
                </div>
                <span className="font-spec shrink-0">{money(unitPrice(product, line) * line.quantity)}</span>
              </div>
            );
          })}
          <div className="flex justify-between text-ink pt-1.5">
            <span>Subtotal</span>
            <span className="font-spec">{money(total)}</span>
          </div>
        </div>

        <div className="mb-4 pb-4 border-b border-line">
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setIsPickup(false)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                !isPickup ? "border-amber bg-amber-soft text-ink" : "border-line text-ink-muted"
              }`}
            >
              Receber em casa
            </button>
            <button
              type="button"
              onClick={() => setIsPickup(true)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                isPickup ? "border-amber bg-amber-soft text-ink" : "border-line text-ink-muted"
              }`}
            >
              Retirar no local
            </button>
          </div>

          {isPickup ? (
            <p className="text-sm text-ink-muted">
              Combine com a loja onde e quando retirar — sem custo de frete.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink-muted mb-2">Frete</p>
              <div className="flex gap-2 mb-2">
                <input
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="Seu CEP"
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={calculateShipping}
                  disabled={shippingLoading}
                  className="text-sm text-amber border border-amber/40 rounded-full px-4 disabled:opacity-50 shrink-0"
                >
                  {shippingLoading ? "Calculando…" : "Calcular"}
                </button>
              </div>
            </>
          )}
          {!isPickup && shippingError && <p className="text-sm text-danger">{shippingError}</p>}
          {!isPickup && quotes && quotes.length > 0 && (
            <div className="space-y-1.5">
              {quotes.map((q) => (
                <label
                  key={q.id}
                  className="flex items-center justify-between text-sm border border-line rounded-lg px-3 py-2 cursor-pointer has-[:checked]:border-amber"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="shippingQuote"
                      checked={selectedQuote === q.id}
                      onChange={() => setSelectedQuote(q.id)}
                      className="accent-amber"
                    />
                    {q.company} · {q.name}
                    {q.deliveryTime && <span className="text-ink-muted">· {q.deliveryTime}d</span>}
                  </span>
                  <span className="font-spec">{money(q.price)}</span>
                </label>
              ))}
            </div>
          )}
          {!isPickup && quotes && quotes.length === 0 && (
            <p className="text-sm text-ink-muted">Nenhuma opção de frete encontrada pra esse CEP.</p>
          )}
        </div>

        {deliveryEstimate && (
          <p className="text-sm text-ink-muted mb-4 flex items-center gap-1.5">
            <span className="text-amber">⏱</span> {deliveryEstimate}
          </p>
        )}

        <div className="flex justify-between font-medium text-ink mb-4">
          <span>Total</span>
          <span className="font-spec text-amber">{money(grandTotal)}</span>
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="accountId" value={accountId} />
          <input type="hidden" name="cart" value={cartJson} />
          <input type="hidden" name="isPickup" value={isPickup ? "true" : "false"} />
          <input type="hidden" name="shippingPrice" value={shippingPrice} />
          <input type="hidden" name="shippingDays" value={chosenDeliveryDays ?? ""} />
          <input
            type="hidden"
            name="shippingLabel"
            value={chosenQuote ? `${chosenQuote.company} · ${chosenQuote.name}` : ""}
          />
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Seu nome</span>
            <input name="customerName" required className="input" />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">E-mail</span>
            <input type="email" name="customerEmail" required className="input" />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">WhatsApp (opcional)</span>
            <input name="customerPhone" className="input" />
          </label>
          {!isPickup && (
            <label className="block">
              <span className="block text-sm text-ink-muted mb-1">Endereço de entrega</span>
              <textarea name="customerAddress" rows={2} className="input" placeholder="Rua, número, bairro, cidade" />
            </label>
          )}

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-amber text-on-accent font-medium rounded-full py-3 text-sm disabled:opacity-50"
          >
            {pending ? "Gerando pagamento…" : "Ir para o pagamento"}
          </button>
        </form>
      </div>
    </div>
  );
}
