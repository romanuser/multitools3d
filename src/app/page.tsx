import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const freeFeatures = [
  "Orçamento com calculadora de custo e PDF com sua marca",
  "Estoque de filamento com alerta de saldo baixo",
  "Cadastro de impressoras com foto",
  "Fila de impressão com desconto automático de estoque",
];

const vipFeatures = [
  "Tudo do plano Free",
  "Gerador de texto curvo em STL",
  "Modelador 3D com exportação de STL",
  "Loja virtual própria, com pagamento direto na sua conta",
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="bg-paper text-ink">
      {/* Nav */}
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-display text-lg text-ink">Multiferramenta 3D</span>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-ink-muted hover:text-ink">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="bg-amber text-white font-medium rounded-full px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Criar conta grátis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-12 pb-16 text-center">
        <p className="text-sm text-amber font-medium mb-3">
          Pra quem vive de impressão 3D
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight mb-5">
          Pare de gerenciar sua produção 3D na cabeça
        </h1>
        <p className="text-ink-muted text-lg max-w-2xl mx-auto mb-8">
          Orçamento, estoque de filamento, impressoras, fila de impressão e sua própria loja
          virtual — tudo num painel só, sem planilha e sem calculadora na mão.
        </p>
        <div className="flex items-center justify-center gap-4 mb-14">
          <Link
            href="/cadastro"
            className="bg-amber text-white font-medium rounded-full px-6 py-3 hover:opacity-90 transition-opacity"
          >
            Começar grátis
          </Link>
          <Link href="/login" className="text-ink-muted hover:text-ink text-sm">
            Já tenho conta →
          </Link>
        </div>
        <BrowserFrame src="/marketing/painel-geral.png" alt="Painel geral do Multiferramenta 3D" />
      </section>

      {/* Free features */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-line">
        <h2 className="font-display text-2xl text-ink text-center mb-2">
          Comece de graça, sem cartão de crédito
        </h2>
        <p className="text-ink-muted text-center mb-10">
          Já resolve o dia a dia de quem imprime pra vender.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {freeFeatures.map((feature) => (
            <div key={feature} className="border border-line bg-surface rounded-2xl p-5 flex gap-3">
              <span className="text-amber shrink-0">✓</span>
              <p className="text-ink">{feature}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Automation highlight */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-line">
        <div className="grid sm:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-display text-2xl text-ink mb-3">
              O estoque se desconta sozinho
            </h2>
            <p className="text-ink-muted">
              Inicie a impressão e acompanhe a barra de progresso em tempo real. Quando termina,
              o sistema desconta o filamento do estoque e calcula seu custo e lucro — sem você
              precisar anotar nada.
            </p>
          </div>
          <BrowserFrame src="/marketing/fila-impressao.png" alt="Fila de impressão com custo e lucro calculados automaticamente" />
        </div>
      </section>

      {/* 3D tools */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-line">
        <div className="grid sm:grid-cols-2 gap-8 items-center">
          <div className="sm:order-2">
            <h2 className="font-display text-2xl text-ink mb-3">
              Ferramentas 3D direto no navegador
            </h2>
            <p className="text-ink-muted">
              Gere um texto curvado pra gravar numa caneca ou monte uma peça simples no
              modelador — arrastando com o mouse — e exporte o STL na hora. Sem instalar
              programa nenhum.
            </p>
          </div>
          <div className="sm:order-1">
            <BrowserFrame src="/marketing/stl-curvo.png" alt="Gerador de texto curvo em STL, rodando no navegador" />
          </div>
        </div>
      </section>

      {/* Store highlight - the big sell */}
      <section className="border-t border-line bg-amber-soft/40">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-sm text-amber font-medium mb-3">Plano VIP</p>
          <h2 className="font-display text-3xl sm:text-4xl text-ink mb-5">
            Sua própria loja. Seu link. Seu cliente.
          </h2>
          <p className="text-ink-muted text-lg max-w-2xl mx-auto mb-8">
            Venda sem depender de marketplace e sem taxa abusiva. O pagamento cai direto na sua
            conta, e você ainda fala com o cliente pelo WhatsApp pra combinar a entrega.
          </p>
          <Link
            href="/cadastro"
            className="bg-amber text-white font-medium rounded-full px-6 py-3 inline-block hover:opacity-90 transition-opacity"
          >
            Quero minha loja
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="font-display text-2xl text-ink text-center mb-10">Planos</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="border border-line bg-surface rounded-2xl p-6">
            <p className="font-display text-lg text-ink">Free</p>
            <p className="text-sm text-ink-muted mb-5">Pra sempre, sem custo</p>
            <ul className="space-y-2 text-sm text-ink">
              {freeFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-amber">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-amber bg-amber-soft/40 rounded-2xl p-6">
            <p className="font-display text-lg text-ink">VIP</p>
            <p className="text-sm text-ink-muted mb-5">R$ 29,90/mês</p>
            <ul className="space-y-2 text-sm text-ink">
              {vipFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-amber">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-center mt-10">
          <Link
            href="/cadastro"
            className="bg-amber text-white font-medium rounded-full px-6 py-3 inline-block hover:opacity-90 transition-opacity"
          >
            Criar minha conta
          </Link>
        </p>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-ink-muted">
        Multiferramenta 3D
      </footer>
    </main>
  );
}

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-line bg-surface shadow-2xl shadow-black/40">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line">
        <span className="w-2.5 h-2.5 rounded-full bg-danger/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-good/60" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-auto block" />
    </div>
  );
}
