"use client";

import { useMemo, useState } from "react";
import { createQuoteRecord } from "@/lib/quotes/actions";
import type { QuotePattern } from "@/lib/quotes/types";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function QuoteCalculator({
  company,
  patterns,
}: {
  company: { name: string | null; logoUrl: string | null };
  patterns: QuotePattern[];
}) {
  const [selectedPatternId, setSelectedPatternId] = useState("");
  const [showPatternInfo, setShowPatternInfo] = useState(false);

  const [material, setMaterial] = useState("PLA");
  const [filamentPrice, setFilamentPrice] = useState(99);
  const [grams, setGrams] = useState(100);
  const [watts, setWatts] = useState(200);
  const [hours, setHours] = useState(5);
  const [kwhPrice, setKwhPrice] = useState(0.8);
  const [labor, setLabor] = useState(15);
  const [fixedCosts, setFixedCosts] = useState(0);
  const [margin, setMargin] = useState(30);

  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [description, setDescription] = useState("Peça personalizada em impressão 3D");
  const [quantity, setQuantity] = useState(1);
  const [validityDays, setValidityDays] = useState(7);
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "error" | "success"; message?: string }>({
    kind: "idle",
  });

  const selectedPattern = useMemo(
    () => patterns.find((p) => p.id === selectedPatternId) || null,
    [patterns, selectedPatternId]
  );

  const result = useMemo(() => {
    const filament = (Math.max(0, filamentPrice) * Math.max(0, grams)) / 1000;
    const energy = (Math.max(0, watts) / 1000) * Math.max(0, hours) * Math.max(0, kwhPrice);
    const production = filament + energy + Math.max(0, labor) + Math.max(0, fixedCosts);
    const profit = (production * Math.max(0, margin)) / 100;
    return { filament, energy, production, profit, suggested: production + profit };
  }, [filamentPrice, grams, watts, hours, kwhPrice, labor, fixedCosts, margin]);

  const total = result.suggested * Math.max(1, quantity);

  function choosePattern(id: string) {
    setSelectedPatternId(id);
    setShowPatternInfo(Boolean(id));
  }

  async function generatePdf() {
    if (!clientName.trim()) {
      setStatus({ kind: "error", message: "Informe o nome do cliente pra gerar o orçamento." });
      return;
    }
    setStatus({ kind: "loading", message: "Gerando PDF…" });

    const { data, error } = await createQuoteRecord({
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      description,
      quantity: Math.max(1, quantity),
      validityDays: Math.max(1, validityDays),
      notes,
      filamentCost: result.filament,
      energyCost: result.energy,
      laborCost: labor,
      fixedCost: fixedCosts,
      marginPercent: margin,
      unitPrice: result.suggested,
      total,
    });

    if (error || !data) {
      setStatus({ kind: "error", message: error || "Não consegui salvar o orçamento." });
      return;
    }

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    if (company.logoUrl) {
      try {
        const response = await fetch(company.logoUrl);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(blob);
        });
        doc.addImage(dataUrl, "PNG", 15, 12, 22, 22);
      } catch {
        // sem logo, segue sem imagem
      }
    }

    const companyName = company.name || "";
    doc.setTextColor(35, 38, 43);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(companyName, company.logoUrl ? 42 : 15, 20);

    doc.setTextColor(25, 40, 65);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("ORÇAMENTO", 195, 19, { align: "right" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 105, 125);
    doc.text(data.quote_number, 195, 26, { align: "right" });
    doc.text(new Date().toLocaleDateString("pt-BR"), 195, 31, { align: "right" });

    doc.setDrawColor(226, 134, 31);
    doc.setLineWidth(1);
    doc.line(15, 39, 195, 39);

    doc.setTextColor(20, 30, 45);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente", 15, 49);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const clientLines = [clientName, clientCompany, clientEmail, clientPhone].filter(Boolean);
    clientLines.forEach((line, index) => doc.text(line, 15, 57 + index * 6));

    let y = 57 + Math.max(1, clientLines.length) * 6 + 8;
    doc.setFillColor(247, 244, 238);
    doc.roundedRect(15, y, 180, 11, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Descrição", 19, y + 7);
    doc.text("Qtd.", 137, y + 7);
    doc.text("Valor unit.", 153, y + 7);
    doc.text("Total", 190, y + 7, { align: "right" });
    y += 18;

    doc.setFont("helvetica", "normal");
    const descriptionLines = doc.splitTextToSize(description, 105);
    doc.text(descriptionLines, 19, y);
    doc.text(String(quantity), 140, y);
    doc.text(money(result.suggested), 153, y);
    doc.text(money(total), 190, y, { align: "right" });
    y += Math.max(12, descriptionLines.length * 6 + 7);

    doc.setDrawColor(230, 224, 212);
    doc.line(15, y, 195, y);
    y += 13;

    doc.setFillColor(226, 134, 31);
    doc.roundedRect(112, y - 7, 83, 18, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL DO ORÇAMENTO", 117, y + 1);
    doc.setFontSize(14);
    doc.text(money(total), 190, y + 2, { align: "right" });
    y += 23;

    doc.setTextColor(20, 30, 45);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Validade: ${validityDays} dias`, 15, y);
    if (notes.trim()) {
      y += 8;
      doc.text("Observações", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(notes, 175), 15, y + 7);
    }

    if (companyName) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(116, 108, 94);
      doc.text(companyName, 105, 287, { align: "center" });
    }

    doc.save(`${data.quote_number}.pdf`);
    setStatus({ kind: "success", message: "Orçamento gerado e salvo no histórico." });
  }

  function reset() {
    setMaterial("PLA");
    setFilamentPrice(99);
    setGrams(100);
    setWatts(200);
    setHours(5);
    setKwhPrice(0.8);
    setLabor(15);
    setFixedCosts(0);
    setMargin(30);
    setStatus({ kind: "idle" });
  }

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
      <div className="space-y-8">
        <Section title="Referência de peça" icon="⌁">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex-1 min-w-[200px]">
              <span className="block text-sm text-ink-muted mb-1">Padrão cadastrado</span>
              <select
                value={selectedPatternId}
                onChange={(e) => choosePattern(e.target.value)}
                className="w-full rounded-lg bg-surface border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amber/40"
              >
                <option value="">Nenhum — preencher na mão</option>
                {patterns.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedPattern && (
              <button
                type="button"
                onClick={() => setShowPatternInfo((v) => !v)}
                className="text-sm text-amber border border-amber/40 rounded-full px-4 py-2 hover:bg-amber-soft transition-colors"
              >
                {showPatternInfo ? "Ocultar" : "Ver ficha"}
              </button>
            )}
          </div>

          {selectedPattern && showPatternInfo && (
            <div className="mt-4 border border-line rounded-xl p-4 bg-paper/60">
              <p className="font-display text-base text-ink mb-3">{selectedPattern.name}</p>
              <div className="grid grid-cols-3 gap-3 font-spec text-xs text-ink-muted mb-3">
                <Spec label="Tamanho" value={selectedPattern.dimensions} />
                <Spec label="Peso" value={selectedPattern.weight} />
                <Spec label="Tempo" value={selectedPattern.production_time} />
              </div>
              {selectedPattern.accessories?.length > 0 && (
                <div className="space-y-1 text-sm">
                  <p className="text-ink-muted mb-1">Custos auxiliares</p>
                  {selectedPattern.accessories.map((item) => (
                    <div key={item.id} className="flex justify-between text-ink">
                      <span>{item.name}</span>
                      <span className="font-spec tabular-nums">{money(item.unitPrice)} / un.</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedPattern.notes && (
                <p className="text-sm text-ink-muted mt-3">{selectedPattern.notes}</p>
              )}
            </div>
          )}
        </Section>

        <Section title="Filamento" icon="◉">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Material de referência">
              <input
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="input"
              />
            </Field>
            <NumberField label="Preço do filamento" suffix="R$/kg" step="0.01" value={filamentPrice} setValue={setFilamentPrice} />
            <NumberField label="Quantidade utilizada" suffix="g" value={grams} setValue={setGrams} />
          </div>
        </Section>

        <Section title="Energia e tempo" icon="ϟ">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <NumberField label="Consumo da impressora" suffix="W" value={watts} setValue={setWatts} />
              <Presets>
                <PresetButton onClick={() => setWatts(120)}>Ender 3 · 120W</PresetButton>
                <PresetButton onClick={() => setWatts(200)}>Bambu A1 · 200W</PresetButton>
                <PresetButton onClick={() => setWatts(350)}>Bambu X1C · 350W</PresetButton>
              </Presets>
            </div>
            <NumberField label="Tempo de impressão" suffix="horas" step="0.1" value={hours} setValue={setHours} />
            <div>
              <NumberField label="Valor do kWh" suffix="R$" step="0.01" value={kwhPrice} setValue={setKwhPrice} />
              <Presets>
                <PresetButton onClick={() => setKwhPrice(0.8)}>Tarifa padrão</PresetButton>
                <PresetButton onClick={() => setKwhPrice(0.95)}>Tarifa alta</PresetButton>
              </Presets>
            </div>
          </div>
        </Section>

        <Section title="Custos e lucro" icon="≡">
          <div className="grid sm:grid-cols-3 gap-4">
            <NumberField label="Mão de obra por peça" suffix="R$" step="0.01" value={labor} setValue={setLabor} />
            <NumberField label="Custos fixos por peça" suffix="R$" step="0.01" value={fixedCosts} setValue={setFixedCosts} />
            <div>
              <NumberField label="Margem de lucro" suffix="%" value={margin} setValue={setMargin} />
              <Presets>
                {[30, 50, 80, 100].map((v) => (
                  <PresetButton key={v} active={margin === v} onClick={() => setMargin(v)}>
                    {v}%
                  </PresetButton>
                ))}
              </Presets>
            </div>
          </div>
        </Section>

        <Section title="Dados do orçamento" icon="✎">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <Field label="Nome do cliente">
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="input" />
            </Field>
            <Field label="Empresa (opcional)">
              <input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} className="input" />
            </Field>
            <Field label="E-mail (opcional)">
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="input" />
            </Field>
            <Field label="WhatsApp (opcional)">
              <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="input" />
            </Field>
            <Field label="Quantidade">
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="input" />
            </Field>
            <Field label="Validade (dias)">
              <input type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} className="input" />
            </Field>
          </div>
          <Field label="Descrição do item">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input" />
          </Field>
          <div className="mt-4">
            <Field label="Observações (opcional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Prazo, condições de pagamento, acabamento…"
                className="input"
              />
            </Field>
          </div>
        </Section>

        <button type="button" onClick={reset} className="text-sm text-ink-muted hover:text-ink underline underline-offset-2">
          Limpar e restaurar valores
        </button>
      </div>

      <aside className="md:sticky md:top-8 border border-line bg-surface rounded-2xl p-6">
        <p className="text-xs text-ink-muted mb-4">Resumo interno — não aparece no PDF</p>
        <dl className="space-y-2 text-sm mb-4">
          <Row label="Filamento" value={money(result.filament)} />
          <Row label="Energia" value={money(result.energy)} />
          <Row label="Mão de obra + fixos" value={money(labor + fixedCosts)} />
          <Row label="Custo de produção" value={money(result.production)} />
          <Row label="Lucro estimado" value={money(result.profit)} good />
        </dl>
        <div className="border-t border-line pt-4 mb-1">
          <p className="text-xs text-ink-muted mb-1">Preço sugerido (unidade)</p>
          <p className="font-display text-xl text-ink">{money(result.suggested)}</p>
        </div>
        <div className="border-t border-dashed border-line mt-4 pt-4 mb-5">
          <p className="text-xs text-ink-muted mb-1">Total do orçamento ({Math.max(1, quantity)}x)</p>
          <p className="font-display text-3xl text-amber tabular-nums">{money(total)}</p>
        </div>

        <button
          type="button"
          onClick={generatePdf}
          disabled={status.kind === "loading"}
          className="w-full bg-amber text-white font-medium rounded-full py-3 text-sm disabled:opacity-50"
        >
          {status.kind === "loading" ? "Gerando…" : "Gerar orçamento em PDF"}
        </button>

        {status.message && (
          <p className={`text-sm mt-3 ${status.kind === "error" ? "text-danger" : "text-good"}`}>
            {status.message}
          </p>
        )}
      </aside>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-display text-lg text-ink mb-4 flex items-center gap-2">
        <span className="text-amber">{icon}</span> {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  setValue,
  suffix,
  step = "1",
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  suffix: string;
  step?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center rounded-lg bg-surface border border-line focus-within:ring-2 focus-within:ring-amber/40 overflow-hidden">
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full px-3 py-2.5 text-sm text-ink bg-transparent focus:outline-none font-spec tabular-nums"
        />
        <span className="text-xs text-ink-muted pr-3 whitespace-nowrap">{suffix}</span>
      </div>
    </Field>
  );
}

function Presets({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5 mt-2">{children}</div>;
}

function PresetButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs rounded-full px-3 py-1 border transition-colors ${
        active
          ? "border-amber bg-amber-soft text-ink"
          : "border-line text-ink-muted hover:border-amber hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`font-spec tabular-nums ${good ? "text-good" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-ink-muted">{label}</p>
      <p className="text-ink">{value || "—"}</p>
    </div>
  );
}
