// Comunidade: categorias, endereços e textos (servidor e tela)
export const CATEGORIAS = [
  { id: "duvidas", nome: "Dúvidas gerais", icone: "💬" },
  { id: "problemas", nome: "Problemas de impressão", icone: "🛠️" },
  { id: "calibracao", nome: "Calibração", icone: "🎯" },
  { id: "filamentos", nome: "Filamentos", icone: "🧵" },
  { id: "impressoras", nome: "Impressoras", icone: "🖨️" },
  { id: "mostre", nome: "Mostre sua peça", icone: "📸" },
  { id: "negocio", nome: "Negócio e vendas", icone: "💰" },
] as const;
export type CategoriaId = (typeof CATEGORIAS)[number]["id"];
export const nomeCategoria = (id: string) => CATEGORIAS.find((c) => c.id === id)?.nome ?? "Dúvidas gerais";

// "PETG fazendo fiapos na A1" → "petg-fazendo-fiapos-na-a1" (endereço que o Google entende)
export function slug(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "pergunta";
}
export const urlTopico = (t: { id: string; titulo: string }) => `/comunidade/${t.id}/${slug(t.titulo)}`;

export const MATERIAIS = ["PLA", "PETG", "ABS", "ASA", "TPU", "PLA Silk", "Outro"];

// "há 3 horas", "há 2 dias"…
export function haQuanto(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const p = (n: number, um: string, v: string) => `há ${n} ${n === 1 ? um : v}`;
  if (s < 60) return "agora";
  if (s < 3600) return p(Math.floor(s / 60), "minuto", "minutos");
  if (s < 86400) return p(Math.floor(s / 3600), "hora", "horas");
  if (s < 2592000) return p(Math.floor(s / 86400), "dia", "dias");
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
