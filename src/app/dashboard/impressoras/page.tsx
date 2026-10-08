import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PrinterList } from "./printer-list";
import { PrinterChart } from "./printer-chart";

export default async function ImpressorasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ data: printers }, { data: completedJobs }] = await Promise.all([
    supabase
      .from("printers")
      .select("id, name, model, status, photo_url")
      .eq("account_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("print_jobs")
      .select("printer_id, planned_grams")
      .eq("account_id", user.id)
      .eq("status", "concluida")
      .gte("finished_at", thirtyDaysAgo.toISOString()),
  ]);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <BackButton href="/dashboard" label="Painel" />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-4 mb-1">Impressoras</h1>
        <p className="text-sm text-ink-muted mb-8">
          Cadastre suas impressoras pra usar na fila de impressão.
        </p>
        <PrinterChart printers={printers ?? []} completedJobs={completedJobs ?? []} />
        <PrinterList printers={printers ?? []} />
      </div>
    </main>
  );
}
