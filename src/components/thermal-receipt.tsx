"use client";

const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Line = { label: string; qty?: number; value?: number };

// ---------------------------------------------------------------------
// Recibo no estilo "cupom não fiscal" — visual de impressora térmica
// (estreito, monoespaçado, sem frescura). Usado em qualquer "dar baixa"
// do financeiro (consignado, contas a pagar/receber), e como alternativa
// ao recibo bonito nos Comprovantes da loja.
// ---------------------------------------------------------------------
export function ThermalReceipt({
  storeName,
  title,
  reference,
  date,
  lines,
  total,
  footerNote,
}: {
  storeName: string;
  title: string;
  reference?: string | null;
  date: string;
  lines: Line[];
  total: number;
  footerNote?: string;
}) {
  return (
    <div className="flex justify-center">
      <div
        className="w-full max-w-[320px] bg-white text-black px-4 py-5 font-mono text-[13px] leading-relaxed shadow-lg"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        <p className="text-center font-bold uppercase tracking-wide">{storeName}</p>
        <p className="text-center text-[11px] mb-2">documento sem valor fiscal</p>
        <div className="border-t border-dashed border-black my-2" />

        <p className="font-bold">{title}</p>
        {reference && <p className="text-[11px]">{reference}</p>}
        <p className="text-[11px] mb-2">{date}</p>

        <div className="border-t border-dashed border-black my-2" />

        {lines.map((line, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className="truncate">
              {line.qty != null ? `${line.qty}x ` : ""}
              {line.label}
            </span>
            {line.value != null && <span className="shrink-0">{money(line.value)}</span>}
          </div>
        ))}

        <div className="border-t border-dashed border-black my-2" />

        <div className="flex justify-between font-bold text-[15px]">
          <span>TOTAL</span>
          <span>{money(total)}</span>
        </div>

        <div className="border-t border-dashed border-black my-2" />

        <p className="text-center text-[11px] mt-2">{footerNote || "Comprovante interno — guarde para seu controle"}</p>
        <p className="text-center text-[10px] mt-3 tracking-widest">* * *</p>
      </div>
    </div>
  );
}
