"use client";

import { useState, useRef, useEffect } from "react";
import { sendOrderMessage } from "@/lib/order-messages/actions";

type Message = { id: string; sender_role: "cliente" | "lojista"; sender_name: string; text: string; created_at: string };

export function OrderChat({
  orderId,
  initialMessages,
  role,
}: {
  orderId: string;
  initialMessages: Message[];
  role: "cliente" | "lojista";
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender_role: role,
      sender_name: "Você",
      text: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setText("");
    const result = await sendOrderMessage(orderId, trimmed);
    setSending(false);
    if (result.error) alert(result.error);
  }

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div ref={boxRef} className="max-h-56 overflow-y-auto p-3 space-y-2 bg-paper">
        {messages.length === 0 && (
          <p className="text-xs text-ink-muted">
            Nenhuma mensagem ainda. Use esse espaço pra combinar entrega, prazo ou tirar dúvidas.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`text-sm ${m.sender_role === role ? "text-right" : ""}`}>
            <span
              className={`inline-block rounded-2xl px-3 py-1.5 max-w-[85%] ${
                m.sender_role === role ? "bg-amber text-white" : "bg-surface text-ink"
              }`}
            >
              {m.text}
            </span>
            <p className="text-[10px] text-ink-muted mt-0.5">
              {m.sender_role === role ? "Você" : m.sender_name} ·{" "}
              {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-2 border-t border-line bg-surface">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={role === "lojista" ? "Responder ao cliente…" : "Escreva pra loja…"}
          className="input flex-1 text-sm"
        />
        <button
          onClick={send}
          disabled={sending}
          className="bg-amber text-white text-sm font-medium rounded-full px-4 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
