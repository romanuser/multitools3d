"use client";

import { useState } from "react";
import { descobrirChats, rodarAgora, type ResultadoRodada } from "@/lib/ofertas/actions";

export function PainelOfertas({ conectado }: { conectado: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [res, setRes] = useState<ResultadoRodada | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [chats, setChats] = useState<{ id: string; nome: string }[] | null>(null);
  const rodar = async (publicar: boolean) => {
    if (publicar && !confirm("Publicar as ofertas encontradas agora no canal?")) return;
    setBusy(publicar ? "pub" : "teste"); setErro(null); setRes(null);
    const r = await rodarAgora(publicar); setBusy(null);
    if (r.erro) setErro(r.erro); else setRes(r.ok!);
  };
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        <a href="/api/ofertas/ml/conectar" className="rounded-full bg-amber px-5 py-2 text-sm font-medium text-white">{conectado ? "Reconectar Mercado Livre" : "Conectar Mercado Livre"}</a>
        <button type="button" disabled={!!busy || !conectado} onClick={() => rodar(false)} className="rounded-full border border-line px-5 py-2 text-sm text-ink disabled:opacity-50">{busy === "teste" ? "Buscando…" : "Testar agora (não publica)"}</button>
        <button type="button" disabled={!!busy || !conectado} onClick={() => rodar(true)} className="rounded-full border border-amber px-5 py-2 text-sm text-amber disabled:opacity-50">{busy === "pub" ? "Publicando…" : "Rodar e publicar"}</button>
        <button type="button" disabled={!!busy} onClick={async () => { setBusy("chat"); const r = await descobrirChats(); setBusy(null); if (r.erro) setErro(r.erro); else setChats(r.chats!); }} className="rounded-full border border-line px-5 py-2 text-sm text-ink disabled:opacity-50">Descobrir meu chat do Telegram</button>
      </div>
      {erro && <p className="text-sm text-amber">⚠️ {erro}</p>}
      {chats && (
        <div className="text-sm text-ink-muted">
          {chats.length ? <>Copie o número da sua conversa e cole em <b className="text-ink">TELEGRAM_ADMIN_CHAT</b> na Netlify:
            <ul className="mt-1">{chats.map((c) => <li key={c.id} className="font-mono text-ink">{c.id} — {c.nome}</li>)}</ul></>
            : "Nenhuma conversa encontrada. Abra o seu bot no Telegram, mande /start e clique de novo."}
        </div>
      )}
      {res && (
        <div className="text-sm">
          <p className="text-ink">{res.lidos} anúncios lidos · {res.relevantes} relevantes · <b>{res.ofertas} ofertas</b> · {res.publicadas} publicadas · {(res.ms / 1000).toFixed(1).replace(".", ",")} s</p>
          {res.erros.length > 0 && <p className="text-amber text-xs mt-1">⚠️ {res.erros.join(" · ")}</p>}
          <ul className="mt-2 space-y-1 text-xs text-ink-muted">
            {res.achados.slice(0, 15).map((a) => (
              <li key={a.id}>{a.publicada ? "📣" : "•"} −{a.desconto}% · R$ {a.preco.toFixed(2).replace(".", ",")} · {a.titulo} <span className="text-ink-muted">({a.motivo}{a.motivoNao ? `; ${a.motivoNao}` : ""})</span></li>
            ))}
            {!res.achados.length && <li>Nenhuma oferta de verdade agora{res.relevantes ? " (ou o bot ainda está montando o histórico de preços)" : ""}.</li>}
          </ul>
        </div>
      )}
    </section>
  );
}
