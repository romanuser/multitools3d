import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";

const freeFeatures = [
  "Orçamento com calculadora de custo e PDF com sua marca",
  "Estoque de filamento com alerta de saldo baixo",
  "Cadastro de impressoras com foto",
  "Fila de impressão com desconto automático de estoque",
];

const vipFeatures = [
  "Tudo do plano Free",
  "Gerador de texto STL",
  "Modelador 3D com exportação de STL",
  "Loja virtual própria, com pagamento direto na sua conta",
];

const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-amber px-5 py-3 text-sm font-semibold text-on-accent transition hover:brightness-110";
const btnSecondary =
  "inline-flex items-center justify-center rounded-lg border border-line px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-raised";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="bg-paper text-ink">
      <Nav />
      <Hero />
      <Features />
      <Store />
      <Pricing />
      <FinalCta />
      <Footer />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Navegação                                                          */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Multiferramenta 3D, início">
          <Brand />
        </Link>

        <nav aria-label="Seções da página" className="hidden items-center gap-8 text-sm text-ink-muted md:flex">
          <a href="#recursos" className="transition-colors hover:text-ink">
            Recursos
          </a>
          <a href="#loja" className="transition-colors hover:text-ink">
            Loja virtual
          </a>
          <a href="#planos" className="transition-colors hover:text-ink">
            Planos
          </a>
        </nav>

        <div className="flex items-center gap-2 text-sm sm:gap-3">
          <Link href="/login" className="px-3 py-2 text-ink-muted transition-colors hover:text-ink">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="hidden rounded-lg bg-amber px-4 py-2 font-semibold text-on-accent transition hover:brightness-110 sm:inline-flex"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="layer-lines pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[520px] w-[720px] rounded-full bg-amber/10 blur-[120px]"
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 pb-24 pt-16 sm:pt-24 lg:grid-cols-[1fr_minmax(0,29rem)]">
        <div>
          <h1 className="font-display text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.035em] text-balance sm:text-6xl lg:text-[4.25rem]">
            Pare de gerenciar sua produção 3D na cabeça
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            Orçamento, estoque de filamento, impressoras, fila de impressão e a sua própria loja
            virtual num painel só. Sem planilha e sem calculadora na mão.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/cadastro" className={btnPrimary}>
              Criar conta grátis
            </Link>
            <a href="#recursos" className={btnSecondary}>
              Ver como funciona
            </a>
          </div>
          <p className="mt-5 text-sm text-ink-muted">Sem cartão de crédito. O plano Free não tem prazo.</p>
        </div>

        <QueueMock />
      </div>
    </section>
  );
}

// A peça "imprime" camada por camada uma vez, quando a página abre.
type PrintShape = "vase" | "cup";

function halfWidth(shape: PrintShape, t: number) {
  if (shape === "cup") return 22 + 9 * t + 3 * Math.pow(t, 8);
  return 18 + 16 * Math.sin(Math.PI * Math.pow(t, 0.8)) + 9 * Math.pow(t, 6);
}

function LayerPrint({
  progress = 0.72,
  layers = 28,
  animate = true,
  shape = "vase",
  tone = "amber",
}: {
  progress?: number;
  layers?: number;
  animate?: boolean;
  shape?: PrintShape;
  tone?: "amber" | "warn";
}) {
  const layerH = 3;
  const gap = 1.5;
  const step = layerH + gap;
  const width = 96;
  const height = layers * step + 14;
  const printed = Math.round(progress * layers);
  const fill = tone === "warn" ? "fill-warn" : "fill-amber";

  const rows = Array.from({ length: layers }, (_, i) => {
    const hw = halfWidth(shape, i / (layers - 1));
    const y = height - 4 - (i + 1) * step + gap;
    return { i, x: 48 - hw, y, w: hw * 2 };
  });

  const top = rows[printed - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" aria-hidden="true">
      {rows.map(({ i, x, y, w }) =>
        i < printed ? (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={layerH}
            rx={1}
            className={`${fill} ${animate ? "layer-printed" : ""}`}
            fillOpacity={i === printed - 1 ? 1 : 0.6 + 0.3 * (i / printed)}
            style={{ "--i": i } as React.CSSProperties}
          />
        ) : (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={layerH}
            rx={1}
            className="fill-surface-raised stroke-ink-muted"
            strokeOpacity={0.35}
            strokeWidth={0.6}
          />
        )
      )}
      {top && printed < layers && (
        <>
          <line x1={6} x2={90} y1={top.y - 7} y2={top.y - 7} className="stroke-ink-muted" strokeOpacity={0.45} strokeWidth={1} />
          <path d={`M${48 - 5} ${top.y - 7} h10 l-5 6.5 z`} className="fill-ink" />
        </>
      )}
    </svg>
  );
}

function QueueMock() {
  return (
    <div
      role="img"
      aria-label="Exemplo da fila de impressão: uma peça com 72% de progresso e outra aguardando. Ao terminar, o painel mostra filamento usado, custo e lucro."
    >
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Icon name="layers" size={16} className="text-amber" />
            Fila de impressão
          </div>
          <span className="text-xs text-ink-muted">2 peças</span>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex gap-5">
            <div className="h-[156px] w-[116px] shrink-0 rounded-xl border border-line bg-paper/70 px-2 py-2">
              <LayerPrint />
            </div>
            <div className="min-w-0 flex-1 py-1">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">Suporte de headset</p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">Bambu Lab A1 mini</p>
                </div>
                <span className="order-first shrink-0 rounded-full bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber sm:order-none">
                  Imprimindo
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
                <span className="h-3 w-3 rounded-full border border-line bg-[#f2f2ee]" />
                PETG branco
              </div>

              <div className="mt-5">
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="text-ink-muted">Progresso</span>
                  <span className="font-spec tabular-nums text-ink">72%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                  <div className="h-full w-[72%] rounded-full bg-amber" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full bg-warn" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Vaso espiral</p>
                <p className="truncate text-xs text-ink-muted">Creality K1, PLA laranja</p>
              </div>
            </div>
            <span className="shrink-0 text-xs text-ink-muted">Na fila</span>
          </div>
        </div>

        <div className="border-t border-line bg-paper/50 px-5 py-4">
          <p className="mb-3 text-xs text-ink-muted">Previsto para a peça em andamento</p>
          <dl className="grid grid-cols-3 gap-4">
            <Stat label="Filamento" value="84 g" />
            <Stat label="Custo" value="R$ 11,65" />
            <Stat label="Lucro" value="R$ 30,35" tone="good" />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 font-spec text-[15px] tabular-nums ${tone === "good" ? "text-amber" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recursos                                                           */
/* ------------------------------------------------------------------ */

function Features() {
  return (
    <section id="recursos" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Do orçamento à entrega, num painel só
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            Cada peça impressa desconta o filamento do estoque e entra no cálculo de custo e lucro. Você
            para de anotar e passa a saber quanto cada peça rende.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-6">
          <Tile
            className="md:col-span-4"
            title="Orçamento que fecha a conta"
            text="Informe o peso, o tempo e a impressora. O painel soma filamento, energia e custos auxiliares e sugere o preço. Depois é só gerar o PDF com a sua marca."
          >
            <QuoteMock />
          </Tile>

          <Tile
            className="md:col-span-2"
            title="Estoque sem surpresa"
            text="Veja o saldo de cada rolo e receba alerta antes de faltar filamento no meio da fila."
          >
            <StockMock />
          </Tile>

          <Tile
            className="md:col-span-2"
            title="Suas impressoras, com foto"
            text="Cadastre cada máquina e saiba na hora quais estão livres."
          >
            <PrintersMock />
          </Tile>

          <Tile
            className="md:col-span-4"
            title="Ferramentas 3D direto no navegador"
            text="Gere texto curvado pra gravar em canecas ou monte peças simples arrastando com o mouse. Exporte o STL na hora, sem instalar nada."
          >
            <ToolsMock />
          </Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({
  title,
  text,
  className = "",
  children,
}: {
  title: string;
  text: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`flex flex-col rounded-2xl border border-line bg-surface p-7 ${className}`}>
      <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-muted">{text}</p>
      <div aria-hidden="true" className="mt-7 flex-1">
        {children}
      </div>
    </article>
  );
}

function QuoteMock() {
  const rows = [
    ["Filamento (84 g de PETG)", "R$ 9,24"],
    ["Energia (3 h 40 min)", "R$ 0,41"],
    ["Custos auxiliares", "R$ 2,00"],
  ];
  return (
    <div className="rounded-xl border border-line bg-paper/60 p-5">
      <dl className="space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-spec tabular-nums text-ink">{value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="text-ink-muted">Custo total</dt>
          <dd className="font-spec tabular-nums text-ink">R$ 11,65</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-soft px-4 py-3">
        <span className="text-sm font-medium text-amber">Preço sugerido (unidade)</span>
        <span className="shrink-0 whitespace-nowrap font-spec text-lg tabular-nums text-amber">R$ 42,00</span>
      </div>
    </div>
  );
}

function StockMock() {
  const spools = [
    { name: "PETG branco", color: "#f2f2ee", left: 785, pct: 78, low: false },
    { name: "PLA preto", color: "#2b2f33", left: 140, pct: 14, low: true },
    { name: "PLA laranja", color: "#f5a524", left: 910, pct: 91, low: false },
  ];
  return (
    <ul className="flex h-full flex-col justify-between gap-4 rounded-xl border border-line bg-paper/60 p-5">
      {spools.map((s) => (
        <li key={s.name}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border border-line" style={{ background: s.color }} />
              {s.name}
            </span>
            <span className={`font-spec text-xs tabular-nums ${s.low ? "text-warn" : "text-ink-muted"}`}>{s.left} g</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <div className={`h-full rounded-full ${s.low ? "bg-warn" : "bg-amber"}`} style={{ width: `${s.pct}%` }} />
          </div>
          {s.low && <p className="mt-1.5 text-xs text-warn">Saldo baixo</p>}
        </li>
      ))}
    </ul>
  );
}

function PrintersMock() {
  const printers = [
    { name: "Bambu Lab A1 mini", status: "Imprimindo", busy: true },
    { name: "Creality K1", status: "Livre", busy: false },
    { name: "Ender 3 V3 SE", status: "Livre", busy: false },
  ];
  return (
    <ul className="space-y-3">
      {printers.map((p) => (
        <li key={p.name} className="flex items-center gap-3 rounded-xl border border-line bg-paper/60 p-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-raised text-ink-muted">
            <Icon name="printer" size={20} />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
          <span className={`flex shrink-0 items-center gap-1.5 text-xs ${p.busy ? "text-amber" : "text-ink-muted"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${p.busy ? "bg-amber" : "bg-ink-muted"}`} />
            {p.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ToolsMock() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr]">
      <div className="relative overflow-hidden rounded-xl border border-line bg-paper/60">
        <div className="layer-lines absolute inset-0" />
        <svg viewBox="0 0 320 160" className="relative block w-full" role="presentation">
          <defs>
            <path id="curva-texto" d="M 40 112 Q 160 30 280 112" fill="none" />
          </defs>
          <g fontFamily="var(--font-display), sans-serif" fontSize="40" fontWeight="700" letterSpacing="2" textAnchor="middle">
            {["#0c2e1c", "#0f3a23", "#12462a", "#165231", "#1a5f39", "#1e6c41", "#237a4a"].map((color, i) => {
              const depth = 7 - i;
              return (
                <g key={depth} transform={`translate(${depth * 0.5} ${depth})`}>
                  <text fill={color}>
                    <textPath href="#curva-texto" startOffset="50%">
                      Camila
                    </textPath>
                  </text>
                </g>
              );
            })}
            <text fill="#3ddc84">
              <textPath href="#curva-texto" startOffset="50%">
                Camila
              </textPath>
            </text>
          </g>
        </svg>
      </div>

      <div className="flex flex-col justify-center gap-3">
        <ToolChip icon="type" label="Gerador de texto STL" />
        <ToolChip icon="cube" label="Modelador 3D" />
        <div className="rounded-xl border border-dashed border-line px-3.5 py-3 text-sm text-ink-muted">
          <div className="flex items-center gap-3">
            <Icon name="camera" size={18} className="shrink-0" />
            Foto → Modelo 3D
          </div>
          <span className="mt-2 ml-[30px] inline-block rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn">
            Em desenvolvimento
          </span>
        </div>
      </div>
    </div>
  );
}

function ToolChip({ icon, label }: { icon: "type" | "cube"; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper/60 px-3.5 py-3 text-sm">
      <Icon name={icon} size={18} className="shrink-0 text-amber" />
      {label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loja virtual                                                       */
/* ------------------------------------------------------------------ */

function Store() {
  const points = [
    {
      title: "O pagamento cai direto na sua conta",
      text: "Sem marketplace no meio e sem repasse pra esperar.",
    },
    {
      title: "Seu cliente acompanha o pedido",
      text: "Ele vê o andamento e conversa com você dentro do próprio pedido.",
    },
    {
      title: "Entrega combinada por WhatsApp",
      text: "O contato do cliente chega junto com o pedido.",
    },
  ];

  return (
    <section id="loja" className="scroll-mt-20 border-y border-line bg-surface/50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 py-24 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center rounded-full border border-amber/30 px-2.5 py-1 text-xs font-medium text-amber">
            Plano VIP
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Sua própria loja. Seu link. Seu cliente.
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-ink-muted">
            Venda o que você imprime sem depender de marketplace. Cada pedido já nasce dentro do painel,
            ligado à fila e ao estoque.
          </p>

          <ul className="mt-9 space-y-5">
            {points.map((p) => (
              <li key={p.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-soft text-amber">
                  <Icon name="check" size={14} strokeWidth={2.5} />
                </span>
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-0.5 text-[15px] text-ink-muted">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Link href="/cadastro" className={btnPrimary}>
              Quero minha loja
            </Link>
          </div>
        </div>

        <StoreMock />
      </div>
    </section>
  );
}

function StoreMock() {
  const products = [
    { name: "Suporte de headset", price: "R$ 42,00", shape: "vase" as const, tone: "amber" as const },
    { name: "Vaso espiral", price: "R$ 35,90", shape: "cup" as const, tone: "warn" as const },
  ];
  return (
    <div role="img" aria-label="Exemplo de loja virtual com dois produtos e o botão de finalizar pedido." className="mx-auto w-full max-w-md">
      <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-soft font-medium text-amber">O</span>
          <div>
            <p className="text-sm font-medium">Oficina do Léo</p>
            <p className="text-xs text-ink-muted">Peças impressas em 3D</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5">
          {products.map((p) => (
            <div key={p.name} className="rounded-xl border border-line bg-surface p-3">
              <div className="h-32 rounded-lg bg-paper px-6 py-2">
                <LayerPrint progress={1} layers={26} animate={false} shape={p.shape} tone={p.tone} />
              </div>
              <p className="mt-3 truncate text-sm font-medium">{p.name}</p>
              <p className="mt-0.5 font-spec text-sm tabular-nums text-amber">{p.price}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-line p-5">
          <div className="mb-4 flex items-baseline justify-between text-sm">
            <span className="text-ink-muted">Total</span>
            <span className="font-spec text-lg tabular-nums">R$ 42,00</span>
          </div>
          <div className="rounded-lg bg-amber py-3 text-center text-sm font-semibold text-on-accent">Finalizar pedido</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Planos                                                             */
/* ------------------------------------------------------------------ */

function Pricing() {
  return (
    <section id="planos" className="scroll-mt-20">
      <div className="mx-auto max-w-4xl px-6 py-24">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Comece de graça</h2>
          <p className="mt-3 text-lg text-ink-muted">Suba de plano quando quiser vender pela sua própria loja.</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-line bg-surface p-8">
            <h3 className="font-display text-xl font-semibold">Free</h3>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tracking-tight">R$ 0</span>
              <span className="text-sm text-ink-muted">pra sempre</span>
            </p>
            <FeatureList items={freeFeatures} />
            <div className="mt-auto pt-8">
              <Link href="/cadastro" className={`${btnSecondary} w-full`}>
                Começar grátis
              </Link>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-amber/50 bg-surface-raised p-8 shadow-[0_0_0_1px_rgba(46,204,113,0.08),0_30px_80px_-40px_rgba(46,204,113,0.35)]">
            <h3 className="font-display text-xl font-semibold">VIP</h3>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tracking-tight">R$ 29,90</span>
              <span className="text-sm text-ink-muted">por mês</span>
            </p>
            <FeatureList items={vipFeatures} />
            <div className="mt-auto pt-8">
              <Link href="/cadastro" className={`${btnPrimary} w-full`}>
                Quero o plano VIP
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-7 space-y-3.5 text-[15px]">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <Icon name="check" size={18} strokeWidth={2.25} className="mt-0.5 shrink-0 text-amber" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Chamada final e rodapé                                             */
/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <div
        aria-hidden="true"
        className="layer-lines pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_top,black,transparent_85%)]"
      />
      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          Sua produção 3D, organizada
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">
          Crie a conta grátis e cadastre sua primeira impressora e seu primeiro rolo de filamento.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/cadastro" className={btnPrimary}>
            Criar conta grátis
          </Link>
          <Link href="/login" className={btnSecondary}>
            Já tenho conta
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-ink-muted sm:flex-row">
        <Brand size={22} />
        <p>© {new Date().getFullYear()} Multiferramenta 3D</p>
      </div>
    </footer>
  );
}
