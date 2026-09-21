import Link from "next/link";
import { Icon } from "@/components/icons";

export function EmDesenvolvimento() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <Icon name="chevron" size={14} className="rotate-180" />
          Ferramentas
        </Link>

        <div className="mt-6 rounded-2xl border border-line bg-surface p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-11 h-11 rounded-xl bg-surface-raised border border-line flex items-center justify-center text-ink-muted">
              <Icon name="camera" size={22} />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">
              <Icon name="wrench" size={13} />
              Em desenvolvimento
            </span>
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink mb-3">
            Foto → Modelo 3D
          </h1>
          <p className="text-ink-muted leading-relaxed mb-8 max-w-prose">
            Estamos construindo essa ferramenta. Ela vai transformar uma foto em modelo 3D com IA,
            já no tamanho real do objeto. Enquanto isso, você pode montar peças no Modelador 3D ou
            gerar texto curvado no Gerador de texto STL.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/modelador-3d"
              className="inline-flex items-center rounded-lg bg-amber text-on-accent text-sm font-medium px-4 py-2.5 hover:brightness-110 transition"
            >
              Abrir o Modelador 3D
            </Link>
            <Link
              href="/dashboard/gerador-stl-curvo"
              className="inline-flex items-center rounded-lg border border-line text-ink text-sm font-medium px-4 py-2.5 hover:bg-surface-raised transition-colors"
            >
              Abrir o Gerador de texto STL
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
