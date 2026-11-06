// Como cada carretel aparece nas listas: dá pra saber qual é qual mesmo com cor e marca iguais.
export type SituacaoCarretel = "lacrado" | "em_uso" | "acabado";

export type CarretelBase = {
  id: string;
  material: string;
  color: string;
  brand?: string | null;
  numero?: number | null;
  status?: SituacaoCarretel | string | null;
  current_grams?: number | null;
};

// colunas pra pedir ao banco nas telas que listam carretéis pra escolher
export const COLUNAS_CARRETEL = "id, material, color, brand, numero, status, current_grams";

export const NOME_SITUACAO: Record<SituacaoCarretel, string> = { lacrado: "lacrado", em_uso: "em uso", acabado: "acabado" };

// "PLA · Preto · Voolt #2 (em uso, 850 g)"
export function rotuloCarretel(f: CarretelBase, { gramas = true }: { gramas?: boolean } = {}) {
  let s = `${f.material} · ${f.color}`;
  if (f.brand) s += ` · ${f.brand}`;
  if (f.numero) s += ` #${f.numero}`;
  const extra: string[] = [];
  if (f.status && f.status in NOME_SITUACAO) extra.push(NOME_SITUACAO[f.status as SituacaoCarretel]);
  if (gramas && f.current_grams != null) extra.push(`${Math.round(Number(f.current_grams)).toLocaleString("pt-BR")} g`);
  return extra.length ? `${s} (${extra.join(", ")})` : s;
}

// chave do "tipo" de filamento: material + cor + marca
export const tipoCarretel = (f: CarretelBase) =>
  [f.material, f.color, f.brand ?? ""].map((x) => String(x).trim().toLowerCase()).join("|");

// ordem nas listas: por tipo; dentro do tipo, o EM USO primeiro, depois os lacrados
const ORDEM: Record<string, number> = { em_uso: 0, lacrado: 1, acabado: 2 };
export function ordenarCarreteis<T extends CarretelBase>(lista: T[]): T[] {
  return [...lista].sort(
    (a, b) =>
      a.material.localeCompare(b.material) ||
      a.color.localeCompare(b.color) ||
      (a.brand ?? "").localeCompare(b.brand ?? "") ||
      (ORDEM[a.status ?? ""] ?? 0) - (ORDEM[b.status ?? ""] ?? 0) ||
      (a.numero ?? 0) - (b.numero ?? 0)
  );
}
