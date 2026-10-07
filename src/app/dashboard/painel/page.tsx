import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAccountPlanStatus, hasFullAccess } from "@/lib/plans/access";
import { OverviewBoard } from "./overview-board";

const PAID_STATUSES = ["PAGAMENTO_CONFIRMADO", "EM_PRODUCAO", "ENVIADO", "ENTREGUE"];

function dayStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function PainelGeralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getAccountPlanStatus(user.id);
  const showStore = hasFullAccess(plan);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { data: printers },
    { data: filaments },
    { data: jobs },
    storeOrdersData,
    productsData,
    receivableData,
    payableData,
  ] = await Promise.all([
    supabase
      .from("printers")
      .select("id, name, model, status, photo_url")
      .eq("account_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("filament_stock")
      .select("id, material, color, color_hex, brand, spool_weight_g, current_grams, low_stock_alert_g, cost_per_kg")
      .eq("account_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("print_jobs")
      .select("id, name, printer_id, status, planned_grams, estimated_time_min, started_at")
      .eq("account_id", user.id)
      .in("status", ["imprimindo", "falha", "fila"]),
    showStore
      ? supabase
          .from("store_orders")
          .select("id, items, total, status, created_at")
          .eq("account_id", user.id)
          .gte("created_at", thirtyDaysAgo.toISOString())
      : Promise.resolve({ data: null }),
    showStore
      ? supabase.from("products").select("id, stock, active").eq("account_id", user.id)
      : Promise.resolve({ data: null }),
    showStore
      ? supabase
          .from("accounts_receivable")
          .select("id, total_amount, paid_amount, due_date, status, settled_at")
          .eq("account_id", user.id)
      : Promise.resolve({ data: null }),
    showStore
      ? supabase
          .from("accounts_payable")
          .select("id, total_amount, paid_amount, due_date, status, settled_at")
          .eq("account_id", user.id)
      : Promise.resolve({ data: null }),
  ]);

  let storeStats = null;
  if (showStore) {
    const orders = storeOrdersData.data ?? [];
    const products = productsData.data ?? [];
    const receivables = receivableData.data ?? [];
    const payables = payableData.data ?? [];

    const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
    const pending = orders.filter((o) => o.status === "AGUARDANDO_PAGAMENTO");
    const revenue30d = paid.reduce((sum, o) => sum + Number(o.total), 0);
    const lowStockProducts = products.filter((p) => p.active && p.stock != null && p.stock <= 5).length;

    // Vendas pagas, dia a dia, últimos 30 dias.
    const days: { label: string; dateStr: string; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = dayStr(d);
      const total = paid
        .filter((o) => typeof o.created_at === "string" && o.created_at.slice(0, 10) === ds)
        .reduce((sum, o) => sum + Number(o.total), 0);
      days.push({ label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), dateStr: ds, total });
    }

    const todayStr = dayStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = dayStr(yesterday);
    const todayRevenue = days.find((d) => d.dateStr === todayStr)?.total ?? 0;
    const yesterdayRevenue = days.find((d) => d.dateStr === yesterdayStr)?.total ?? 0;

    const thisWeek = days.slice(-7).reduce((sum, d) => sum + d.total, 0);
    const lastWeek = days.slice(-14, -7).reduce((sum, d) => sum + d.total, 0);

    // Produtos mais vendidos (pelos itens dos pedidos pagos).
    const productRevenue = new Map<string, { quantity: number; revenue: number }>();
    for (const order of paid) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const key = item?.description || "Item";
        const entry = productRevenue.get(key) ?? { quantity: 0, revenue: 0 };
        entry.quantity += Number(item?.quantity || 0);
        entry.revenue += Number(item?.total ?? (item?.unitPrice || 0) * (item?.quantity || 0));
        productRevenue.set(key, entry);
      }
    }
    const topProducts = [...productRevenue.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Financeiro: receita de consignado recebida + despesas pagas, mesmo
    // período (30 dias), pra calcular lucro/prejuízo real.
    const receivedConsignado = receivables
      .filter((r) => r.settled_at && r.settled_at >= thirtyDaysAgo.toISOString())
      .reduce((sum, r) => sum + Number(r.paid_amount), 0);
    const pendingReceivable = receivables
      .filter((r) => r.status === "pendente" || r.status === "parcial")
      .reduce((sum, r) => sum + (Number(r.total_amount) - Number(r.paid_amount)), 0);
    const overdueReceivableCount = receivables.filter(
      (r) => (r.status === "pendente" || r.status === "parcial") && r.due_date < todayStr
    ).length;

    const paidExpenses = payables
      .filter((p) => p.settled_at && p.settled_at >= thirtyDaysAgo.toISOString())
      .reduce((sum, p) => sum + Number(p.paid_amount), 0);
    const pendingPayable = payables
      .filter((p) => p.status === "pendente" || p.status === "parcial")
      .reduce((sum, p) => sum + (Number(p.total_amount) - Number(p.paid_amount)), 0);
    const overduePayableCount = payables.filter(
      (p) => (p.status === "pendente" || p.status === "parcial") && p.due_date < todayStr
    ).length;

    const totalIncome30d = revenue30d + receivedConsignado;
    const profitLoss30d = totalIncome30d - paidExpenses;

    storeStats = {
      totalOrders: orders.length,
      pendingOrders: pending.length,
      revenue: revenue30d,
      productCount: products.length,
      lowStockProducts,
      salesByDay: days,
      todayRevenue,
      yesterdayRevenue,
      thisWeek,
      lastWeek,
      topProducts,
      totalIncome30d,
      paidExpenses30d: paidExpenses,
      profitLoss30d,
      pendingReceivable,
      overdueReceivableCount,
      pendingPayable,
      overduePayableCount,
    };
  }

  const stockValue = (filaments ?? []).reduce(
    (sum, f) => sum + (Number(f.current_grams) / 1000) * Number(f.cost_per_kg || 0),
    0
  );

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Dashboard</h1>
        <p className="text-sm text-ink-muted mb-8">
          Vendas, estoque, financeiro e o que precisa da sua atenção — tudo num lugar só.
        </p>

        <OverviewBoard
          printers={printers ?? []}
          filaments={filaments ?? []}
          jobs={jobs ?? []}
          storeStats={storeStats}
          stockValue={stockValue}
        />
      </div>
    </main>
  );
}
