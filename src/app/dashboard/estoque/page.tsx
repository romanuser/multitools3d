import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FilamentList } from "./filament-list";
import { StockChart } from "./stock-chart";

export default async function EstoquePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: filaments } = await supabase
    .from("filament_stock")
    .select(
      "id, material, color, color_hex, brand, spool_weight_g, current_grams, cost_per_kg, low_stock_alert_g"
    )
    .eq("account_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <BackButton href="/dashboard" label="Painel" />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Estoque de filamento</h1>
        <p className="text-sm text-ink-muted mb-8">
          Cadastre seus rolos de filamento. O saldo é descontado sozinho quando uma impressão é
          concluída na fila.
        </p>
        <StockChart filaments={filaments ?? []} />
        <FilamentList filaments={filaments ?? []} />
      </div>
    </main>
  );
}
