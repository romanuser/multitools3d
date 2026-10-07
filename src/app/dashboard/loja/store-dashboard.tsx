import { Icon, type IconName } from "@/components/icons";

type Product = {
  id: string;
  active: boolean;
  stock: number | null;
  print_printer_id: string | null;
  print_filament_id: string | null;
  print_weight_g: number | null;
  available_colors: string[];
  color_filament_material: string | null;
  color_filament_grams: number | null;
  filament_rows?: { filament_stock_id: string; grams: number }[];
};

type Order = {
  id: string;
  total: number;
  status: string;
  created_at: string;
};

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGAMENTO_CONFIRMADO: "Pagamento confirmado",
  EM_PRODUCAO: "Em produção",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "bg-ink-muted/40",
  PAGAMENTO_CONFIRMADO: "bg-amber",
  EM_PRODUCAO: "bg-amber",
  ENVIADO: "bg-good",
  ENTREGUE: "bg-good",
  CANCELADO: "bg-danger",
};

function hasIncompleteRecipe(p: Product) {
  const hasPrinter = !!p.print_printer_id;

  // Produto com cor: a receita certa é material + gramagem (não o
  // filamento específico) — mesma regra usada na lista de produtos.
  if ((p.available_colors?.length ?? 0) > 0) {
    const hasColorRecipe = !!(p.color_filament_material && p.color_filament_grams);
    return (hasPrinter || hasColorRecipe) && !(hasPrinter && hasColorRecipe);
  }

  const hasMulti = (p.filament_rows?.length ?? 0) > 0;
  const hasSingle = !!(p.print_filament_id && p.print_weight_g);
  const hasAnyFilament = hasMulti || hasSingle;
  return (hasPrinter || hasAnyFilament) && !(hasPrinter && hasAnyFilament);
}

export function StoreDashboard({ products, orders }: { products: Product[]; orders: Order[] }) {
  const paidStatuses = ["PAGAMENTO_CONFIRMADO", "EM_PRODUCAO", "ENVIADO", "ENTREGUE"];
  const paidOrders = orders.filter((o) => paidStatuses.includes(o.status));
  const pendingOrders = orders.filter((o) => o.status === "AGUARDANDO_PAGAMENTO");
  const inProductionOrders = orders.filter((o) => o.status === "EM_PRODUCAO");

  const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const avgTicket = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

  const activeProducts = products.filter((p) => p.active);
  const lowStockProducts = products.filter((p) => p.active && p.stock != null && p.stock <= 3);
  const incompleteRecipeProducts = products.filter(hasIncompleteRecipe);

  const days: { label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayStr = day.toISOString().slice(0, 10);
    const total = paidOrders
      .filter((o) => typeof o.created_at === "string" && o.created_at.slice(0, 10) === dayStr)
      .reduce((sum, o) => sum + Number(o.total), 0);
    days.push({ label: day.toLocaleDateString("pt-BR", { weekday: "short" }), total });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.total));
  const weekTotal = days.reduce((sum, d) => sum + d.total, 0);

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const statusOrder = ["AGUARDANDO_PAGAMENTO", "PAGAMENTO_CONFIRMADO", "EM_PRODUCAO", "ENVIADO", "ENTREGUE", "CANCELADO"];

  return (
    <div className="space-y-5 mb-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="wallet" label="Faturado (pago)" value={money(revenue)} accent="amber" />
        <StatCard
          icon="quote"
          label="Pedidos"
          value={String(orders.length)}
          sub={pendingOrders.length > 0 ? `${pendingOrders.length} aguardando pagamento` : "Tudo em dia"}
        />
        <StatCard icon="trend" label="Ticket médio" value={paidOrders.length > 0 ? money(avgTicket) : "—"} />
        <StatCard icon="cube" label="Produtos ativos" value={`${activeProducts.length} / ${products.length}`} />
      </div>

      {(pendingOrders.length > 0 ||
        inProductionOrders.length > 0 ||
        lowStockProducts.length > 0 ||
        incompleteRecipeProducts.length > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {pendingOrders.length > 0 && (
            <StatCard icon="clock" label="Aguardando pagamento" value={String(pendingOrders.length)} compact tone="muted" />
          )}
          {inProductionOrders.length > 0 && (
            <StatCard icon="wrench" label="Em produção" value={String(inProductionOrders.length)} compact tone="amber" />
          )}
          {lowStockProducts.length > 0 && (
            <StatCard icon="spool" label="Estoque baixo" value={String(lowStockProducts.length)} compact tone="danger" />
          )}
          {incompleteRecipeProducts.length > 0 && (
            <StatCard
              icon="wrench"
              label="Receita incompleta"
              value={String(incompleteRecipeProducts.length)}
              compact
              tone="danger"
            />
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 border border-line bg-surface rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-sm font-medium text-ink">Vendas pagas nos últimos 7 dias</p>
            <p className="font-spec text-sm text-amber">{money(weekTotal)}</p>
          </div>
          <div className="flex items-end gap-2.5 h-28">
            {days.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end" style={{ height: "88px" }}>
                  <div
                    className="w-full bg-amber/90 rounded-t-md transition-all"
                    style={{ height: `${Math.max(3, (day.total / maxDay) * 100)}%` }}
                    title={money(day.total)}
                  />
                </div>
                <span className="text-xs text-ink-muted capitalize">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 border border-line bg-surface rounded-2xl p-5">
          <p className="text-sm font-medium text-ink mb-4">Pedidos por status</p>
          {orders.length === 0 ? (
            <p className="text-xs text-ink-muted">Nenhum pedido ainda.</p>
          ) : (
            <>
              <div className="h-2.5 rounded-full overflow-hidden flex bg-paper mb-4">
                {statusOrder.map(
                  (status) =>
                    statusCounts[status] > 0 && (
                      <div
                        key={status}
                        className={STATUS_COLORS[status]}
                        style={{ width: `${(statusCounts[status] / orders.length) * 100}%` }}
                        title={`${STATUS_LABELS[status]}: ${statusCounts[status]}`}
                      />
                    )
                )}
              </div>
              <div className="space-y-1.5">
                {statusOrder.map(
                  (status) =>
                    statusCounts[status] > 0 && (
                      <div key={status} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-ink-muted">
                          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                          {STATUS_LABELS[status]}
                        </span>
                        <span className="font-spec text-ink">{statusCounts[status]}</span>
                      </div>
                    )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  tone,
  compact,
}: {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
  accent?: "amber";
  tone?: "muted" | "amber" | "danger";
  compact?: boolean;
}) {
  const toneColor = tone === "danger" ? "text-danger" : tone === "amber" ? "text-amber" : "text-ink-muted";
  const iconBg = accent === "amber" ? "bg-amber text-on-accent" : "bg-surface-raised text-amber border border-line";

  return (
    <div className={`border border-line bg-surface rounded-2xl ${compact ? "p-3.5" : "p-4"} flex items-start gap-3`}>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-muted leading-tight">{label}</p>
        <p className={`font-display text-lg font-semibold tracking-tight mt-0.5 ${tone ? toneColor : "text-ink"}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-ink-muted mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}
