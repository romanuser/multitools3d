function normalize(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function capitalizeWords(v: string) {
  return v
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const GREETINGS = ["oi", "ola", "eae", "opa", "bom dia", "boa tarde", "boa noite"];

export type AssistantIntent =
  | { type: "greeting" }
  | { type: "register" }
  | { type: "add_printer"; name: string }
  | { type: "add_filament"; grams: number; material: string; color: string }
  | { type: "unknown" };

function extractAmountGrams(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|quilos?|gramas?|g)\b/);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(",", "."));
  const unit = match[2];
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return unit.startsWith("kg") || unit.startsWith("quilo") ? amount * 1000 : amount;
}

function extractMaterial(text: string): string | null {
  const match = text.match(/\b(pla|petg|abs|tpu)\b/);
  return match ? match[1].toUpperCase() : null;
}

function extractColor(text: string): string | null {
  const match = text.match(/\bcor\s+([a-z]+)/);
  if (match) return capitalizeWords(match[1]);
  // fallback: cores comuns citadas soltas na frase
  const commonColors = [
    "vermelho", "vermelha", "azul", "verde", "preto", "preta", "branco", "branca",
    "amarelo", "amarela", "laranja", "roxo", "roxa", "cinza", "rosa", "dourado", "prata",
  ];
  const found = commonColors.find((c) => new RegExp(`\\b${c}\\b`).test(text));
  return found ? capitalizeWords(found) : null;
}

export function parseIntent(raw: string): AssistantIntent {
  const text = normalize(raw);

  if (GREETINGS.some((g) => text === g || text.startsWith(`${g} `))) {
    return { type: "greeting" };
  }

  if (/cadastr\w*\s*(minha\s*)?conta|criar\s*conta|quero\s*me\s*cadastrar|\bregistrar\b/.test(text)) {
    return { type: "register" };
  }

  if (/impressora/.test(text) && /cadastr\w*|adicion\w*|nov[ao]/.test(text)) {
    const idx = raw.toLowerCase().indexOf("impressora");
    let name = idx >= 0 ? raw.slice(idx + "impressora".length).trim() : "";
    name = name.replace(/^(chamada|chamado|nome|de nome|:)\s*/i, "").trim();
    return { type: "add_printer", name: name ? capitalizeWords(name) : "Nova impressora" };
  }

  if (/estoque|filamento/.test(text) && /adicion\w*|compr\w*|entrou|chegou/.test(text)) {
    const grams = extractAmountGrams(text);
    if (grams) {
      return {
        type: "add_filament",
        grams,
        material: extractMaterial(text) || "PLA",
        color: extractColor(text) || "Sem cor definida",
      };
    }
  }

  return { type: "unknown" };
}
