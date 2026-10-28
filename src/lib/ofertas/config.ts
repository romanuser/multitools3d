// ---------------------------------------------------------------------
// Caçador de promoções — o que buscar e quando publicar.
// Pra mudar o que o bot procura, é só editar a lista BUSCAS.
// ---------------------------------------------------------------------
export type Busca = {
  id: string;
  termo: string;              // como você digitaria na busca do Mercado Livre
  rotulo: string;             // aparece na mensagem e na página (ex.: "Filamento PLA")
  obrigatorias: string[];     // o título precisa ter PELO MENOS UMA dessas palavras
  proibidas?: string[];       // se o título tiver alguma, descarta
  precoMin?: number;          // descarta itens baratos demais (acessório, amostra)
  precoMax?: number;
};

export const BUSCAS: Busca[] = [
  { id: "pla", termo: "filamento pla 1kg 1.75", rotulo: "Filamento PLA", obrigatorias: ["pla"], proibidas: ["suporte", "secador", "caixa", "amostra"], precoMin: 45 },
  { id: "petg", termo: "filamento petg 1kg 1.75", rotulo: "Filamento PETG", obrigatorias: ["petg"], proibidas: ["suporte", "secador", "amostra"], precoMin: 50 },
  { id: "abs", termo: "filamento abs 1kg 1.75", rotulo: "Filamento ABS/ASA", obrigatorias: ["abs", "asa"], proibidas: ["suporte", "secador"], precoMin: 45 },
  { id: "tpu", termo: "filamento tpu flexivel", rotulo: "Filamento TPU", obrigatorias: ["tpu", "flex"], proibidas: ["suporte"], precoMin: 50 },
  { id: "silk", termo: "filamento pla silk", rotulo: "Filamento Silk", obrigatorias: ["silk"], proibidas: ["suporte"], precoMin: 45 },
  { id: "bambu", termo: "bambu lab impressora 3d", rotulo: "Impressora Bambu Lab", obrigatorias: ["bambu"], proibidas: ["filamento", "bico", "nozzle", "capa", "suporte"], precoMin: 1200 },
  { id: "creality", termo: "impressora 3d creality", rotulo: "Impressora Creality", obrigatorias: ["creality"], proibidas: ["filamento", "bico", "nozzle", "capa", "peca", "peça"], precoMin: 900 },
  { id: "bico", termo: "bico nozzle impressora 3d", rotulo: "Bicos / hotend", obrigatorias: ["bico", "nozzle", "hotend"], precoMin: 15 },
  { id: "mesa", termo: "mesa pei impressora 3d", rotulo: "Mesa PEI", obrigatorias: ["pei", "mesa", "placa"], proibidas: ["filamento"], precoMin: 40 },
  { id: "secador", termo: "secador de filamento", rotulo: "Secador de filamento", obrigatorias: ["secador", "dryer"], precoMin: 100 },
  { id: "resina", termo: "resina impressora 3d", rotulo: "Resina", obrigatorias: ["resina"], proibidas: ["epoxi", "epóxi", "artesanato"], precoMin: 60 },
];

export const REGRAS = {
  descontoRiscadoMin: 0.15,     // preço "riscado" do anúncio: no mínimo 15% de desconto
  abaixoDaMediaMin: 0.12,       // pelo histórico: 12% abaixo da média dos últimos 30 dias
  riscadoAbaixoDaMedia: 0.03,   // o riscado só conta se o preço estiver ao menos 3% abaixo da média (não é "o preço de sempre")
  historicoMinAmostras: 5,      // pra confiar no histórico, pelo menos 5 leituras
  historicoMinDias: 2,          //   espalhadas em pelo menos 2 dias
  folgaMinimo: 0.01,            // "menor preço" aceita até 1% acima do menor já visto
  repetirSoSeBaixar: 0.03,      // republica a mesma oferta só se baixar mais 3%
  diasSemRepetir: 7,
  maxPorRodada: 4,              // máximo de publicações por execução (de hora em hora)
  maxPorDia: 24,
  buscasPorRodada: 4,           // cada execução cobre só algumas buscas (cabe no tempo da Netlify)
};
