"use client";

import { useState } from "react";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------------------------------------------------------------------
// Botões pra mandar o comprovante pro cliente. O link do WhatsApp
// (wa.me) só consegue levar TEXTO — então a mensagem vai com o link da
// página pública do recibo, onde o cliente vê, imprime ou salva em PDF.
// No celular, "Compartilhar" abre a folha de compartilhar do sistema.
// ---------------------------------------------------------------------
export function SaleShareBar({
  customerName,
  customerPhone,
  storeName,
  number,
  total,
  publicUrl,
  paymentLinkUrl,
  balanceDue,
}: {
  customerName: string;
  customerPhone: string | null;
  storeName: string;
  number: string;
  total: number;
  publicUrl: string;
  paymentLinkUrl?: string | null;
  balanceDue?: number;
}) {
  const [copied, setCopied] = useState(false);
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;
  let message =
    `Olá, ${firstName}! Obrigado pela compra na ${storeName}. ` +
    `Segue o comprovante da venda ${number} (total ${money(total)}): ${publicUrl}`;
  if (balanceDue && balanceDue > 0) {
    message += paymentLinkUrl
      ? `\n\nSaldo a pagar: ${money(balanceDue)}. Pra pagar por Pix ou cartão: ${paymentLinkUrl}`
      : `\n\nSaldo a pagar: ${money(balanceDue)}.`;
  }

  const digits = (customerPhone || "").replace(/\D/g, "");
  const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copie o link do comprovante:", publicUrl);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Comprovante ${number}`, text: message, url: publicUrl });
      } catch {
        // pessoa cancelou o compartilhamento — tudo bem
      }
    } else {
      copyLink();
    }
  }

  return (
    <div className="border border-line bg-surface rounded-2xl p-4 mb-6 print:hidden">
      <p className="text-sm text-ink mb-3">Enviar comprovante pro cliente</p>
      <div className="flex flex-wrap gap-2">
        {phone ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] text-[#0b2e17] font-medium px-4 py-2 text-sm hover:brightness-95"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z" />
            </svg>
            Enviar no WhatsApp
          </a>
        ) : (
          <span className="text-xs text-ink-muted">Venda sem WhatsApp do cliente.</span>
        )}
        <button
          type="button"
          onClick={share}
          className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-surface-raised transition-colors"
        >
          Compartilhar
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-surface-raised transition-colors"
        >
          {copied ? "Link copiado ✓" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}
