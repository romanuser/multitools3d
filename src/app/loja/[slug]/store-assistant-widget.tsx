"use client";

import { useState, useRef, useEffect } from "react";
import { changeCustomerPassword } from "@/lib/customer-auth/actions";

type Product = { id: string; name: string; price: number };
type Message = { role: "user" | "assistant"; text: string };

function normalize(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function StoreAssistantWidget({
  products,
  customerEmail,
  onAddToCart,
}: {
  products: Product[];
  customerEmail: string | null;
  onAddToCart: (productId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: 'Oi! Me diz o que você quer comprar (ex: "quero o chaveiro de halteres") que eu já coloco no carrinho, ou peça pra trocar sua senha.',
    },
  ]);
  const [input, setInput] = useState("");
  const [awaitingPassword, setAwaitingPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function reply(text: string) {
    setMessages((m) => [...m, { role: "assistant", text }]);
  }

  function rankProducts(text: string) {
    const tokens = normalize(text)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    if (!tokens.length) return [];
    return products
      .map((p) => {
        const name = normalize(p.name);
        const score = tokens.reduce((sum, t) => sum + (name.includes(t) ? 1 : 0), 0);
        return { product: p, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);

    if (awaitingPassword) {
      setAwaitingPassword(false);
      const result = await changeCustomerPassword(text);
      reply(result.error ? `Não consegui: ${result.error}` : "Prontinho! Sua senha foi alterada.");
      setBusy(false);
      return;
    }

    const normalized = normalize(text);

    if (/troca\w*|altera\w*|muda\w*/.test(normalized) && /senha/.test(normalized)) {
      if (!customerEmail) {
        reply("Você precisa estar logado pra trocar a senha. Entra na sua conta primeiro.");
      } else {
        reply("Beleza, qual vai ser a nova senha? (pelo menos 6 caracteres)");
        setAwaitingPassword(true);
      }
      setBusy(false);
      return;
    }

    if (/compr\w*|quero|adicion\w*|carrinho/.test(normalized)) {
      const ranked = rankProducts(text);
      if (ranked.length === 0) {
        reply("Não achei esse produto na loja. Pode tentar com outro nome?");
      } else {
        const top = ranked[0];
        onAddToCart(top.product.id);
        reply(`Prontinho! Adicionei "${top.product.name}" (${money(top.product.price)}) ao carrinho.`);
      }
      setBusy(false);
      return;
    }

    const ranked = rankProducts(text);
    if (ranked.length > 0) {
      const top = ranked[0];
      reply(`Achei "${top.product.name}" por ${money(top.product.price)}. Quer que eu adicione ao carrinho?`);
    } else {
      reply('Não entendi 🙈 Tenta "quero comprar [nome do produto]" ou "trocar minha senha".');
    }
    setBusy(false);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 max-w-[calc(100vw-2.5rem)] bg-surface border border-line rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Assistente da loja</p>
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
              type={awaitingPassword ? "password" : "text"}
              placeholder={awaitingPassword ? "Nova senha…" : "Escreva aqui…"}
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
