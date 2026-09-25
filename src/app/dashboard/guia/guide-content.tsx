import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";

// ---------------------------------------------------------------------
// Conteúdo do guia de uso. Renderizado tanto na aba "Guia de uso" dentro
// do painel (src/app/dashboard/guia/page.tsx) quanto na versão usada para
// gerar o PDF de apoio. Editar aqui atualiza as duas.
// ---------------------------------------------------------------------

const SECTIONS: { id: string; label: string }[] = [
  { id: "boas-vindas", label: "Boas-vindas" },
  { id: "conta", label: "Criando sua conta" },
  { id: "painel", label: "Visão geral do painel" },
  { id: "empresa", label: "Dados da empresa" },
  { id: "orcamentos", label: "Orçamentos" },
  { id: "estoque", label: "Estoque de filamento" },
  { id: "impressoras", label: "Impressoras" },
  { id: "fila", label: "Fila de impressão" },
  { id: "stl-curvo", label: "Gerador de texto STL" },
  { id: "modelador", label: "Modelador 3D" },
  { id: "foto-3d", label: "Foto → Modelo 3D" },
  { id: "plano-vip", label: "Plano VIP" },
  { id: "loja", label: "Criando sua loja" },
  { id: "frete", label: "Configurando o frete" },
  { id: "pagamento", label: "Recebendo pagamentos" },
  { id: "cliente", label: "O que o cliente vê" },
  { id: "celular", label: "Instalar no celular" },
  { id: "duvidas", label: "Dúvidas comuns" },
];

export function GuideContent() {
  return (
    <div className="guide bg-paper text-ink">
      {/* Regras só para quando esta página é impressa/exportada em PDF: evita
          cortar uma imagem, um passo ou um aviso bem no meio, entre duas
          páginas. Não afeta a tela normal do navegador. */}
      <style>{`
        @media print {
          figure, .avoid-break, ol > li { break-inside: avoid; }
          .section-head { break-after: avoid; break-inside: avoid; }
          h2, h3 { break-after: avoid; }
        }
      `}</style>
      <Cover />
      <div className="max-w-3xl mx-auto px-6 pb-24">
        <Toc />

        <Section id="boas-vindas" title="Boas-vindas" kicker="Introdução">
          <p>
            A Multiferramenta 3D reúne, num painel só, o que você precisa pra tocar uma operação de
            impressão 3D: calcular orçamento, controlar o estoque de filamento, organizar suas
            impressoras, acompanhar a fila de impressão e, se quiser vender, ter sua própria loja
            virtual com link e pagamento próprios.
          </p>
          <p>
            Este guia mostra cada ferramenta na prática, na ordem que faz mais sentido pra quem está
            começando agora. Você pode ler tudo de uma vez ou usar o índice acima pra pular direto pra
            parte que precisa.
          </p>
          <Callout>
            Toda conta começa no plano <strong>Free</strong>, que já inclui orçamento, estoque,
            impressoras e fila de impressão. O plano <strong>VIP</strong> soma o gerador de texto STL,
            o modelador 3D e a loja virtual própria.
          </Callout>
        </Section>

        <Section id="conta" title="Criando sua conta" kicker="Primeiros passos">
          <p>
            Na tela inicial, escolha <strong>Criar conta grátis</strong>. Você pode continuar com o
            Google ou preencher nome da empresa/loja, e-mail e senha. Não é pedido cartão de crédito
            neste passo.
          </p>
          <Figure src="/marketing/guia/cadastro.png" alt="Tela de criar conta da Multiferramenta 3D" />
          <p>
            Depois de criar a conta, você já entra direto no painel — a primeira tela é a lista de
            ferramentas.
          </p>
        </Section>

        <Section id="painel" title="Visão geral do painel" kicker="Se localizando">
          <p>
            O menu à esquerda é dividido por assunto: <strong>Gestão</strong> (orçamentos, estoque,
            impressoras, fila), <strong>Criação 3D</strong> (as ferramentas de modelagem),{" "}
            <strong>Vendas</strong> (a loja virtual) e <strong>Conta</strong> (dados da empresa e
            plano). No celular, o mesmo menu abre tocando no ícone no canto superior esquerdo.
          </p>
          <Figure src="/marketing/guia/dashboard.png" alt="Lista de ferramentas do painel" caption="A tela “Ferramentas” — sua página inicial dentro do painel." />
          <p>
            Já o <strong>Painel geral</strong> é um resumo rápido: quais impressoras estão livres ou
            imprimindo, o saldo de cada filamento e, se você tiver a loja ativa, o faturamento e os
            pedidos recentes.
          </p>
          <Figure src="/marketing/guia/painel-overview.png" alt="Painel geral com impressoras, estoque e vendas" />
        </Section>

        <Section id="empresa" title="Dados da empresa" kicker="Antes de tudo">
          <p>
            Em <strong>Conta → Dados da empresa</strong>, cadastre o nome e a logo da sua oficina.
            Essas informações aparecem no PDF de orçamento e no topo da sua loja virtual — vale
            preencher antes de gerar o primeiro orçamento.
          </p>
          <Figure src="/marketing/guia/empresa.png" alt="Tela de dados da empresa" />
        </Section>

        <Section id="orcamentos" title="Orçamentos" kicker="Gestão">
          <p>
            A calculadora soma o custo de cada peça a partir de três blocos — filamento, energia e
            mão de obra/custos fixos — e aplica a margem de lucro que você definir.
          </p>
          <Steps
            items={[
              ["Filamento", "Escolha o material de referência, o preço por kg e quantos gramas a peça usa."],
              ["Energia e tempo", "Informe o consumo da impressora em watts, o tempo de impressão e o valor do kWh da sua região."],
              ["Custos e lucro", "Some mão de obra e custos fixos por peça, e defina a margem de lucro em %."],
              ["Dados do orçamento", "Preencha o nome do cliente, a descrição do item, quantidade e validade em dias."],
              ["Gerar o PDF", "Clique em “Gerar orçamento em PDF” — o arquivo sai pronto, com a logo da sua empresa, pra enviar ao cliente."],
            ]}
          />
          <Figure src="/marketing/guia/orcamentos.png" alt="Calculadora de orçamentos" />
        </Section>

        <Section id="estoque" title="Estoque de filamento" kicker="Gestão">
          <p>
            Cada rolo de filamento vira um cartão aqui, com o saldo em gramas. Ao criar ou concluir
            uma peça na fila de impressão, a gramagem usada é descontada automaticamente — não é
            preciso atualizar o estoque à mão.
          </p>
          <Steps
            items={[
              ["Cadastre o material", "Material (PLA, PETG, ABS, TPU ou Outro), cor e, se quiser, a marca."],
              ["Informe o peso", "Peso do rolo (normalmente 1000 g) e quantas gramas ele tem agora."],
              ["Defina o alerta", "O alerta de estoque baixo (em gramas) avisa antes de faltar filamento no meio de uma impressão."],
            ]}
          />
          <Figure src="/marketing/guia/estoque.png" alt="Tela de estoque de filamento" />
        </Section>

        <Section id="impressoras" title="Impressoras" kicker="Gestão">
          <p>
            Cadastre cada máquina com nome, modelo e uma foto opcional. O status (Livre, Imprimindo ou
            Em manutenção) aparece no painel geral e é atualizado sozinho quando você inicia ou
            conclui uma peça na fila.
          </p>
          <Figure src="/marketing/guia/impressoras.png" alt="Cadastro de impressora" />
        </Section>

        <Section id="fila" title="Fila de impressão" kicker="Gestão">
          <p>
            A fila é dividida em três colunas — <strong>Fila</strong>, <strong>Imprimindo</strong> e{" "}
            <strong>Finalizadas</strong>. Ao criar uma impressão, informe a impressora, o filamento,
            a gramagem planejada e o tempo estimado.
          </p>
          <Steps
            items={[
              ["Adicione à fila", "A peça entra na coluna “Fila”, aguardando a impressora ficar livre."],
              ["Inicie a impressão", "Ao clicar em “Iniciar impressão”, ela move pra coluna “Imprimindo” e a barra de progresso conta o tempo estimado."],
              ["Conclua ou registre falha", "Ao concluir, o filamento realmente usado sai do estoque e o custo/lucro da peça é calculado. Se a impressão falhar, registre o desperdício em gramas."],
            ]}
          />
          <Figure src="/marketing/guia/fila-kanban.png" alt="Fila de impressão com três colunas" />
        </Section>

        <Section id="stl-curvo" title="Gerador de texto STL" kicker="Criação 3D · plano VIP">
          <p>
            Cria texto em 3D já curvado, pronto pra gravar em canecas, copos e porta-latas. Digite o
            texto, escolha a fonte e ajuste largura, altura, profundidade e o raio da curva até
            encaixar no objeto. Depois é só clicar em <strong>Baixar STL</strong>.
          </p>
          <Figure src="/marketing/guia/stl-curvo.png" alt="Gerador de texto curvo em STL" />
        </Section>

        <Section id="modelador" title="Modelador 3D" kicker="Criação 3D · plano VIP">
          <p>
            Monta peças simples combinando cubos, cilindros e esferas, direto no navegador. A mesa de
            referência mostra o tamanho da mesa da sua impressora, só como guia visual — ela nunca
            entra no arquivo exportado.
          </p>
          <Steps
            items={[
              ["Adicione formas", "Use os botões “+ Cubo”, “+ Cilindro” e “+ Esfera” pra colocar peças na cena."],
              ["Posicione", "Arraste com o mouse pra encaixar as peças sobre a mesa de referência."],
              ["Exporte", "Clique em “Baixar STL” pra gerar um único arquivo com todas as peças da cena, pronto pra fatiar."],
            ]}
          />
          <Figure src="/marketing/guia/modelador-panel.png" alt="Painel do modelador 3D" caption="O painel de controle do Modelador 3D — a área ao lado mostra a cena em 3D." />
        </Section>

        <Section id="foto-3d" title="Foto → Modelo 3D" kicker="Em desenvolvimento">
          <p>
            Essa ferramenta vai transformar uma foto em modelo 3D usando IA, já calibrado no tamanho
            real do objeto. Ela ainda está em construção — quando estiver pronta, ela aparece
            liberada automaticamente no menu, sem nenhuma ação necessária da sua parte.
          </p>
          <Figure src="/marketing/guia/foto.png" alt="Aviso de ferramenta em desenvolvimento" />
        </Section>

        <Section id="plano-vip" title="Plano VIP" kicker="R$ 29,90/mês">
          <p>
            Em <strong>Conta → Plano</strong>, veja seu plano atual e assine o VIP quando quiser. A
            cobrança é recorrente a cada 30 dias, via InfinitePay. Se o pagamento não for renovado,
            a conta volta sozinha pro plano Free — as ferramentas gratuitas continuam funcionando
            normalmente, você só perde acesso às ferramentas exclusivas do VIP.
          </p>
          <Figure src="/marketing/guia/plano.png" alt="Tela de planos" />
        </Section>

        <Section id="loja" title="Criando sua loja" kicker="Vendas · plano VIP">
          <p>
            Em <strong>Vendas → Loja virtual</strong>, cadastre seus produtos. Cada um pode ter foto,
            descrição, preço e estoque — deixe o estoque em branco se a peça for feita sob encomenda
            (estoque ilimitado).
          </p>
          <Figure src="/marketing/guia/loja-produtos.png" alt="Cadastro de produto da loja" />
          <p>
            Se preencher os campos de impressão (impressora, filamento, peso e tempo), o pedido desse
            produto pode gerar automaticamente uma peça na fila de impressão quando for pago —
            fechando o ciclo entre a venda e a produção.
          </p>
        </Section>

        <Section id="frete" title="Configurando o frete" kicker="Vendas">
          <p>
            Ainda nas configurações da loja, informe o <strong>CEP de origem</strong> (de onde você
            envia) e um <strong>pacote padrão</strong> — peso e medidas usados quando um produto não
            tem dimensões próprias cadastradas.
          </p>
          <Figure src="/marketing/guia/loja-frete.png" alt="Configuração de frete e InfiniteTag da loja" />
          <Callout tone="warn">
            Os Correios e transportadoras parceiras recusam pacotes fora de certas medidas mínimas.
            Se o frete voltar como “nenhuma opção encontrada”, o motivo mais comum é peso ou medida
            preenchidos errado (por exemplo, gramas em vez de quilos).
          </Callout>
        </Section>

        <Section id="pagamento" title="Recebendo pagamentos" kicker="Vendas · InfinitePay">
          <p>
            A Multiferramenta 3D não processa pagamentos diretamente — ela gera um link de checkout
            pela <strong>InfinitePay</strong>, e o dinheiro cai direto na sua própria conta, sem
            passar pela plataforma. Pra isso funcionar, são dois passos: informar sua InfiniteTag
            aqui dentro, e habilitar o Checkout Integrado lá no app da InfinitePay.
          </p>

          <h3 className="font-display text-lg text-ink mt-8 mb-2">Passo 1 — Encontre sua InfiniteTag</h3>
          <p>
            Se você ainda não tem conta na InfinitePay, baixe o app e crie uma — é gratuito. Sua{" "}
            <strong>InfiniteTag</strong> é o nome de usuário que aparece no canto superior esquerdo do
            app, sempre com um <span className="font-spec">$</span> na frente (algo como{" "}
            <span className="font-spec">$oficinadoleo</span>).
          </p>
          <Steps
            items={[
              ["Abra o app InfinitePay", "Se ainda não tiver conta, crie uma — é gratuita e leva poucos minutos."],
              ["Veja sua InfiniteTag", "Ela aparece no canto superior esquerdo da tela inicial do app, começando com $."],
              ["Copie sem o $", "Aqui na Multiferramenta 3D, cole a tag sem o símbolo — só “oficinadoleo”, por exemplo."],
            ]}
          />

          <h3 className="font-display text-lg text-ink mt-8 mb-2">Passo 2 — Cole no painel da loja</h3>
          <p>
            Em <strong>Vendas → Loja virtual</strong>, no campo <strong>Sua InfiniteTag</strong>,
            cole o nome de usuário (sem o $) e salve. É pra essa conta que o dinheiro das suas vendas
            vai cair.
          </p>

          <h3 className="font-display text-lg text-ink mt-8 mb-2">Passo 3 — Habilite o Checkout Integrado</h3>
          <p>
            Esse é o passo que mais gera dúvida: mesmo com a InfiniteTag certa, a InfinitePay só
            libera pagamentos vindos de outro sistema (como a Multiferramenta 3D) depois que você
            habilita essa opção manualmente, dentro do próprio app.
          </p>
          <Steps
            items={[
              ["Abra o app InfinitePay", "Ou acesse sua conta pelo navegador, em app.infinitepay.io."],
              ["Toque em “Vendas”", "É uma das abas do menu superior."],
              ["Role até “Checkout”", "Deslize a tela para baixo até encontrar essa opção e toque nela."],
              ["Entre em “Configurações”", "Dentro da tela de Checkout."],
              ["Toque em “Habilitar Checkout Integrado”", "Pronto — a partir daqui, os links de pagamento gerados pela Multiferramenta 3D passam a funcionar."],
            ]}
          />
          <Callout tone="warn">
            Se um cliente tentar pagar e aparecer a mensagem “External checkout is not enabled for
            this merchant”, é exatamente esse passo que está faltando — volte ao app da InfinitePay e
            habilite o Checkout Integrado.
          </Callout>
        </Section>

        <Section id="cliente" title="O que o cliente vê" kicker="Vendas">
          <p>
            Ao clicar em comprar, o cliente escolhe a quantidade, informa o CEP e calcula o frete —
            as opções de transportadora e prazo aparecem ali mesmo. Depois, ele preenche nome, e-mail,
            WhatsApp (opcional) e endereço de entrega, e segue pra tela de pagamento da InfinitePay.
          </p>
          <Figure src="/marketing/guia/storefront.png" alt="Tela de finalizar pedido vista pelo cliente" />
          <p>
            Assim que o pagamento é confirmado, o pedido aparece em{" "}
            <strong>Vendas → Loja virtual → Pedidos</strong>, e — se o produto tiver dados de
            impressão configurados — uma peça é criada automaticamente na sua fila de impressão.
          </p>
        </Section>

        <Section id="celular" title="Instalar no celular" kicker="Dica">
          <p>
            Ao acessar a Multiferramenta 3D pelo navegador do celular, um aviso oferece adicionar o
            painel à tela de início. No Android, isso instala o app de verdade, com ícone próprio. No
            iPhone, o Safari pede um passo manual: toque em compartilhar e depois em{" "}
            <strong>Adicionar à Tela de Início</strong>.
          </p>
        </Section>

        <Section id="duvidas" title="Dúvidas comuns" kicker="Suporte" last>
          <FaqItem q="O frete apareceu como “nenhuma opção encontrada”. O que fazer?">
            Confira o CEP de origem e as medidas do pacote padrão em Vendas → Loja virtual. O erro
            mais comum é peso digitado em gramas no campo que espera quilos (ex.: “300” em vez de
            “0,3”).
          </FaqItem>
          <FaqItem q="O cliente tentou pagar e deu erro de checkout. E agora?">
            Veja a seção “Recebendo pagamentos” acima — quase sempre falta habilitar o Checkout
            Integrado dentro do app da InfinitePay, ou a InfiniteTag cadastrada está diferente da
            conta que você realmente usa.
          </FaqItem>
          <FaqItem q="Cancelei o plano VIP. Perco meus dados da loja?">
            Não. Seus produtos e pedidos continuam salvos — você só perde o acesso à loja, ao
            gerador de texto STL e ao modelador 3D até assinar de novo.
          </FaqItem>
          <FaqItem q="Ainda tenho uma dúvida que não está aqui.">
            Use o balão de conversa no canto da tela, dentro do painel — é o caminho mais rápido pra
            falar com o suporte.
          </FaqItem>
        </Section>
      </div>
    </div>
  );
}

function Cover() {
  return (
    <div className="layer-lines relative overflow-hidden border-b border-line px-6 py-16 text-center">
      <div className="relative mx-auto max-w-2xl">
        <div className="mb-6 flex justify-center">
          <Brand size={30} />
        </div>
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-amber">Guia de uso</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Do orçamento à venda,
          <br />
          passo a passo
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-ink-muted">
          Como usar cada ferramenta da Multiferramenta 3D — da primeira conta até receber o
          pagamento da sua primeira venda.
        </p>
      </div>
    </div>
  );
}

function Toc() {
  return (
    <nav aria-label="Sumário" className="my-10 rounded-2xl border border-line bg-surface p-6">
      <p className="mb-3 text-sm font-medium text-ink-muted">Neste guia</p>
      <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="flex gap-2 text-ink hover:text-amber">
              <span className="font-spec text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Section({
  id,
  title,
  kicker,
  children,
  last = false,
}: {
  id: string;
  title: string;
  kicker: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section id={id} className={`scroll-mt-6 py-10 ${last ? "" : "border-b border-line"}`}>
      <div className="section-head">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-amber">{kicker}</p>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink mb-4">{title}</h2>
      </div>
      <div className="space-y-4 text-[15px] leading-relaxed text-ink-muted [&_strong]:font-medium [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

function Figure({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-6 avoid-break">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full rounded-xl border border-line" />
      {caption && <figcaption className="mt-2 text-xs text-ink-muted">{caption}</figcaption>}
    </figure>
  );
}

function Steps({ items }: { items: [string, string][] }) {
  return (
    <ol className="space-y-3">
      {items.map(([title, text], i) => (
        <li key={title} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-soft font-spec text-xs text-amber">
            {i + 1}
          </span>
          <p>
            <strong className="font-medium text-ink">{title}.</strong> {text}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Callout({ children, tone = "amber" }: { children: React.ReactNode; tone?: "amber" | "warn" }) {
  return (
    <div
      className={`avoid-break rounded-xl border px-4 py-3 text-sm ${
        tone === "warn" ? "border-warn/40 bg-warn/10 text-ink" : "border-amber/30 bg-amber-soft text-ink"
      }`}
    >
      {children}
    </div>
  );
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="avoid-break border-t border-line py-4 first:border-t-0 first:pt-0">
      <p className="mb-1.5 font-medium text-ink">{q}</p>
      <p className="text-[15px] leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}
