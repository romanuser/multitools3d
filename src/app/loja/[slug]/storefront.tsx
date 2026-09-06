"use client";

import { useActionState, useMemo, useState } from "react";
import { checkoutStoreCart } from "@/lib/store/checkout-actions";
import { StoreHeader } from "./store-header";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  image_url: string | null;
};

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);

  function addToCart(productId: string) {
    setCart((c) => ({ ...c, [productId]: (c[productId] || 0) + 1 }));
  }
  function changeQty(productId: string, qty: number) {
    setCart((c) => {
      if (qty <= 0) {
        const next = { ...c };
        delete next[productId];
        return next;
      }
      return { ...c, [productId]: qty };
    });
  }

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => {
          const product = products.find((p) => p.id === productId);
          return product ? { product, quantity } : null;
        })
        .filter((x): x is { product: Product; quantity: number } => !!x),
    [cart, products]
  );

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="min-h-screen bg-paper">
      <StoreHeader storeSlug={storeSlug} companyName={companyName} logoUrl={logoUrl} customerEmail={customerEmail} />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div id="produtos" />

        {products.length === 0 ? (
          <p className="text-sm text-ink-muted">Essa loja ainda não tem produtos disponíveis.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 mb-24">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={cart[product.id] || 0}
                onAdd={() => addToCart(product.id)}
                onChangeQty={(q) => changeQty(product.id, q)}
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
                className="bg-amber text-white text-sm font-medium rounded-full px-5 py-2.5"
              >
                Finalizar pedido
              </button>
            </div>
          </div>
        )}

        {showCheckout && (
          <CheckoutModal
            accountId={accountId}
            items={cartItems}
            total={total}
            onClose={() => setShowCheckout(false)}
          />
        )}
      </div>
    </main>
  );
}

function ProductCard({
  product,
  quantity,
  onAdd,
  onChangeQty,
}: {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onChangeQty: (q: number) => void;
}) {
  const outOfStock = product.stock != null && product.stock <= 0;

  return (
    <div className="border border-line bg-surface rounded-2xl overflow-hidden flex flex-col">
      <div className="aspect-square bg-paper flex items-center justify-center">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-ink-muted text-xs">sem foto</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <p className="font-medium text-ink">{product.name}</p>
        {product.description && (
          <p className="text-xs text-ink-muted mt-1 line-clamp-2">{product.description}</p>
        )}
        <p className="font-spec text-amber font-medium mt-2">{money(product.price)}</p>
        <div className="mt-auto pt-3">
          {outOfStock ? (
            <p className="text-xs text-danger">Esgotado</p>
          ) : quantity === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="w-full bg-amber text-white text-sm font-medium rounded-full py-2"
            >
              Adicionar
            </button>
          ) : (
            <div className="flex items-center justify-between border border-line rounded-full px-3 py-1.5">
              <button type="button" onClick={() => onChangeQty(quantity - 1)} className="text-ink px-2">
                −
              </button>
              <span className="text-sm font-spec text-ink">{quantity}</span>
              <button type="button" onClick={() => onChangeQty(quantity + 1)} className="text-ink px-2">
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckoutModal({
  accountId,
  items,
  total,
  onClose,
}: {
  accountId: string;
  items: { product: Product; quantity: number }[];
  total: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(checkoutStoreCart, undefined);
  const cartJson = JSON.stringify(items.map((i) => ({ productId: i.product.id, quantity: i.quantity })));

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
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
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

        <div className="space-y-1.5 text-sm mb-4 pb-4 border-b border-line">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex justify-between text-ink">
              <span>{quantity}x {product.name}</span>
              <span className="font-spec">{money(product.price * quantity)}</span>
            </div>
          ))}
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
            className="w-full bg-amber text-white font-medium rounded-full py-3 text-sm disabled:opacity-50"
          >
            {pending ? "Gerando pagamento…" : "Ir para o pagamento"}
          </button>
        </form>
      </div>
    </div>
  );
}
