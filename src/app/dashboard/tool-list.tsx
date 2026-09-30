import Link from "next/link";
import { FEATURES } from "@/lib/features";
import { Icon, type IconName } from "@/components/icons";

export type Tool = {
  title: string;
  description: string;
  href: string;
  icon: IconName;
  // Em desenvolvimento: aparece na lista, mas não abre.
  soon?: boolean;
  // Só pra quem tem plano VIP.
  vip?: boolean;
};

export const manageTools: Tool[] = [
  {
    title: "Orçamentos",
    description: "Calcule o custo e o preço sugerido e gere o PDF com a sua marca.",
    href: "/dashboard/orcamentos",
    icon: "quote",
  },
  {
    title: "Estoque de filamento",
    description: "Acompanhe o saldo de cada rolo e receba alerta quando estiver acabando.",
    href: "/dashboard/estoque",
    icon: "spool",
  },
  {
    title: "Impressoras",
    description: "Cadastre suas impressoras com foto e veja quais estão livres.",
    href: "/dashboard/impressoras",
    icon: "printer",
  },
  {
    title: "Fila de impressão",
    description: "Inicie as peças, acompanhe o progresso e desconte o filamento do estoque.",
    href: "/dashboard/fila",
    icon: "layers",
  },
];

export const createTools: Tool[] = [
  {
    title: "Gerador de texto STL",
    description: "Gere texto curvado pra gravar em canecas e exporte o STL.",
    href: "/dashboard/gerador-stl-curvo",
    icon: "type",
  },
  {
    title: "Modelador 3D",
    description: "Monte peças simples arrastando com o mouse e exporte o STL.",
    href: "/dashboard/modelador-3d",
    icon: "cube",
  },
  {
    title: "Pacote de STLs",
    description: "Novos arquivos escolhidos do nosso pacote, todo dia.",
    href: "/dashboard/stl-packs",
    icon: "layers",
  },
  {
    title: "Foto → Modelo 3D",
    description: "Transforme uma foto em modelo 3D com IA.",
    href: "/dashboard/foto-para-3d",
    icon: "camera",
    soon: !FEATURES.photoTo3D,
  },
  {
    title: "Foto → STL (peças planas)",
    description: "Converta uma foto em uma peça plana pronta pra imprimir.",
    href: "/dashboard/foto-para-3d",
    icon: "camera",
    soon: true,
  },
];

export const salesTools: Tool[] = [
  {
    title: "Loja virtual",
    description: "Venda com o seu próprio link e receba direto na sua conta.",
    href: "/dashboard/loja",
    icon: "store",
    vip: true,
  },
];

export function ToolGroup({ title, tools, hasVip }: { title: string; tools: Tool[]; hasVip: boolean }) {
  return (
    <section aria-label={title}>
      <h2 className="text-sm font-medium text-ink-muted mb-3 px-1">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <ToolCard key={tool.title} tool={tool} hasVip={hasVip} />
        ))}
      </div>
    </section>
  );
}

function ToolCard({ tool, hasVip }: { tool: Tool; hasVip: boolean }) {
  const locked = tool.vip && !hasVip;

  const body = (
    <>
      <div className="flex items-start justify-between">
        <span
          className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
            tool.soon
              ? "border-line bg-paper/40 text-ink-muted/60"
              : "border-line bg-surface-raised text-amber group-hover:border-amber/40 transition-colors"
          }`}
        >
          <Icon name={tool.icon} size={22} />
        </span>

        {tool.soon ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn shrink-0">
            <Icon name="wrench" size={11} />
            Em breve
          </span>
        ) : locked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber/30 px-2.5 py-1 text-xs font-medium text-amber shrink-0">
            <Icon name="lock" size={11} />
            VIP
          </span>
        ) : (
          <Icon
            name="chevron"
            size={18}
            className="text-ink-muted/40 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
          />
        )}
      </div>

      <p className={`text-[15px] font-medium mt-4 ${tool.soon ? "text-ink-muted" : "text-ink"}`}>{tool.title}</p>
      <p className={`text-sm mt-1 leading-relaxed ${tool.soon ? "text-ink-muted/70" : "text-ink-muted"}`}>
        {tool.description}
      </p>
    </>
  );

  const base = "flex flex-col rounded-2xl border border-line bg-surface p-5 h-full";

  if (tool.soon) {
    return (
      <div aria-disabled="true" className={`${base} cursor-not-allowed`}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={locked ? "/dashboard/plano" : tool.href}
      className={`${base} group hover:border-amber/30 hover:bg-surface-raised/40 transition-colors`}
    >
      {body}
    </Link>
  );
}
