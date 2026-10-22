import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Descadastrar", robots: { index: false } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Link do rodapé dos e-mails: para de enviar as dicas pra essa conta.
export default async function Descadastrar({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  let ok = false;
  if (t && UUID.test(t)) {
    const { data } = await createAdminClient().from("accounts").update({ marketing_opt_out: true }).eq("unsubscribe_token", t).select("id");
    ok = !!data?.length;
  }
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center border border-line bg-surface rounded-3xl p-8">
        <h1 className="font-display text-2xl text-ink mb-2">{ok ? "Pronto, descadastrado" : "Link inválido"}</h1>
        <p className="text-sm text-ink-muted">
          {ok ? "Você não vai mais receber os e-mails de dicas. Sua conta continua funcionando normalmente." : "Não encontramos esse link. Se quiser parar de receber os e-mails, responda a qualquer um deles."}
        </p>
      </div>
    </main>
  );
}
