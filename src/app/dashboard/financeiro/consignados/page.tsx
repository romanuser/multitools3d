import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConsignmentList } from "./consignment-list";

export default async function ConsignadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: consignments }, { data: products }] = await Promise.all([
    supabase
      .from("consignments")
      .select(
        "id, product_id, partner_store_name, unit_price, quantity_delivered, quantity_remaining, date_delivered, billing_period_days, status, products(name, image_url)"
      )
      .eq("account_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("products").select("id, name, price, image_url").eq("account_id", user.id).order("name"),
  ]);

  const consignmentIds = (consignments ?? []).map((c) => c.id);
  const { data: settlements } = consignmentIds.length
    ? await supabase
        .from("consignment_settlements")
        .select("id, consignment_id, settlement_date, quantity_sold, quantity_returned, amount_due")
        .in("consignment_id", consignmentIds)
        .order("settlement_date", { ascending: false })
    : { data: [] };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Consignados</h1>
        <p className="text-sm text-ink-muted mb-8">
          Produtos deixados em lojas parceiras pra revenda. A cada acerto, registre o que vendeu e o que foi
          recolhido.
        </p>

        <ConsignmentList
          consignments={(consignments ?? []) as any}
          products={products ?? []}
          settlements={settlements ?? []}
        />
      </div>
    </main>
  );
}
