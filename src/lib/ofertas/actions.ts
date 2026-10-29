"use server";

import { revalidatePath } from "next/cache";
import { ehAdmin } from "./admin";
import { rodar } from "./rodar";
import { dbSupabase } from "./db";
import { ultimasConversas } from "./telegram";
import { diagnostico, renovar } from "./ml";
import { BUSCAS } from "./config";

export type ResultadoRodada = Awaited<ReturnType<typeof rodar>>;

// Botões do painel: "Testar agora" (não publica) e "Rodar e publicar"
export async function rodarAgora(publicar: boolean, soFilamentos = false): Promise<{ ok?: ResultadoRodada; erro?: string }> {
  if (!(await ehAdmin())) return { erro: "Só o administrador." };
  // poucas buscas por vez (cabe no tempo limite da Netlify); "Testar filamentos" usa só as de filamento com preço-alvo
  // "filamentos" = as buscas por marca (é onde aparecem os mais baratos)
  const ids = soFilamentos ? BUSCAS.filter((b) => b.id.startsWith("m_")).map((b) => b.id) : undefined;
  try { const r = await rodar({ db: dbSupabase(), publicar, ids }); revalidatePath("/admin/ofertas"); revalidatePath("/ofertas"); return { ok: r }; }
  catch (e) { return { erro: e instanceof Error ? e.message : "erro" }; }
}

// Ajuda a achar o número do seu chat no Telegram (pra receber as mensagens do WhatsApp)
export async function descobrirChats(): Promise<{ chats?: { id: string; nome: string }[]; erro?: string }> {
  if (!(await ehAdmin())) return { erro: "Só o administrador." };
  if (!process.env.TELEGRAM_BOT_TOKEN) return { erro: "Falta TELEGRAM_BOT_TOKEN nas variáveis da Netlify." };
  try { return { chats: await ultimasConversas() }; } catch (e) { return { erro: e instanceof Error ? e.message : "erro" }; }
}

// Testa cada recurso da API do Mercado Livre e mostra o que está liberado pro seu app
export async function diagnosticoML(): Promise<{ itens?: { nome: string; ok: boolean; detalhe: string }[]; erro?: string }> {
  if (!(await ehAdmin())) return { erro: "Só o administrador." };
  try {
    const db = dbSupabase(); let tk = await db.token();
    if (!tk) return { erro: "Conecte o Mercado Livre primeiro." };
    if (Date.parse(tk.expira_em) - Date.now() < 10 * 60e3) { tk = await renovar(tk.refresh_token); await db.salvarToken(tk); }
    return { itens: await diagnostico(tk.access_token) };
  } catch (e) { return { erro: e instanceof Error ? e.message : "erro" }; }
}
