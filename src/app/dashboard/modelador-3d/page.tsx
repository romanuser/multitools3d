import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ModeladorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen px-6 py-8 flex flex-col">
      <div className="max-w-6xl mx-auto w-full mb-4">
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
          ← Painel
        </Link>
        <h1 className="font-display text-2xl text-ink mt-2">Modelador 3D</h1>
        <p className="text-sm text-ink-muted mb-4">
          Monte peças simples (cubo, cilindro, esfera) sobre a mesa de referência e exporte tudo
          num único arquivo STL pra fatiar no seu programa de sempre.
        </p>
      </div>
      <div
        className="max-w-6xl mx-auto w-full flex-1 rounded-2xl overflow-hidden border border-line"
        style={{ minHeight: "80vh" }}
      >
        <iframe
          src="/tools/modelador-3d/index.html"
          title="Modelador 3D"
          allow="fullscreen"
          className="w-full h-full"
          style={{ minHeight: "80vh", border: 0 }}
        />
      </div>
    </main>
  );
}
