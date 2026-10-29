// ---------------------------------------------------------------------
// Uma rodada do caçador: busca → filtra → compara com o histórico → publica.
// O banco entra por parâmetro (Db) pra dar pra testar sem Supabase.
// ---------------------------------------------------------------------
import { BUSCAS, REGRAS, type Busca } from "./config";
import { alvoDe, avaliar, combina, pesoDe, linkAfiliado, mensagemTelegram, mensagemWhatsApp, podeRepublicar, type Item, type Leitura, type Avaliacao } from "./regras";
import { buscar, renovar, ErroML, type TokenML } from "./ml";
import { avisarAdmin, postarOferta, telegramConfigurado } from "./telegram";

export interface Db {
  token(): Promise<TokenML | null>;
  salvarToken(t: TokenML): Promise<void>;
  historico(ids: string[]): Promise<Map<string, Leitura[]>>;
  ultimasPublicacoes(ids: string[]): Promise<Map<string, { preco: number; em: string }>>;
  publicadasHoje(): Promise<number>;
  salvarItens(itens: (Item & { busca: string })[]): Promise<void>;
  salvarPrecos(linhas: { item_id: string; preco: number }[]): Promise<void>;
  registrarPublicacao(p: { item_id: string; preco: number; desconto: number; motivo: string; busca: string; link: string; mensagem_wa: string; telegram_ok: boolean; erro: string | null }): Promise<void>;
  registrarExecucao(e: Record<string, unknown>): Promise<void>;
  limparAntigos(): Promise<void>;
}
export type Deps = {
  db: Db; agora?: number; publicar: boolean; todas?: boolean; ids?: string[];   // ids: testar só essas buscas
  buscarFn?: typeof buscar; renovarFn?: typeof renovar;
  postarFn?: typeof postarOferta; avisarFn?: typeof avisarAdmin; telegramOk?: () => boolean;
};
export type Achado = { item: Item; busca: Busca; aval: Avaliacao; link: string; publicada?: boolean; motivoNao?: string };

export function buscasDaRodada(agora: number, todas = false) {
  if (todas) return BUSCAS;
  const n = REGRAS.buscasPorRodada, inicio = (Math.floor(agora / 3600e3) * n) % BUSCAS.length;
  return Array.from({ length: Math.min(n, BUSCAS.length) }, (_, i) => BUSCAS[(inicio + i) % BUSCAS.length]);
}

export async function rodar(d: Deps) {
  const agora = d.agora ?? Date.now(), t0 = Date.now();
  const buscarFn = d.buscarFn ?? buscar, renovarFn = d.renovarFn ?? renovar;
  const postarFn = d.postarFn ?? postarOferta, avisarFn = d.avisarFn ?? avisarAdmin, telegramOk = d.telegramOk ?? telegramConfigurado;
  const erros: string[] = [];
  // Trava: sem o link de afiliado configurado, só observa (nunca publica link sem a sua comissão)
  const semAfiliado = !process.env.ML_AFILIADO_PARAMS?.trim();
  const publicar = d.publicar && !semAfiliado;
  if (d.publicar && semAfiliado) erros.push("Sem ML_AFILIADO_PARAMS: só observando preços, nada é publicado até configurar o link de afiliado.");

  // 1) acesso ao Mercado Livre (renova sozinho quando está pra vencer)
  let tk = await d.db.token();
  if (!tk) throw new Error("Mercado Livre não conectado. Em Admin → Ofertas, clique em “Conectar Mercado Livre”.");
  if (Date.parse(tk.expira_em) - agora < 10 * 60e3) { tk = await renovarFn(tk.refresh_token); await d.db.salvarToken(tk); }

  // 2) busca (em paralelo) e filtro por título/preço
  const buscas = d.ids?.length ? BUSCAS.filter((b) => d.ids!.includes(b.id)) : buscasDaRodada(agora, d.todas);
  // Se o acesso vencer no meio, as buscas (em paralelo) esperam UMA renovação só e tentam de novo.
  let renovacao: Promise<TokenML> | null = null;
  const buscarComRenovacao = async (b: Busca): Promise<Item[]> => {
    const usado = tk!.access_token;
    try { return await buscarFn(usado, b.termo); }
    catch (e) {
      if (!(e instanceof ErroML && e.status === 401)) throw e;
      renovacao ??= renovarFn(tk!.refresh_token).then(async (novo) => { tk = novo; await d.db.salvarToken(novo); return novo; });
      const novo = await renovacao;
      return buscarFn(novo.access_token, b.termo);
    }
  };
  // em lotes (não dispara tudo de uma vez na API)
  const lotes: PromiseSettledResult<Item[]>[] = [];
  for (let i = 0; i < buscas.length; i += REGRAS.buscasEmParalelo)
    lotes.push(...(await Promise.allSettled(buscas.slice(i, i + REGRAS.buscasEmParalelo).map(buscarComRenovacao))));
  const porId = new Map<string, { item: Item; busca: Busca }>();
  let lidos = 0;
  lotes.forEach((r, i) => {
    if (r.status === "rejected") { erros.push(String(r.reason?.message || r.reason)); return; }
    lidos += r.value.length;
    for (const item of r.value) if (combina(item, buscas[i]) && !porId.has(item.id)) porId.set(item.id, { item, busca: buscas[i] });
  });
  const ids = [...porId.keys()];
  // pra conferência: os mais baratos que o bot enxergou em cada busca
  const vistos = buscas.map((b) => ({
    busca: b.id.startsWith("m_") ? `${b.rotulo} (${b.termo.split(" ").pop()})` : b.rotulo, alvo: b.alvo ?? null,
    itens: [...porId.values()].filter((x) => x.busca.id === b.id).map((x) => x.item).sort((a, c) => a.preco - c.preco).slice(0, 4)
      .map((i) => ({ titulo: i.titulo, preco: i.preco, peso: pesoDe(i.titulo), teto: alvoDe(i.titulo, b) ?? null })),
  }));

  // 3) compara com o histórico (ANTES de gravar a leitura de agora)
  const [hist, ultimas] = await Promise.all([d.db.historico(ids), d.db.ultimasPublicacoes(ids)]);
  const achados: Achado[] = [];
  for (const { item, busca } of porId.values()) {
    const aval = avaliar(item, hist.get(item.id) ?? [], agora, busca);
    if (aval.oferta) achados.push({ item, busca, aval, link: linkAfiliado(item.permalink, process.env.ML_AFILIADO_PARAMS) });
  }
  achados.sort((a, b) => b.aval.pontos - a.aval.pontos);

  // 4) guarda itens e preços de hoje (vira histórico das próximas rodadas)
  const lista = [...porId.values()];
  if (lista.length) {
    await d.db.salvarItens(lista.map(({ item, busca }) => ({ ...item, busca: busca.id })));
    await d.db.salvarPrecos(lista.map(({ item }) => ({ item_id: item.id, preco: item.preco })));
  }

  // 5) publica as melhores (com limites por rodada e por dia)
  let publicadas = 0;
  if (publicar) {
    const restanteDia = REGRAS.maxPorDia - (await d.db.publicadasHoje());
    const limite = Math.max(0, Math.min(REGRAS.maxPorRodada, restanteDia));
    for (const a of achados) {
      if (publicadas >= limite) { a.motivoNao = "limite de publicações atingido"; continue; }
      if (!podeRepublicar(a.item.preco, ultimas.get(a.item.id) ?? null, agora)) { a.motivoNao = "já publicada recentemente"; continue; }
      const wa = mensagemWhatsApp(a.item, a.aval, a.link);
      let ok = false, erro: string | null = null;
      if (telegramOk()) {
        try { await postarFn(mensagemTelegram(a.item, a.aval, a.busca.rotulo), a.link, a.item.thumb); ok = true; }
        catch (e) { erro = e instanceof Error ? e.message : String(e); erros.push(erro); }
      }
      try { await avisarFn(`Nova oferta (${a.busca.rotulo}) — toque no botão pra mandar no WhatsApp:\n\n${wa}`, wa); } catch (e) { erros.push(String((e as Error).message)); }
      await d.db.registrarPublicacao({ item_id: a.item.id, preco: a.item.preco, desconto: a.aval.desconto, motivo: a.aval.motivo, busca: a.busca.id, link: a.link, mensagem_wa: wa, telegram_ok: ok, erro });
      a.publicada = true; publicadas++;
    }
  }

  await d.db.limparAntigos();
  const resumo = { buscas: buscas.map((b) => b.id), lidos, relevantes: ids.length, ofertas: achados.length, publicadas, erros, ms: Date.now() - t0 };
  await d.db.registrarExecucao({ ...resumo, publicar });
  return { ...resumo, vistos, achados: achados.map((a) => ({ id: a.item.id, titulo: a.item.titulo, preco: a.item.preco, desconto: Math.round(a.aval.desconto * 100), motivo: a.aval.motivo, busca: a.busca.id, publicada: !!a.publicada, motivoNao: a.motivoNao ?? null, link: a.link })) };
}
