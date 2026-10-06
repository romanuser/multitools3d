"use client";

import { useActionState, useState } from "react";
import { saveProduct, deleteProduct, reorderProduct } from "@/lib/store/actions";
import { FilamentRowsPicker } from "@/components/filament-rows-picker";
import { FieldTooltip } from "@/components/field-tooltip";
import { Icon } from "@/components/icons";

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
  shipping_weight: number | null;
  shipping_width: number | null;
  shipping_height: number | null;
  shipping_length: number | null;
  available_colors: string[];
  customizable: boolean;
  customization_price: number;
  category: string | null;
  color_filament_material: string | null;
  color_filament_grams: number | null;
  display_order: number;
  filament_rows?: { filament_stock_id: string; grams: number }[];
};

const PRESET_CATEGORIES = ["Decorações", "Automotivo", "Presentes", "Para empresas", "Para eventos"];

type Printer = { id: string; name: string };
type FilamentOption = { id: string; label: string };

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Receita "completa" = tem impressora E (1 filamento+peso OU vários
// filamentos cadastrados). Se só uma parte foi preenchida, é "incompleta"
// — o produto não vai gerar peça sozinho na fila quando alguém comprar.
function recipeStatus(product: Product): "none" | "partial" | "complete" {
  const hasPrinter = !!product.print_printer_id;

  if (product.available_colors.length > 0) {
    // Produto com cor: a receita é material + gramagem (a cor exata vem
    // do cliente na hora da compra).
    const hasColorRecipe = !!(product.color_filament_material && product.color_filament_grams);
    if (!hasPrinter && !hasColorRecipe) return "none";
    if (hasPrinter && hasColorRecipe) return "complete";
    return "partial";
  }

  const hasMulti = (product.filament_rows?.length ?? 0) > 0;
  const hasSingle = !!(product.print_filament_id && product.print_weight_g);
  const hasAnyFilament = hasMulti || hasSingle;

  if (!hasPrinter && !hasAnyFilament) return "none";
  if (hasPrinter && hasAnyFilament) return "complete";
  return "partial";
}

export function ProductList({
  products,
  printers,
  filaments,
  materials,
}: {
  products: Product[];
  printers: Printer[];
  filaments: FilamentOption[];
  materials: string[];
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
      {products.length > 1 && (
        <p className="text-xs text-ink-muted -mb-1 flex items-center gap-1.5">
          <Icon name="chevron" size={12} className="-rotate-90" />
          Use as setinhas em cada card pra organizar a ordem que aparece na loja.
        </p>
      )}
      {products.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, index) => {
            const recipe = recipeStatus(product);
            const orderedIds = products.map((p) => p.id);
            return (
              <div key={product.id} className="border border-line bg-surface rounded-2xl overflow-hidden flex flex-col">
                <div className="aspect-[4/3] bg-paper flex items-center justify-center relative">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-ink-muted text-xs">sem foto</span>
                  )}
                  {!product.active && (
                    <span className="absolute top-2 left-2 text-xs bg-paper/90 border border-line rounded-full px-2 py-0.5 text-ink-muted">
                      Oculto na loja
                    </span>
                  )}
                  {products.length > 1 && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => reorderProduct(product.id, "up", orderedIds)}
                        disabled={index === 0}
                        aria-label="Mover pra cima"
                        className="w-6 h-6 rounded-full bg-paper/90 border border-line flex items-center justify-center text-ink disabled:opacity-30 hover:border-amber/50"
                      >
                        <Icon name="chevron" size={13} className="rotate-[-90deg]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => reorderProduct(product.id, "down", orderedIds)}
                        disabled={index === products.length - 1}
                        aria-label="Mover pra baixo"
                        className="w-6 h-6 rounded-full bg-paper/90 border border-line flex items-center justify-center text-ink disabled:opacity-30 hover:border-amber/50"
                      >
                        <Icon name="chevron" size={13} className="rotate-90" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  {product.category && <p className="text-xs text-amber mb-0.5">{product.category}</p>}
                  <p className="font-medium text-ink truncate">{product.name}</p>
                  <p className="text-sm text-ink-muted font-spec mt-0.5">
                    {money(product.price)}
                    {product.stock != null && <span className="text-xs"> · {product.stock} em estoque</span>}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {product.available_colors.length > 0 && (
                      <span className="text-xs text-ink-muted border border-line rounded-full px-2 py-0.5">
                        {product.available_colors.length} {product.available_colors.length === 1 ? "cor" : "cores"}
                      </span>
                    )}
                    {product.customizable && (
                      <span className="text-xs text-ink-muted border border-line rounded-full px-2 py-0.5">
                        personalizável
                      </span>
                    )}
                  </div>

                  {recipe === "partial" && (
                    <p className="flex items-start gap-1.5 text-xs text-warn mt-3 rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-2">
                      <span className="shrink-0">⚠</span>
                      Receita de impressão incompleta — falta{" "}
                      {!product.print_printer_id ? "a impressora" : "o filamento/peso"}. Essa peça não entra na fila
                      sozinha quando alguém comprar.
                    </p>
                  )}

                  <div className="flex gap-3 mt-auto pt-3">
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
              </div>
            );
          })}
        </div>
      )}

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
          materials={materials}
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

const CUSTOM_CATEGORY = "__custom__";

function CategoryPicker({ initialValue }: { initialValue: string }) {
  const isPreset = PRESET_CATEGORIES.includes(initialValue);
  const [selected, setSelected] = useState(initialValue && !isPreset ? CUSTOM_CATEGORY : initialValue);
  const [customValue, setCustomValue] = useState(initialValue && !isPreset ? initialValue : "");

  const isCustom = selected === CUSTOM_CATEGORY;

  return (
    <div className="block">
      <span className="block text-sm text-ink-muted mb-1">Categoria (opcional)</span>
      <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input">
        <option value="">Sem categoria</option>
        {PRESET_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={CUSTOM_CATEGORY}>Outra categoria (digitar)…</option>
      </select>
      {isCustom && (
        <input
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="Nome da nova categoria"
          className="input mt-2"
        />
      )}
      {/* O que vai pro servidor é sempre esse campo escondido — assim o
          formulário não precisa saber se veio do select ou do texto. */}
      <input type="hidden" name="category" value={isCustom ? customValue : selected} />
    </div>
  );
}

function ProductForm({
  product,
  printers,
  filaments,
  materials,
  onDone,
}: {
  product: Product | null;
  printers: Printer[];
  filaments: FilamentOption[];
  materials: string[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveProduct, undefined);
  const [preview, setPreview] = useState<string | null>(product?.image_url ?? null);
  const [customizable, setCustomizable] = useState(product?.customizable ?? false);
  const [colorsText, setColorsText] = useState(product?.available_colors?.join(", ") ?? "");
  const hasColors = colorsText.trim().length > 0;

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
      <CategoryPicker initialValue={product?.category ?? ""} />
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">
            Preço (R$)
            <FieldTooltip>O valor final que o cliente vê e paga por uma unidade, já com sua margem incluída.</FieldTooltip>
          </span>
          <input type="number" step="0.01" min="0.01" name="price" defaultValue={product?.price} required className="input font-spec" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">
            Estoque (opcional)
            <FieldTooltip>
              Quantas unidades prontas você já tem. Deixe em branco se a peça é feita sob encomenda (estoque
              ilimitado) — nesse caso ela nunca aparece como esgotada.
            </FieldTooltip>
          </span>
          <input type="number" min="0" name="stock" defaultValue={product?.stock ?? ""} className="input font-spec" placeholder="deixe em branco = ilimitado" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="accent-amber" />
        Visível na loja
        <FieldTooltip>
          Desmarque pra esconder o produto da loja temporariamente (ex: enquanto ajusta foto ou preço) sem apagar o
          cadastro. Continua aparecendo aqui no seu painel normalmente.
        </FieldTooltip>
      </label>

      <div className="border-t border-line pt-4">
        <p className="text-sm font-medium text-ink mb-1">Cores e personalização (opcional)</p>
        <label className="block mb-3">
          <span className="block text-sm text-ink-muted mb-1">
            Cores disponíveis (separadas por vírgula)
            <FieldTooltip>
              Se o produto vier em mais de uma cor, liste todas aqui (ex: Branco, Preto, Verde). O cliente escolhe
              uma na hora de comprar. Deixe em branco se não tiver opção de cor.
            </FieldTooltip>
          </span>
          <input
            name="availableColors"
            value={colorsText}
            onChange={(e) => setColorsText(e.target.value)}
            className="input"
            placeholder="Branco, Preto, Verde"
          />
          <span className="block text-xs text-ink-muted mt-1">
            Deixe em branco se o produto não tiver opção de cor. Se preencher, o cliente escolhe uma na loja.
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink mb-2">
          <input
            type="checkbox"
            name="customizable"
            checked={customizable}
            onChange={(e) => setCustomizable(e.target.checked)}
            className="accent-amber"
          />
          Permite personalização (ex: nome gravado, cor customizada)
          <FieldTooltip>
            Marque se você aceita customizar essa peça (gravar um nome, mudar um detalhe). Ao marcar, aparece o campo
            de quanto cobrar a mais por isso.
          </FieldTooltip>
        </label>
        {customizable && (
          <label className="block max-w-xs">
            <span className="block text-sm text-ink-muted mb-1">
              Valor extra da personalização (R$)
              <FieldTooltip>Quanto some ao preço quando o cliente marcar a opção de personalizar.</FieldTooltip>
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="customizationPrice"
              defaultValue={product?.customization_price || ""}
              className="input font-spec"
              placeholder="0,00"
            />
          </label>
        )}
      </div>

      <div className="border-t border-line pt-4">
        <p className="text-sm font-medium text-ink mb-1">Receita de impressão (opcional)</p>
        <p className="text-xs text-ink-muted mb-3">
          Se preencher isso, toda vez que um pedido desse produto for pago, a impressão entra
          sozinha na fila. <strong className="text-ink">Importante:</strong> precisa preencher a impressora E o(s)
          filamento(s) — se faltar um dos dois, a peça não entra na fila sozinha.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">
              Impressora
              <FieldTooltip>
                Em qual impressora essa peça deve rodar. Sem isso preenchido (mesmo com filamento escolhido), a peça
                NÃO entra na fila sozinha.
              </FieldTooltip>
            </span>
            <select name="printPrinterId" defaultValue={product?.print_printer_id ?? ""} className="input">
              <option value="">Nenhuma (não entra na fila sozinho)</option>
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            {hasColors ? (
              <>
                <span className="block text-sm text-ink-muted mb-1">
                  Filamento da cor escolhida pelo cliente
                  <FieldTooltip>
                    Como esse produto tem cores, você não escolhe o filamento exato aqui — só o material e a
                    gramagem. Na hora da venda, o sistema desconta automaticamente do estoque da cor que o cliente
                    escolher (dentro desse material). Importante: cadastre no Estoque um filamento desse material
                    pra cada cor listada acima, senão o desconto não encontra o que descontar.
                  </FieldTooltip>
                </span>
                <div className="grid sm:grid-cols-2 gap-3">
                  <select
                    name="colorFilamentMaterial"
                    defaultValue={product?.color_filament_material ?? ""}
                    className="input"
                  >
                    <option value="">Escolha o material</option>
                    {materials.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    name="colorFilamentGrams"
                    defaultValue={product?.color_filament_grams ?? ""}
                    placeholder="Gramas"
                    className="input font-spec"
                  />
                </div>
                {materials.length === 0 && (
                  <p className="text-xs text-warn mt-1.5">
                    Você ainda não tem nenhum filamento cadastrado no Estoque — cadastre pelo menos um antes de
                    preencher isso.
                  </p>
                )}
              </>
            ) : (
              <>
                <span className="block text-sm text-ink-muted mb-1">
                  Filamento(s) por unidade
                  <FieldTooltip>
                    Qual filamento (e quantos gramas) uma unidade gasta. Pode usar mais de um filamento na mesma
                    peça — clique em &quot;+ Adicionar outro filamento&quot;.
                  </FieldTooltip>
                </span>
                <FilamentRowsPicker
                  name="filamentsJson"
                  filaments={filaments}
                  gramsLabel="Gramas"
                  initialRows={
                    product?.filament_rows?.length
                      ? product.filament_rows.map((r) => ({ filamentStockId: r.filament_stock_id, grams: String(r.grams) }))
                      : product?.print_filament_id
                        ? [{ filamentStockId: product.print_filament_id, grams: String(product.print_weight_g ?? "") }]
                        : undefined
                  }
                />
              </>
            )}
          </div>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">
              Tempo estimado (min, opcional)
              <FieldTooltip>
                Quanto tempo a impressão de 1 unidade leva, em minutos. Usado pra calcular o prazo de produção
                mostrado pro cliente no pedido.
              </FieldTooltip>
            </span>
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

      <div className="border-t border-line pt-4">
        <p className="text-sm font-medium text-ink mb-1">Medidas de envio (opcional)</p>
        <p className="text-xs text-ink-muted mb-3">
          Se não preencher, a loja usa o &quot;pacote padrão&quot; configurado nas opções de frete.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-xs text-ink-muted mb-1">Peso (g)</span>
            <input type="number" min="1" step="1" name="shippingWeight" defaultValue={product?.shipping_weight ?? ""} className="input font-spec" />
          </label>
          <label className="block">
            <span className="block text-xs text-ink-muted mb-1">Largura (cm)</span>
            <input type="number" name="shippingWidth" defaultValue={product?.shipping_width ?? ""} className="input font-spec" />
          </label>
          <label className="block">
            <span className="block text-xs text-ink-muted mb-1">Altura (cm)</span>
            <input type="number" name="shippingHeight" defaultValue={product?.shipping_height ?? ""} className="input font-spec" />
          </label>
          <label className="block">
            <span className="block text-xs text-ink-muted mb-1">Comprimento (cm)</span>
            <input type="number" name="shippingLength" defaultValue={product?.shipping_length ?? ""} className="input font-spec" />
          </label>
        </div>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
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
