// ---------------------------------------------------------------------
// Caçador de promoções — o que buscar e quando publicar.
// Pra mudar o que o bot procura, é só editar a lista BUSCAS.
// ---------------------------------------------------------------------
export type Busca = {
  id: string;
  termo: string;              // como você digitaria na busca do Mercado Livre
  rotulo: string;             // aparece na mensagem e na página (ex.: "Filamento PLA")
  obrigatorias: string[];     // o título precisa ter PELO MENOS UMA dessas palavras
  exigidas?: string[];        // ...e TODAS estas (ex.: corrente tem que ser "chaveiro")
  proibidas?: string[];       // se o título tiver alguma, descarta
  precoMin?: number;          // (opcional, não usado por padrão: preço não separa produto de acessório)
  precoMax?: number;
  alvo?: number;              // PREÇO-ALVO: publica se custar até isso (mesmo sem ter caído)
  pesoKg?: boolean;           //   ...só vale pra embalagem de 1 kg (evita carretel de 500 g "barato")
};

const PECAS = ["filamento", "bico", "nozzle", "hotend", "hot end", "mesa", "capa", "peca", "peça", "suporte", "caneta", "cabo", "correia", "motor", "extrusora", "extrusor", "ventoinha", "cooler", "placa", "sensor", "refil", "bobina", "secador", "adesivo", "termistor", "tubo", "ptfe", "engrenagem", "rolamento", "fonte"];

export const BUSCAS: Busca[] = [
  // --- filamentos (alvo = preço bom por 1 kg) ---
  { id: "pla", termo: "filamento pla 1kg 1.75", rotulo: "Filamento PLA", obrigatorias: ["pla"], proibidas: ["suporte", "secador", "caixa", "amostra"], alvo: 65, pesoKg: true },
  { id: "petg", termo: "filamento petg 1kg 1.75", rotulo: "Filamento PETG", obrigatorias: ["petg"], proibidas: ["suporte", "secador", "amostra"], alvo: 70, pesoKg: true },
  { id: "abs", termo: "filamento abs 1kg 1.75", rotulo: "Filamento ABS/ASA", obrigatorias: ["abs", "asa"], proibidas: ["suporte", "secador"], alvo: 70, pesoKg: true },
  { id: "tpu", termo: "filamento tpu flexivel", rotulo: "Filamento TPU", obrigatorias: ["tpu", "flex"], proibidas: ["suporte"], alvo: 110, pesoKg: true },
  { id: "silk", termo: "filamento pla silk", rotulo: "Filamento Silk", obrigatorias: ["silk"], proibidas: ["suporte"], alvo: 75, pesoKg: true },
  { id: "pla2", termo: "filamento pla 1.75mm", rotulo: "Filamento PLA", obrigatorias: ["pla"], proibidas: ["suporte", "secador", "caixa", "amostra"], alvo: 65, pesoKg: true },
  { id: "petg2", termo: "filamento petg 1.75mm", rotulo: "Filamento PETG", obrigatorias: ["petg"], proibidas: ["suporte", "secador", "amostra"], alvo: 70, pesoKg: true },
  // --- impressoras (sem alvo por enquanto: publica só por queda de preço) ---
  { id: "bambu", termo: "bambu lab impressora 3d", rotulo: "Impressora Bambu Lab", obrigatorias: ["bambu"], exigidas: ["impressora"], proibidas: PECAS },
  { id: "creality", termo: "impressora 3d creality", rotulo: "Impressora Creality", obrigatorias: ["creality"], exigidas: ["impressora"], proibidas: PECAS },
  { id: "impressora", termo: "impressora 3d", rotulo: "Impressora 3D", obrigatorias: ["impressora 3d", "impressora3d"], proibidas: PECAS },
  // --- acessórios e insumos ---
  { id: "bico", termo: "bico nozzle impressora 3d", rotulo: "Bicos / hotend", obrigatorias: ["bico", "nozzle", "hotend"] },
  { id: "mesa", termo: "mesa pei impressora 3d", rotulo: "Mesa PEI", obrigatorias: ["pei", "mesa", "placa"], proibidas: ["filamento"] },
  { id: "secador", termo: "secador de filamento", rotulo: "Secador de filamento", obrigatorias: ["secador", "dryer"] },
  { id: "resina", termo: "resina impressora 3d", rotulo: "Resina", obrigatorias: ["resina"], proibidas: ["epoxi", "epóxi", "artesanato"] },
  // --- insumos pra quem vende chaveiro e brinde ---
  { id: "nfc", termo: "tag nfc ntag215", rotulo: "Tag NFC", obrigatorias: ["nfc", "ntag"], proibidas: ["leitor", "celular", "capa", "smartphone"] },
  { id: "ziplock", termo: "saco ziplock holografico", rotulo: "Embalagem ziplock holográfica", obrigatorias: ["holograf"], proibidas: ["adesivo", "papel", "vinil", "glitter"] },
  { id: "ballchain", termo: "ball chain corrente bolinha chaveiro", rotulo: "Ball chain", obrigatorias: ["ball chain", "ballchain", "bolinha"], proibidas: ["colar", "925", "ouro", "folheado"] },
  { id: "corrente", termo: "corrente argola para chaveiro", rotulo: "Correntes e argolas p/ chaveiro", obrigatorias: ["corrente", "argola", "chain", "elo"], exigidas: ["chaveiro"], proibidas: ["colar", "925", "ouro", "folheado"] },
  { id: "alicate", termo: "alicate de corte rente", rotulo: "Alicates", obrigatorias: ["alicate"], proibidas: ["unha", "cuticula", "manicure", "eletricista"] },
];

// Limites em % ajustáveis pela Netlify, sem mexer no código:
//   OFERTAS_QUEDA_MIN   = queda mínima abaixo do preço normal (padrão 7)
//   OFERTAS_RISCADO_MIN = desconto riscado mínimo (padrão 10)
const pct = (v: string | undefined, padrao: number) => {
  const n = Number(String(v ?? "").replace(",", ".").replace("%", "").trim());
  return Number.isFinite(n) && n >= 1 && n <= 80 ? n / 100 : padrao;
};

export const REGRAS = {
  descontoRiscadoMin: pct(process.env.OFERTAS_RISCADO_MIN, 0.10),   // preço "riscado": no mínimo 10% de desconto
  abaixoDaMediaMin: pct(process.env.OFERTAS_QUEDA_MIN, 0.07),       // pelo histórico: 7% abaixo da média dos últimos 30 dias
  riscadoAbaixoDaMedia: 0.03,   // o riscado só conta se o preço estiver ao menos 3% abaixo da média (não é "o preço de sempre")
  historicoMinAmostras: 5,      // pra confiar no histórico, pelo menos 5 leituras
  historicoMinDias: 2,          //   espalhadas em pelo menos 2 dias
  folgaMinimo: 0.01,            // "menor preço" aceita até 1% acima do menor já visto
  repetirSoSeBaixar: 0.03,      // republica a mesma oferta só se baixar mais 3%
  diasSemRepetir: 7,
  maxPorRodada: 4,              // máximo de publicações por execução (de hora em hora)
  maxPorDia: 24,
  buscasPorRodada: 5,           // cada execução cobre só algumas buscas (cabe no tempo da Netlify) — todas em ~4 h
};
