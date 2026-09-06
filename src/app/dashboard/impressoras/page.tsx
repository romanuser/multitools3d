import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PrinterList } from "./printer-list";

export default async function ImpressorasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: printers } = await supabase
    .from("printers")
    .select("id, name, model, status, photo_url")
    .eq("account_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <h1 className="font-display text-2xl text-ink mt-4 mb-1">Impressoras</h1>
        <p className="text-sm text-ink-muted mb-8">
          Cadastre suas impressoras pra usar na fila de impressão.
        </p>
        <PrinterList printers={printers ?? []} />
      </div>
    </main>
  );
}
