import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function FotoPara3DPage() {
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
        <h1 className="font-display text-2xl text-ink mt-2">Foto → Modelo 3D</h1>
        <p className="text-sm text-ink-muted mb-4">
          Gera um modelo 3D a partir de uma foto usando uma IA aberta e gratuita, e calibra o
          tamanho real usando um objeto de referência (moeda, régua etc.) na mesma foto. Como usa
          um serviço comunitário gratuito, pode ser mais lento em horários de pico — se der erro,
          tente trocar o "espaço" indicado dentro da ferramenta.
        </p>
      </div>
      <div
        className="max-w-6xl mx-auto w-full flex-1 rounded-2xl overflow-hidden border border-line"
        style={{ minHeight: "80vh" }}
      >
        <iframe
          src="/tools/foto-para-3d/index.html"
          title="Foto para Modelo 3D"
          allow="fullscreen"
          className="w-full h-full"
          style={{ minHeight: "80vh", border: 0 }}
        />
      </div>
    </main>
  );
}
