import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Criador 3D" };

// Criador paramétrico: modelos próprios gerados no navegador com OpenSCAD.
export default async function Criador3DPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen px-4 md:px-6 py-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full mb-4">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mt-2">Criador 3D</h1>
        <p className="text-sm text-ink-muted">
          Letreiro LED, chaveiro, porta-copos, topo de bolo e placa Pix: personalize e baixe em STL ou 3MF multicor.
        </p>
      </div>
      <div className="max-w-7xl mx-auto w-full flex-1 rounded-2xl overflow-hidden border border-line" style={{ minHeight: "85vh" }}>
        <iframe
          src="/tools/criador-3d/index.html"
          title="Criador 3D paramétrico"
          allow="fullscreen"
          className="w-full h-full"
          style={{ minHeight: "85vh", border: 0 }}
        />
      </div>
    </main>
  );
}
