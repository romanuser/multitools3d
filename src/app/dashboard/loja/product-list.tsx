"use client";

import { useActionState, useState } from "react";
import { saveProduct, deleteProduct } from "@/lib/store/actions";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  active: boolean;
  image_url: string | null;
  print_printer_id: string | null;
  print_filament_id: string | null;
  print_weight_g: number | null;
  print_time_min: number | null;
};

type Printer = { id: string; name: string };
type FilamentOption = { id: string; label: string };

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProductList({
  products,
  printers,
  filaments,
}: {
  products: Product[];
  printers: Printer[];
  filaments: FilamentOption[];
}) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-3">
      {products.length === 0 && (
        <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
          Nenhum produto cadastrado ainda.
        </p>
      )}
      {products.map((product) => (
        <div key={product.id} className="border border-line bg-surface rounded-2xl p-4 flex items-center gap-4">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-line shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-paper border border-line flex items-center justify-center text-ink-muted text-xs shrink-0">
              sem foto
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-ink truncate">{product.name}</p>
              {!product.active && (
                <span className="text-xs text-ink-muted border border-line rounded-full px-2 py-0.5 shrink-0">
                  inativo
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted font-spec">
              {money(product.price)} {product.stock != null && `· ${product.stock} em estoque`}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditing(product);
                setShowForm(true);
              }}
              className="text-xs text-ink-muted hover:text-ink underline underline-offset-2"
            >
              Editar
            </button>
            <DeleteButton productId={product.id} />
          </div>
        </div>
      ))}

      {!showForm && (
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 hover:bg-amber-soft transition-colors"
        >
          + Novo produto
        </button>
      )}

      {showForm && (
        <ProductForm
          key={editing?.id ?? "new"}
          product={editing}
          printers={printers}
          filaments={filaments}
          onDone={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function DeleteButton({ productId }: { productId: string }) {
  const [pending, setPending] = useState(false);
  async function onClick() {
    if (!confirm("Apagar esse produto?")) return;
    setPending(true);
    await deleteProduct(productId);
    setPending(false);
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs text-danger hover:underline underline-offset-2 disabled:opacity-50"
    >
      {pending ? "Apagando…" : "Apagar"}
    </button>
  );
}

function ProductForm({
  product,
  printers,
  filaments,
  onDone,
}: {
  product: Product | null;
  printers: Printer[];
  filaments: FilamentOption[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveProduct, undefined);
  const [preview, setPreview] = useState<string | null>(product?.image_url ?? null);

  if (state !== undefined && !state.error && !pending) {
    queueMicrotask(onDone);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="border border-line bg-surface rounded-2xl p-6 space-y-4">
      <input type="hidden" name="productId" value={product?.id ?? ""} />
      <p className="font-display text-lg text-ink">{product ? "Editar produto" : "Novo produto"}</p>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl border border-line bg-paper overflow-hidden flex items-center justify-center shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-ink-muted text-xs text-center px-1">sem foto</span>
          )}
        </div>
        <label className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 cursor-pointer hover:bg-amber-soft transition-colors">
          Escolher foto
          <input type="file" name="photo" accept="image/*" className="hidden" onChange={onFileChange} />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Nome</span>
        <input name="name" defaultValue={product?.name} required className="input" />
      </label>
      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Descrição (opcional)</span>
        <textarea name="description" defaultValue={product?.description ?? ""} rows={2} className="input" />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Preço (R$)</span>
          <input type="number" step="0.01" min="0.01" name="price" defaultValue={product?.price} required className="input font-spec" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Estoque (opcional)</span>
          <input type="number" min="0" name="stock" defaultValue={product?.stock ?? ""} className="input font-spec" placeholder="deixe em branco = ilimitado" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="accent-amber" />
        Visível na loja
      </label>

      <div className="border-t border-line pt-4">
        <p className="text-sm font-medium text-ink mb-1">Receita de impressão (opcional)</p>
        <p className="text-xs text-ink-muted mb-3">
          Se preencher isso, toda vez que um pedido desse produto for pago, a impressão entra
          sozinha na fila.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Impressora</span>
            <select name="printPrinterId" defaultValue={product?.print_printer_id ?? ""} className="input">
              <option value="">Nenhuma (não entra na fila sozinho)</option>
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Filamento</span>
            <select name="printFilamentId" defaultValue={product?.print_filament_id ?? ""} className="input">
              <option value="">Selecione…</option>
              {filaments.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Gramagem por unidade</span>
            <input
              type="number"
              name="printWeightG"
              min="1"
              defaultValue={product?.print_weight_g ?? ""}
              className="input font-spec"
            />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Tempo estimado (min, opcional)</span>
            <input
              type="number"
              name="printTimeMin"
              min="0"
              defaultValue={product?.print_time_min ?? ""}
              className="input font-spec"
            />
          </label>
        </div>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-white font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-ink-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}
