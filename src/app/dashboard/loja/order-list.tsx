"use client";

import { useState } from "react";
import { updateOrderStatus, deleteOrder } from "@/lib/store/actions";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/store/order-status";

type OrderItem = { description: string; quantity: number; unit_price: number; total: number };
type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGAMENTO_CONFIRMADO: "Pagamento confirmado",
  EM_PRODUCAO: "Em produção",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const money = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OrderList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-ink-muted border border-dashed border-line rounded-2xl p-6">
        Nenhum pedido ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState(order.status);

  async function onStatusChange(newStatus: OrderStatus) {
    setPending(true);
    const result = await updateOrderStatus(order.id, newStatus);
    setPending(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setStatus(newStatus);

    if (order.customer_phone) {
      const phone = order.customer_phone.replace(/\D/g, "");
      const normalized = phone.startsWith("55") ? phone : `55${phone}`;
      const message = `Olá ${order.customer_name}! O status do seu pedido mudou para: ${STATUS_LABELS[newStatus] || newStatus}.`;
      window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, "_blank");
    }
  }

  async function onDelete() {
    if (!confirm("Apagar esse pedido? Essa ação não pode ser desfeita.")) return;
    setPending(true);
    const result = await deleteOrder(order.id);
    setPending(false);
    if (result.error) alert(result.error);
  }

  return (
    <div className="border border-line bg-surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-ink font-medium">{order.customer_name}</p>
          <p className="text-xs text-ink-muted">{order.customer_email}</p>
          {order.customer_phone && <p className="text-xs text-ink-muted">{order.customer_phone}</p>}
        </div>
        <p className="text-sm font-spec text-ink">{money(order.total)}</p>
      </div>

      <div className="mt-2 space-y-0.5">
        {order.items?.map((item, i) => (
          <p key={i} className="text-xs text-ink-muted">
            {item.quantity}x {item.description}
          </p>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-3 flex-wrap">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
          disabled={pending}
          className="input text-sm py-1.5 w-auto"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="text-xs text-danger hover:underline underline-offset-2 disabled:opacity-50"
        >
          Apagar pedido
        </button>
      </div>
    </div>
  );
}
