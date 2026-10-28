import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Db } from "./rodar";
import type { Leitura } from "./regras";

// Banco do caçador no Supabase (chave de serviço: as tabelas são fechadas pro público).
export function dbSupabase(): Db {
  const sb = createAdminClient();
  const falhou = (op: string, e: { message: string } | null) => { if (e) throw new Error(`Banco (${op}): ${e.message}`); };
  return {
    async token() {
      const { data, error } = await sb.from("ofertas_token_ml").select("access_token, refresh_token, expira_em").eq("id", 1).maybeSingle();
      falhou("token", error); return data ?? null;
    },
    async salvarToken(t) {
      const { error } = await sb.from("ofertas_token_ml").upsert({ id: 1, ...t, atualizado_em: new Date().toISOString() }); falhou("salvar token", error);
    },
    async historico(ids) {
      const m = new Map<string, Leitura[]>(); if (!ids.length) return m;
      const desde = new Date(Date.now() - 30 * 864e5).toISOString();
      const { data, error } = await sb.from("ofertas_precos").select("item_id, preco, coletado_em").in("item_id", ids).gte("coletado_em", desde).limit(20000);
      falhou("histórico", error);
      for (const r of data ?? []) m.set(r.item_id, [...(m.get(r.item_id) ?? []), { preco: Number(r.preco), em: r.coletado_em }]);
      return m;
    },
    async ultimasPublicacoes(ids) {
      const m = new Map<string, { preco: number; em: string }>(); if (!ids.length) return m;
      const { data, error } = await sb.from("ofertas_publicadas").select("item_id, preco, publicado_em").in("item_id", ids).order("publicado_em", { ascending: false }).limit(2000);
      falhou("publicações", error);
      for (const r of data ?? []) if (!m.has(r.item_id)) m.set(r.item_id, { preco: Number(r.preco), em: r.publicado_em });
      return m;
    },
    async publicadasHoje() {
      // "hoje" no horário de Brasília
      const hojeBR = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
      const { count, error } = await sb.from("ofertas_publicadas").select("id", { count: "exact", head: true }).gte("publicado_em", `${hojeBR}T03:00:00Z`);
      falhou("contagem", error); return count ?? 0;
    },
    async salvarItens(itens) {
      const agora = new Date().toISOString();
      const { error } = await sb.from("ofertas_itens").upsert(itens.map((i) => ({
        id: i.id, titulo: i.titulo, permalink: i.permalink, thumb: i.thumb, busca: i.busca, preco: i.preco, preco_original: i.precoOriginal,
        frete_gratis: i.freteGratis, full_ml: i.full, loja_oficial: i.lojaOficial, visto_em: agora,
      })), { onConflict: "id" });
      falhou("salvar itens", error);
    },
    async salvarPrecos(linhas) { const { error } = await sb.from("ofertas_precos").insert(linhas); falhou("salvar preços", error); },
    async registrarPublicacao(p) { const { error } = await sb.from("ofertas_publicadas").insert(p); falhou("registrar publicação", error); },
    async registrarExecucao(e) { await sb.from("ofertas_execucoes").insert({ resumo: e }); },
    async limparAntigos() {
      await sb.from("ofertas_precos").delete().lt("coletado_em", new Date(Date.now() - 90 * 864e5).toISOString());
      await sb.from("ofertas_execucoes").delete().lt("em", new Date(Date.now() - 30 * 864e5).toISOString());
    },
  };
}
