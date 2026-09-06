import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAccountPlanStatus, hasFullAccess } from "@/lib/plans/access";
import { OverviewBoard } from "./overview-board";

export default async function PainelGeralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getAccountPlanStatus(user.id);
  const showStore = hasFullAccess(plan);

  const [{ data: printers }, { data: filaments }, { data: jobs }, storeData, productsData] = await Promise.all([
    supabase
      .from("printers")
      .select("id, name, model, status, photo_url")
      .eq("account_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("filament_stock")
      .select("id, material, color, color_hex, brand, spool_weight_g, current_grams, low_stock_alert_g")
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
          .select("id, total, status, created_at")
          .eq("account_id", user.id)
      : Promise.resolve({ data: null }),
    showStore
      ? supabase.from("products").select("id, stock, active").eq("account_id", user.id)
      : Promise.resolve({ data: null }),
  ]);

  let storeStats = null;
  if (showStore) {
    const orders = storeData.data ?? [];
    const products = productsData.data ?? [];
    const confirmed = orders.filter((o) => o.status === "PAGAMENTO_CONFIRMADO");
    const pending = orders.filter((o) => o.status === "AGUARDANDO_PAGAMENTO");
    const revenue = confirmed.reduce((sum, o) => sum + Number(o.total), 0);
    const lowStockProducts = products.filter(
      (p) => p.active && p.stock != null && p.stock <= 5
    ).length;

    const days: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().slice(0, 10);
      const total = confirmed
        .filter((o) => o.created_at.slice(0, 10) === dayStr)
        .reduce((sum, o) => sum + Number(o.total), 0);
      days.push({ label: day.toLocaleDateString("pt-BR", { weekday: "short" }), total });
    }

    storeStats = {
      totalOrders: orders.length,
      pendingOrders: pending.length,
      revenue,
      productCount: products.length,
      lowStockProducts,
      salesByDay: days,
    };
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <h1 className="font-display text-2xl text-ink mt-4 mb-1">Painel geral</h1>
        <p className="text-sm text-ink-muted mb-8">
          Como está a operação agora: impressoras, estoque e o que precisa da sua atenção.
        </p>

        <OverviewBoard
          printers={printers ?? []}
          filaments={filaments ?? []}
          jobs={jobs ?? []}
          storeStats={storeStats}
        />
      </div>
    </main>
  );
}
