"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { runAssistantCommand, type PendingState } from "@/lib/assistant/actions";

type Message = { role: "user" | "assistant"; text: string };

export function AssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: 'Oi! Eu posso cadastrar impressora, adicionar filamento ao estoque, cadastrar um produto, ou te levar pro cadastro. Tenta: "cadastrar impressora Ender 3".',
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingState>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // A loja pública tem o próprio assistente (mexe no carrinho do
  // visitante), então esse aqui não aparece lá pra não duplicar.
  if (pathname?.startsWith("/loja")) return null;

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);

    const result = await runAssistantCommand(text, pending);
    setMessages((m) => [...m, { role: "assistant", text: result.reply }]);
    setPending(result.pending ?? null);
    setBusy(false);

    if (result.refresh) router.refresh();
    if (result.redirectTo) setTimeout(() => router.push(result.redirectTo!), 600);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 max-w-[calc(100vw-2.5rem)] bg-surface border border-line rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Assistente</p>
            <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink text-lg leading-none">
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-96 min-h-[200px]">
            {messages.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
                <span
                  className={`inline-block rounded-2xl px-3 py-2 max-w-[85%] ${
                    m.role === "user" ? "bg-amber text-white" : "bg-paper text-ink"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}
            {busy && <p className="text-xs text-ink-muted">digitando…</p>}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 border-t border-line flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Escreva um comando…"
              className="input flex-1 text-sm"
            />
            <button
              onClick={send}
              disabled={busy}
              className="bg-amber text-white text-sm font-medium rounded-full px-4 disabled:opacity-50"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-amber text-white text-2xl shadow-2xl shadow-black/40 flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="Abrir assistente"
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}
