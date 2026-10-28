// Telegram — Bot API oficial (gratuita, sem risco de bloqueio).
const api = (metodo: string) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${metodo}`;
export const telegramConfigurado = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CANAL);

async function chamar(metodo: string, corpo: Record<string, unknown>) {
  const r = await fetch(api(metodo), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram (${metodo}): ${j.description || r.status}`);
  return j.result;
}

// Post no canal: foto + legenda + botão "Ver oferta". Se a foto falhar, manda só o texto.
export async function postarOferta(legenda: string, link: string, foto: string | null) {
  const botao = { inline_keyboard: [[{ text: "🛒 Ver oferta", url: link }]] };
  const chat_id = process.env.TELEGRAM_CANAL;
  if (foto) {
    try { return await chamar("sendPhoto", { chat_id, photo: foto, caption: legenda, parse_mode: "HTML", reply_markup: botao }); }
    catch { /* cai pro texto */ }
  }
  return chamar("sendMessage", { chat_id, text: legenda, parse_mode: "HTML", reply_markup: botao, link_preview_options: { is_disabled: true } });
}

// Mensagem só pra você (o "semiautomático" do WhatsApp): texto pronto + botão que abre o WhatsApp já preenchido.
export async function avisarAdmin(texto: string, textoWhatsApp?: string) {
  const chat_id = process.env.TELEGRAM_ADMIN_CHAT; if (!chat_id) return;
  const teclado = textoWhatsApp ? { inline_keyboard: [[{ text: "📲 Enviar no WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}` }]] } : undefined;
  return chamar("sendMessage", { chat_id, text: texto, reply_markup: teclado, link_preview_options: { is_disabled: true } });
}

// Ajuda a descobrir o seu chat id: últimas conversas que falaram com o bot.
export async function ultimasConversas() {
  const r = await chamar("getUpdates", { limit: 20 });
  const vistos = new Map<string, string>();
  for (const u of r as { message?: { chat: { id: number; first_name?: string; title?: string; username?: string } } }[]) {
    const c = u.message?.chat; if (c) vistos.set(String(c.id), c.title || c.first_name || c.username || "?");
  }
  return [...vistos].map(([id, nome]) => ({ id, nome }));
}
