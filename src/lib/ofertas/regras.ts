// ---------------------------------------------------------------------
// Regras puras do caçador (sem banco, sem internet) — fáceis de testar.
// ---------------------------------------------------------------------
import { REGRAS, type Busca } from "./config";

export type Item = {
  id: string; titulo: string; preco: number; precoOriginal: number | null; permalink: string; thumb: string | null;
  freteGratis: boolean; full: boolean; novo: boolean; lojaOficial: boolean;
};
export type Leitura = { preco: number; em: string };   // histórico de preço (ISO)

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// O título combina com a busca? (evita "suporte de filamento" na busca de filamento)
export function combina(item: Pick<Item, "titulo" | "preco" | "novo">, b: Busca) {
  if (!item.novo) return false;
  const t = norm(item.titulo);
  const palavras = (lista: string[]) => lista.some((p) => new RegExp(`(^|[^a-z0-9])${norm(p)}`).test(t));
  if (!palavras(b.obrigatorias)) return false;
  if (b.exigidas?.length && !b.exigidas.every((p) => palavras([p]))) return false;
  if (b.proibidas && palavras(b.proibidas)) return false;
  if (b.precoMin != null && item.preco < b.precoMin) return false;
  if (b.precoMax != null && item.preco > b.precoMax) return false;
  return true;
}

export type Avaliacao = { oferta: boolean; motivo: string; desconto: number; deReferencia: number | null; menor30: boolean; pontos: number; alvo?: number };

// embalagem de 1 kg? ("1kg", "1 kg", "1,0 kg", "1000g")
export const ehUmKg = (titulo: string) => /(^|[^0-9.,])1([.,]0+)?\s?kg\b|(^|[^0-9])1000\s?g\b/i.test(titulo);

// É promoção de verdade? Usa o preço riscado do anúncio E/OU o histórico que o bot guardou.
export function avaliar(item: Item, historico: Leitura[], agora = Date.now(), busca?: Pick<Busca, "alvo" | "pesoKg">): Avaliacao {
  const r = avaliarQueda(item, historico, agora);
  // PREÇO-ALVO: preço bom de verdade, mesmo que não tenha caído (ex.: PETG 1 kg até R$ 70)
  if (!r.oferta && busca?.alvo && item.preco <= busca.alvo && (!busca.pesoKg || ehUmKg(item.titulo))) {
    const h = historico.filter((x) => x.preco > 0), media = h.length ? h.reduce((s, x) => s + x.preco, 0) / h.length : null;
    const abaixo = media && media > item.preco ? 1 - item.preco / media : 0;
    const riscado = item.precoOriginal && item.precoOriginal > item.preco ? 1 - item.preco / item.precoOriginal : 0;
    const desconto = Math.max(abaixo, riscado), ref = riscado >= abaixo ? (riscado ? item.precoOriginal : null) : media;
    return { oferta: true, motivo: `preço bom (até R$ ${busca.alvo})`, desconto, deReferencia: desconto >= 0.05 && ref ? Math.round(ref * 100) / 100 : null,
      menor30: false, alvo: busca.alvo, pontos: ((busca.alvo - item.preco) / busca.alvo) * 100 + (item.freteGratis ? 4 : 0) + (item.full ? 3 : 0) + (item.lojaOficial ? 3 : 0) };
  }
  return r;
}

function avaliarQueda(item: Item, historico: Leitura[], agora: number): Avaliacao {
  const h = historico.filter((x) => agora - Date.parse(x.em) <= 30 * 864e5 && x.preco > 0);
  const dias = new Set(h.map((x) => x.em.slice(0, 10))).size;
  const confiavel = h.length >= REGRAS.historicoMinAmostras && dias >= REGRAS.historicoMinDias;
  const min = h.length ? Math.min(...h.map((x) => x.preco)) : null;
  const media = h.length ? h.reduce((s, x) => s + x.preco, 0) / h.length : null;
  const noMenor = min == null || item.preco <= min * (1 + REGRAS.folgaMinimo);
  const riscado = item.precoOriginal && item.precoOriginal > item.preco ? 1 - item.preco / item.precoOriginal : 0;
  const abaixoMedia = confiavel && media ? 1 - item.preco / media : 0;

  let oferta = false, motivo = "sem desconto relevante", desconto = 0, ref: number | null = null;
  // Só publica quem o bot já conhece (evita o golpe do "de/por" eterno): sem histórico confiável, só observa.
  if (!confiavel) return { oferta: false, motivo: "observando o preço (histórico ainda curto)", desconto: 0, deReferencia: null, menor30: false, pontos: 0 };
  // Preço riscado só vale se o preço atual estiver mesmo abaixo do que ele costuma custar.
  const riscadoValido = riscado >= REGRAS.descontoRiscadoMin && noMenor && item.preco <= media! * (1 - REGRAS.riscadoAbaixoDaMedia);
  if (riscadoValido) { oferta = true; motivo = "preço riscado e abaixo do normal"; desconto = riscado; ref = item.precoOriginal; }
  if (confiavel && abaixoMedia >= REGRAS.abaixoDaMediaMin && noMenor && abaixoMedia > desconto) {
    oferta = true; motivo = "abaixo da média de 30 dias"; desconto = abaixoMedia; ref = Math.round(media! * 100) / 100;
  }
  if (!oferta && riscado >= REGRAS.descontoRiscadoMin) motivo = !noMenor ? "riscado, mas já esteve mais barato" : "riscado, mas é o preço de sempre";
  const pontos = desconto * 100 + (item.freteGratis ? 4 : 0) + (item.full ? 3 : 0) + (item.lojaOficial ? 3 : 0) + (confiavel && noMenor ? 5 : 0);
  return { oferta, motivo, desconto, deReferencia: ref, menor30: confiavel && noMenor, pontos };
}

// Já publicou essa oferta há pouco? Só republica se baixou mais.
export function podeRepublicar(precoAtual: number, ultima: { preco: number; em: string } | null, agora = Date.now()) {
  if (!ultima) return true;
  if (agora - Date.parse(ultima.em) > REGRAS.diasSemRepetir * 864e5) return true;
  return precoAtual <= ultima.preco * (1 - REGRAS.repetirSoSeBaixar);
}

// Link de afiliado: acrescenta os parâmetros do SEU link do portal (ex.: "matt_word=x&matt_tool=y")
export function linkAfiliado(permalink: string, params: string | undefined) {
  const base = permalink.split("#")[0];
  const p = (params || "").trim().replace(/^[?&]+/, "");
  if (!p) return base;
  const url = new URL(base);
  for (const [k, v] of new URLSearchParams(p)) url.searchParams.set(k, v);
  return url.toString();
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const curto = (t: string, n = 90) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Mensagem do Telegram (HTML)
export function mensagemTelegram(item: Item, a: Avaliacao, rotulo: string) {
  const linhas = [
    `🔥 <b>${esc(curto(item.titulo))}</b>`,
    a.deReferencia ? `💸 De <s>${brl(a.deReferencia)}</s> por <b>${brl(item.preco)}</b>  (−${Math.round(a.desconto * 100)}%)` : `💸 Por <b>${brl(item.preco)}</b>`,
    a.menor30 ? "📉 Menor preço dos últimos 30 dias" : null,
    a.alvo ? `🎯 Preço bom: até R$ ${a.alvo} o kg` : null,
    [item.freteGratis ? "🚚 Frete grátis" : null, item.full ? "⚡ Full" : null, item.lojaOficial ? "🏷️ Loja oficial" : null].filter(Boolean).join("  ·  ") || null,
    `#${rotulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "")}`,
  ];
  return linhas.filter(Boolean).join("\n");
}

// Mensagem pro WhatsApp (formatação do próprio WhatsApp: *negrito* e ~riscado~)
export function mensagemWhatsApp(item: Item, a: Avaliacao, link: string) {
  return [
    `🔥 *${curto(item.titulo)}*`,
    a.deReferencia ? `💸 De ~${brl(a.deReferencia)}~ por *${brl(item.preco)}* (−${Math.round(a.desconto * 100)}%)` : `💸 Por *${brl(item.preco)}*`,
    a.menor30 ? "📉 Menor preço dos últimos 30 dias" : null,
    a.alvo ? `🎯 Preço bom: até R$ ${a.alvo} o kg` : null,
    [item.freteGratis ? "🚚 Frete grátis" : null, item.full ? "⚡ Full" : null].filter(Boolean).join("  ·  ") || null,
    "",
    `👉 ${link}`,
  ].filter((x) => x !== null).join("\n");
}
