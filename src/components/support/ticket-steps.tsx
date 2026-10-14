import { SUPPORT_STEPS, stepIndex } from "@/lib/support/types";

// Etapas do chamado: Aberto → Em análise → Respondido → Resolvido.
export function TicketSteps({ status }: { status: string }) {
  const current = stepIndex(status);
  const closed = status === "fechado";
  return (
    <ol className="flex items-start" aria-label="Etapas do chamado">
      {SUPPORT_STEPS.map((step, i) => {
        const done = closed || i < current;
        const active = !closed && i === current;
        return (
          <li key={step.key} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <span
                className={`absolute top-3.5 right-1/2 w-full h-0.5 -z-0 ${done || active ? "bg-amber" : "bg-line"}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                done
                  ? "bg-amber border-amber text-on-accent"
                  : active
                    ? "bg-surface border-amber text-amber ring-4 ring-amber/20"
                    : "bg-surface border-line text-ink-muted"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`mt-1.5 text-[11px] text-center leading-tight ${active ? "text-ink font-medium" : "text-ink-muted"}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function StatusBadge({ status, admin = false }: { status: string; admin?: boolean }) {
  const map: Record<string, [string, string, string]> = {
    aberto: ["Aberto", "Novo", "text-amber border-amber/40 bg-amber-soft"],
    em_analise: ["Em análise", "Em análise", "text-sky-300 border-sky-400/40 bg-sky-500/10"],
    aguardando_cliente: ["Respondido", "Aguardando cliente", "text-good border-good/40 bg-good/10"],
    resolvido: ["Resolvido", "Resolvido", "text-good border-good/40 bg-good/10"],
    fechado: ["Encerrado", "Encerrado", "text-ink-muted border-line"],
  };
  const [userLabel, adminLabel, tone] = map[status] ?? [status, status, "text-ink-muted border-line"];
  return (
    <span className={`text-[11px] border rounded-full px-2 py-0.5 whitespace-nowrap ${tone}`}>
      {admin ? adminLabel : userLabel}
    </span>
  );
}
