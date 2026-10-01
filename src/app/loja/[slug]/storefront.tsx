"use client";

import { useActionState, useMemo, useState } from "react";
import { checkoutStoreCart } from "@/lib/store/checkout-actions";
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
}: {
  accountId: string;
  storeSlug: string;
  companyName: string;
  logoUrl: string | null;
  products: Product[];
  customerEmail: string | null;
}) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
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

      <StoreAssistantWidget
        products={products.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
        customerEmail={customerEmail}
        onAddToCart={(productId) => addToCart(productId)}
      />
    </main>
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
    setTimeout(() => setAdded(false), 1500);
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

  const [cep, setCep] = useState("");
  const [quotes, setQuotes] = useState<{ id: number; name: string; company: string; price: number; deliveryTime?: number }[] | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<number | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");

  const shippingPrice = quotes?.find((q) => q.id === selectedQuote)?.price ?? 0;
  const grandTotal = total + shippingPrice;

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
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink text-xl leading-none">
            ×
          </button>
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
          {shippingError && <p className="text-sm text-danger">{shippingError}</p>}
          {quotes && quotes.length > 0 && (
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
          {quotes && quotes.length === 0 && (
            <p className="text-sm text-ink-muted">Nenhuma opção de frete encontrada pra esse CEP.</p>
          )}
        </div>

        <div className="flex justify-between font-medium text-ink mb-4">
          <span>Total</span>
          <span className="font-spec text-amber">{money(grandTotal)}</span>
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="accountId" value={accountId} />
          <input type="hidden" name="cart" value={cartJson} />
          <input type="hidden" name="shippingPrice" value={shippingPrice} />
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
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Endereço de entrega</span>
            <textarea name="customerAddress" rows={2} className="input" placeholder="Rua, número, bairro, cidade" />
          </label>

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
