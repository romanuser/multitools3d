export const SUPPORT_CATEGORIES = [
  { value: "duvida", label: "Dúvida" },
  { value: "problema", label: "Problema / erro" },
  { value: "plano", label: "Plano e pagamento" },
  { value: "sugestao", label: "Sugestão" },
] as const;

export const SUPPORT_STATUS: Record<string, { label: string; adminLabel: string; tone: string }> = {
  aberto: { label: "Aberto", adminLabel: "Novo", tone: "text-amber border-amber/40 bg-amber-soft" },
  em_analise: { label: "Em análise", adminLabel: "Em análise", tone: "text-blue-300 border-blue-400/40 bg-blue-500/10" },
  aguardando_cliente: { label: "Respondido", adminLabel: "Aguardando cliente", tone: "text-good border-good/40 bg-good/10" },
  resolvido: { label: "Resolvido", adminLabel: "Resolvido", tone: "text-good border-good/40 bg-good/10" },
  fechado: { label: "Encerrado", adminLabel: "Encerrado", tone: "text-ink-muted border-line" },
};

// As etapas que aparecem no topo do chamado.
export const SUPPORT_STEPS = [
  { key: "aberto", label: "Aberto" },
  { key: "em_analise", label: "Em análise" },
  { key: "aguardando_cliente", label: "Respondido" },
  { key: "resolvido", label: "Resolvido" },
] as const;

export function stepIndex(status: string) {
  if (status === "fechado") return SUPPORT_STEPS.length; // tudo concluído
  return Math.max(0, SUPPORT_STEPS.findIndex((s) => s.key === status));
}

export function categoryLabel(value: string) {
  return SUPPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function ticketNumber(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

export type SupportMessage = {
  id: string;
  author_role: "user" | "admin" | "system";
  body: string;
  created_at: string;
};
