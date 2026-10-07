"use client";

import { useActionState, useState } from "react";
import { savePayable, markPayablePaid, deletePayable, saveSupplier, deleteSupplier } from "@/lib/finance/actions";
import { ThermalReceipt } from "@/components/thermal-receipt";

const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");

const CATEGORY_LABELS: Record<string, string> = {
  prolabore: "Pró-labore",
  consignado_insumo: "Consignado de insumos",
  custo_mensal: "Custo mensal",
  outro: "Outro",
};

type Supplier = { id: string; name: string; contact: string | null };
type Payable = {
  id: string;
  category: string;
  supplier_id: string | null;
  description: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  recurrence: string | null;
  status: string;
  settled_at: string | null;
  created_at: string;
  suppliers: { name: string } | null;
};

export function PayableList({ payables, suppliers }: { payables: Payable[]; suppliers: Supplier[] }) {
  const [showForm, setShowForm] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [receiptFor, setReceiptFor] = useState<Payable | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2"
        >
          {showForm ? "Fechar" : "+ Nova conta a pagar"}
        </button>
        <button
          type="button"
          onClick={() => setShowSuppliers((v) => !v)}
          className="text-sm text-ink-muted border border-line rounded-full px-4 py-2"
        >
          {showSuppliers ? "Fechar" : "Fornecedores"}
        </button>
      </div>

      {showSuppliers && <SupplierManager suppliers={suppliers} />}
      {showForm && <NewPayableForm suppliers={suppliers} onDone={() => setShowForm(false)} />}

      {payables.length === 0 ? (
        <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
          Nenhuma conta a pagar cadastrada ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {payables.map((p) => {
            const isSettled = p.status === "pago";
            const isOverdue = !isSettled && p.due_date < today;
            return (
              <div key={p.id} className="border border-line bg-surface rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink">{p.description}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {CATEGORY_LABELS[p.category] || p.category}
                      {p.suppliers?.name ? ` · ${p.suppliers.name}` : ""}
                      {p.recurrence ? ` · ${p.recurrence}` : ""}
                    </p>
                    <p className={`text-xs mt-0.5 ${isOverdue ? "text-danger" : "text-ink-muted"}`}>
                      Prazo: {dateFmt(p.due_date)} {isOverdue && "· atrasado"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-spec text-sm text-ink">{money(p.total_amount)}</p>
                    <p className="text-xs text-ink-muted">
                      {p.paid_amount > 0 && p.paid_amount < p.total_amount ? `${money(p.paid_amount)} pago · ` : ""}
                      {p.status === "pago" ? "Pago" : p.status === "parcial" ? "Pago parcial" : "Pendente"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line">
                  {!isSettled ? (
                    <MarkPayablePaidButton payable={p} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReceiptFor(p)}
                      className="text-xs text-amber hover:underline"
                    >
                      Ver cupom
                    </button>
                  )}
                  <DeletePayableButton id={p.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {receiptFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setReceiptFor(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ThermalReceipt
              storeName="Comprovante financeiro"
              title="Pagamento"
              reference={receiptFor.description}
              date={dateFmt(receiptFor.settled_at || receiptFor.created_at)}
              lines={[{ label: receiptFor.description, value: receiptFor.paid_amount }]}
              total={receiptFor.paid_amount}
              footerNote="Comprovante interno — guarde para seu controle"
            />
            <div className="text-center mt-3">
              <button type="button" onClick={() => setReceiptFor(null)} className="text-sm text-ink-muted hover:text-ink">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SupplierManager({ suppliers }: { suppliers: Supplier[] }) {
  const [state, formAction, pending] = useActionState(saveSupplier, undefined);

  return (
    <div className="border border-line bg-surface rounded-2xl p-5">
      <p className="font-display text-base text-ink mb-3">Fornecedores</p>
      {suppliers.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {suppliers.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">
                {s.name} {s.contact && <span className="text-ink-muted">· {s.contact}</span>}
              </span>
              <button
                type="button"
                onClick={() => deleteSupplier(s.id)}
                className="text-xs text-ink-muted hover:text-danger"
              >
                remover
              </button>
            </div>
          ))}
        </div>
      )}
      <form action={formAction} className="flex gap-2">
        <input name="name" placeholder="Nome do fornecedor" required className="input flex-1" />
        <input name="contact" placeholder="Contato (opcional)" className="input flex-1" />
        <button
          type="submit"
          disabled={pending}
          className="bg-amber text-on-accent text-sm rounded-full px-4 shrink-0 disabled:opacity-50"
        >
          + Add
        </button>
      </form>
      {state?.error && <p className="text-sm text-danger mt-2">{state.error}</p>}
    </div>
  );
}

function NewPayableForm({ suppliers, onDone }: { suppliers: Supplier[]; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(savePayable, undefined);
  const [category, setCategory] = useState("outro");

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onDone();
      }}
      className="border border-line bg-surface rounded-2xl p-6 space-y-4 max-w-lg"
    >
      <p className="font-display text-lg text-ink">Nova conta a pagar</p>

      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Categoria</span>
        <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="input">
          <option value="prolabore">Pró-labore</option>
          <option value="consignado_insumo">Consignado de insumos</option>
          <option value="custo_mensal">Custo mensal</option>
          <option value="outro">Outro</option>
        </select>
      </label>

      {category === "consignado_insumo" && (
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Fornecedor</span>
          <select name="supplierId" className="input">
            <option value="">Selecione…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Descrição</span>
        <input name="description" required className="input" placeholder="Ex: 5kg PETG fiado" />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Valor (R$)</span>
          <input type="number" step="0.01" min="0.01" name="totalAmount" required className="input font-spec" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-1">Prazo</span>
          <input type="date" name="dueDate" required className="input" />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm text-ink-muted mb-1">Modalidade (opcional)</span>
        <input name="recurrence" className="input" placeholder="Ex: mensal, único, a cada 15 dias" />
      </label>

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

function MarkPayablePaidButton({ payable: p }: { payable: Payable }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(p.total_amount - p.paid_amount));
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-good hover:underline">
        Marcar como pago
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="input font-spec w-28 py-1 text-xs"
      />
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await markPayablePaid(p.id, Number(amount));
          setPending(false);
          setOpen(false);
        }}
        className="text-xs bg-amber text-on-accent rounded-full px-3 py-1.5 disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Confirmar"}
      </button>
    </div>
  );
}

function DeletePayableButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await deletePayable(id);
      }}
      className="text-xs text-ink-muted hover:text-danger disabled:opacity-50"
    >
      remover
    </button>
  );
}
