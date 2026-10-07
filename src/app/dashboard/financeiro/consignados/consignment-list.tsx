"use client";

import { useActionState, useState } from "react";
import { createConsignment, settleConsignment } from "@/lib/finance/actions";

const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");

type Product = { id: string; name: string; price: number; image_url: string | null };
type Settlement = {
  id: string;
  consignment_id: string;
  settlement_date: string;
  quantity_sold: number;
  quantity_returned: number;
  amount_due: number;
};
type Consignment = {
  id: string;
  product_id: string;
  partner_store_name: string;
  unit_price: number;
  quantity_delivered: number;
  quantity_remaining: number;
  date_delivered: string;
  billing_period_days: number | null;
  status: string;
  products: { name: string; image_url: string | null } | null;
};

export function ConsignmentList({
  consignments,
  products,
  settlements,
}: {
  consignments: Consignment[];
  products: Product[];
  settlements: Settlement[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const active = consignments.filter((c) => c.status === "ativo");
  const closed = consignments.filter((c) => c.status !== "ativo");

  return (
    <div className="space-y-6">
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2"
        >
          + Novo consignado
        </button>
      ) : (
        <NewConsignmentForm products={products} onDone={() => setShowForm(false)} />
      )}

      {active.length === 0 && closed.length === 0 && (
        <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
          Nenhum consignado cadastrado ainda.
        </p>
      )}

      {active.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink-muted mb-2.5">Ativos</p>
          <div className="space-y-3">
            {active.map((c) => (
              <ConsignmentCard
                key={c.id}
                consignment={c}
                settlements={settlements.filter((s) => s.consignment_id === c.id)}
                isSettling={settlingId === c.id}
                onOpenSettle={() => setSettlingId(c.id)}
                onCloseSettle={() => setSettlingId(null)}
              />
            ))}
          </div>
        </div>
      )}

      {closed.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink-muted mb-2.5">Encerrados</p>
          <div className="space-y-3">
            {closed.map((c) => (
              <ConsignmentCard
                key={c.id}
                consignment={c}
                settlements={settlements.filter((s) => s.consignment_id === c.id)}
                isSettling={false}
                onOpenSettle={() => {}}
                onCloseSettle={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewConsignmentForm({ products, onDone }: { products: Product[]; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createConsignment, undefined);
  const [productMode, setProductMode] = useState<"existente" | "novo">("existente");

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onDone();
      }}
      className="border border-line bg-surface rounded-2xl p-6 space-y-4 max-w-lg"
    >
      <p className="font-display text-lg text-ink">Novo consignado</p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setProductMode("existente")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
            productMode === "existente" ? "border-amber bg-amber-soft text-ink" : "border-line text-ink-muted"
          }`}
        >
          Produto já cadastrado
        </button>
        <button
          type="button"
          onClick={() => setProductMode("novo")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
            productMode === "novo" ? "border-amber bg-amber-soft text-ink" : "border-line text-ink-muted"
          }`}
        >
          Produto novo
        </button>
      </div>

      {productMode === "existente" ? (
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Produto</span>
          <select name="existingProductId" required={productMode === "existente"} className="input">
            <option value="">Selecione…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {money(p.price)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Nome do produto</span>
            <input name="newProductName" required={productMode === "novo"} className="input" />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-1">Preço (R$)</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="newProductPrice"
              required={productMode === "novo"}
              className="input font-spec"
            />
          </label>
          <p className="text-xs text-ink-muted sm:col-span-2">
            Esse produto já entra também no catálogo da sua loja virtual.
          </p>
        </div>
      )}

      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Loja parceira</span>
        <input name="partnerStoreName" required className="input" placeholder="Ex: Papelaria Sol Nascente" />
      </label>

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Quantidade entregue</span>
          <input type="number" min="1" name="quantity" required className="input font-spec" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Data de entrega</span>
          <input
            type="date"
            name="dateDelivered"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Acerto a cada (dias)</span>
          <input type="number" min="1" name="billingPeriodDays" placeholder="Ex: 15" className="input font-spec" />
        </label>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-on-accent font-medium rounded-full px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Cadastrar"}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-ink-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ConsignmentCard({
  consignment: c,
  settlements,
  isSettling,
  onOpenSettle,
  onCloseSettle,
}: {
  consignment: Consignment;
  settlements: Settlement[];
  isSettling: boolean;
  onOpenSettle: () => void;
  onCloseSettle: () => void;
}) {
  return (
    <div className="border border-line bg-surface rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {c.products?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.products.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-line shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-paper border border-line shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-ink truncate">{c.products?.name || "Produto"}</p>
            <p className="text-xs text-ink-muted">
              {c.partner_store_name} · desde {dateFmt(c.date_delivered)}
              {c.billing_period_days ? ` · acerto a cada ${c.billing_period_days}d` : ""}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-spec text-sm text-ink">
            {c.quantity_remaining} / {c.quantity_delivered}
          </p>
          <p className="text-xs text-ink-muted">restantes</p>
        </div>
      </div>

      {settlements.length > 0 && (
        <div className="mt-3 pt-3 border-t border-line space-y-1">
          {settlements.map((s) => (
            <p key={s.id} className="text-xs text-ink-muted">
              {dateFmt(s.settlement_date)} — {s.quantity_sold}x vendido, {s.quantity_returned}x recolhido
              {s.amount_due > 0 && ` · ${money(s.amount_due)}`}
            </p>
          ))}
        </div>
      )}

      {c.status === "ativo" && (
        <div className="mt-3 pt-3 border-t border-line">
          {!isSettling ? (
            <button type="button" onClick={onOpenSettle} className="text-xs text-amber hover:underline">
              Fazer acerto
            </button>
          ) : (
            <SettleForm consignment={c} onDone={onCloseSettle} />
          )}
        </div>
      )}
    </div>
  );
}

function SettleForm({ consignment: c, onDone }: { consignment: Consignment; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(settleConsignment, undefined);
  const [quantitySold, setQuantitySold] = useState(0);
  const [quantityReturned, setQuantityReturned] = useState(0);
  const [amountPaidNow, setAmountPaidNow] = useState(0);
  const [action, setAction] = useState<"cobrar" | "pendencia" | "baixar_sem_cobrar">("cobrar");

  const amountDue = quantitySold * Number(c.unit_price);
  const maxQty = c.quantity_remaining;
  const [defaultNewDueDate] = useState(() => new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10));

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onDone();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="consignmentId" value={c.id} />
      <input type="hidden" name="action" value={action} />

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs text-ink-muted mb-1">Quantidade vendida</span>
          <input
            type="number"
            min="0"
            max={maxQty}
            name="quantitySold"
            value={quantitySold}
            onChange={(e) => setQuantitySold(Number(e.target.value))}
            className="input font-spec"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-ink-muted mb-1">Quantidade recolhida</span>
          <input
            type="number"
            min="0"
            max={maxQty}
            name="quantityReturned"
            value={quantityReturned}
            onChange={(e) => setQuantityReturned(Number(e.target.value))}
            className="input font-spec"
          />
        </label>
      </div>

      <p className="text-xs text-ink-muted">
        Restam {maxQty} unidade(s) nesse lote. Valor a cobrar: <span className="text-ink font-spec">{money(amountDue)}</span>
      </p>

      {amountDue > 0 && (
        <>
          <label className="block max-w-[200px]">
            <span className="block text-xs text-ink-muted mb-1">Valor recebido agora (R$)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="amountPaidNow"
              value={amountPaidNow}
              onChange={(e) => setAmountPaidNow(Number(e.target.value))}
              className="input font-spec"
            />
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="radio"
                checked={action === "cobrar"}
                onChange={() => setAction("cobrar")}
                className="accent-amber"
              />
              Gerar link de cobrança do valor cheio
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="radio"
                checked={action === "pendencia"}
                onChange={() => setAction("pendencia")}
                className="accent-amber"
              />
              Recebi só uma parte — criar pendência do restante com novo prazo
            </label>
            {action === "pendencia" && (
              <input
                type="date"
                name="newDueDate"
                className="input max-w-[200px] ml-6"
                defaultValue={defaultNewDueDate}
              />
            )}
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="radio"
                checked={action === "baixar_sem_cobrar"}
                onChange={() => setAction("baixar_sem_cobrar")}
                className="accent-amber"
              />
              Dar baixa mesmo assim (recebi o que recebi, não vou cobrar o resto)
            </label>
          </div>
        </>
      )}

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-on-accent font-medium rounded-full px-4 py-2 text-xs disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Confirmar acerto"}
        </button>
        <button type="button" onClick={onDone} className="text-xs text-ink-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}
