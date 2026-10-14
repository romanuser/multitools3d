"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminReply, closeTicketByUser, sendUserMessage } from "@/lib/support/actions";
import type { SupportMessage } from "@/lib/support/types";

const time = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// ---------------------------------------------------------------------
// Conversa do chamado. Mesmo componente pros dois lados:
//   viewer="user"  -> o cliente (mensagens dele à direita)
//   viewer="admin" -> você (suas respostas à direita, + escolha de etapa)
// Atualiza sozinho a cada 15 s enquanto a página está aberta.
// ---------------------------------------------------------------------
export function TicketChat({
  ticketId,
  status,
  messages,
  viewer,
  customerName,
}: {
  ticketId: string;
  status: string;
  messages: SupportMessage[];
  viewer: "user" | "admin";
  customerName?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const closed = status === "fechado";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [router]);

  async function send() {
    if (pending) return;
    if (!text.trim() && !(viewer === "admin" && nextStatus)) return;
    setPending(true);
    setError(null);
    const result =
      viewer === "admin" ? await adminReply(ticketId, text, nextStatus || undefined) : await sendUserMessage(ticketId, text);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setText("");
    setNextStatus("");
    router.refresh();
  }

  async function closeTicket() {
    setPending(true);
    const result = await closeTicketByUser(ticketId);
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  const mine = (role: string) => role === viewer;

  return (
    <div className="border border-line bg-surface rounded-2xl overflow-hidden">
      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3" aria-live="polite">
        {messages.map((m) =>
          m.author_role === "system" ? (
            <p key={m.id} className="text-center text-[11px] text-ink-muted">
              <span className="inline-block border border-line rounded-full px-3 py-1 bg-paper/60">
                {m.body} · {time(m.created_at)}
              </span>
            </p>
          ) : (
            <div key={m.id} className={`flex ${mine(m.author_role) ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  mine(m.author_role)
                    ? "bg-amber text-on-accent rounded-br-md"
                    : "bg-surface-raised text-ink border border-line rounded-bl-md"
                }`}
              >
                <p className={`text-[11px] mb-0.5 ${mine(m.author_role) ? "text-on-accent/80" : "text-ink-muted"}`}>
                  {m.author_role === "admin" ? "Suporte Multiferramenta 3D" : viewer === "admin" ? customerName || "Cliente" : "Você"} ·{" "}
                  {time(m.created_at)}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      {viewer === "user" && status === "resolvido" && (
        <div className="border-t border-line bg-good/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink">O suporte marcou como resolvido. Deu tudo certo?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeTicket}
              disabled={pending}
              className="text-xs bg-good text-black font-medium rounded-full px-3 py-1.5 disabled:opacity-50"
            >
              Sim, encerrar chamado
            </button>
          </div>
        </div>
      )}

      {closed ? (
        <p className="border-t border-line px-4 py-3 text-sm text-ink-muted">
          {viewer === "user"
            ? "Chamado encerrado. Se precisar de mais alguma coisa, é só abrir um novo."
            : "Chamado encerrado pelo cliente ou por você. Para reabrir, escolha uma etapa abaixo."}
        </p>
      ) : null}

      {(!closed || viewer === "admin") && (
        <div className="border-t border-line p-3 space-y-2">
          {!closed && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
              }}
              rows={3}
              maxLength={5000}
              placeholder={
                viewer === "admin"
                  ? "Escreva sua resposta…"
                  : status === "resolvido"
                    ? "Ainda com problema? Responda aqui que o chamado volta pra análise…"
                    : "Escreva sua mensagem…"
              }
              className="input resize-y"
              aria-label="Mensagem"
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {viewer === "admin" ? (
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                {closed ? "Reabrir como" : "E mudar etapa para"}
                <span className="w-44">
                <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="input py-1 text-xs">
                  <option value="">{closed ? "—" : "automático"}</option>
                  <option value="em_analise">Em análise</option>
                  <option value="aguardando_cliente">Aguardando cliente</option>
                  <option value="resolvido">Resolvido</option>
                  {!closed && <option value="fechado">Encerrado</option>}
                </select>
                </span>
              </label>
            ) : (
              <span className="text-[11px] text-ink-muted">Ctrl + Enter envia</span>
            )}
            <div className="flex items-center gap-3">
              {viewer === "user" && !closed && status !== "resolvido" && (
                <button
                  type="button"
                  onClick={closeTicket}
                  disabled={pending}
                  className="text-xs text-ink-muted hover:text-ink underline underline-offset-2"
                >
                  Já resolvi, encerrar
                </button>
              )}
              <button
                type="button"
                onClick={send}
                disabled={pending || (!text.trim() && !(viewer === "admin" && nextStatus))}
                className="bg-amber text-on-accent text-sm font-medium rounded-full px-5 py-2 disabled:opacity-50"
              >
                {pending ? "Enviando…" : viewer === "admin" && !text.trim() && nextStatus ? "Mudar etapa" : "Enviar"}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
