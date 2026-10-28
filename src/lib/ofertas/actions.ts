"use server";

import { revalidatePath } from "next/cache";
import { ehAdmin } from "./admin";
import { rodar } from "./rodar";
import { dbSupabase } from "./db";
import { ultimasConversas } from "./telegram";

export type ResultadoRodada = Awaited<ReturnType<typeof rodar>>;

// Botões do painel: "Testar agora" (não publica) e "Rodar e publicar"
export async function rodarAgora(publicar: boolean): Promise<{ ok?: ResultadoRodada; erro?: string }> {
  if (!(await ehAdmin())) return { erro: "Só o administrador." };
  try { const r = await rodar({ db: dbSupabase(), publicar, todas: true }); revalidatePath("/admin/ofertas"); revalidatePath("/ofertas"); return { ok: r }; }
  catch (e) { return { erro: e instanceof Error ? e.message : "erro" }; }
}

// Ajuda a achar o número do seu chat no Telegram (pra receber as mensagens do WhatsApp)
export async function descobrirChats(): Promise<{ chats?: { id: string; nome: string }[]; erro?: string }> {
  if (!(await ehAdmin())) return { erro: "Só o administrador." };
  if (!process.env.TELEGRAM_BOT_TOKEN) return { erro: "Falta TELEGRAM_BOT_TOKEN nas variáveis da Netlify." };
  try { return { chats: await ultimasConversas() }; } catch (e) { return { erro: e instanceof Error ? e.message : "erro" }; }
}
