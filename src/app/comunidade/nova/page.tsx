import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NovaPerguntaForm } from "../componentes";

export const metadata = { title: { absolute: "Fazer uma pergunta — Comunidade Multiferramenta 3D" }, robots: { index: false } };

export default async function NovaPergunta({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login?volta=/comunidade/nova");
  const { cat } = await searchParams;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Fazer uma pergunta</h1>
      <p className="mt-2 mb-6 text-sm text-ink-muted">Dica: um título claro e uma foto da peça fazem a sua dúvida ser resolvida bem mais rápido.</p>
      <NovaPerguntaForm categoria={cat} />
    </main>
  );
}
