const FLOW: { status: string; label: string; icon: string }[] = [
  { status: "AGUARDANDO_PAGAMENTO", label: "Aguardando pagamento", icon: "◆" },
  { status: "PAGAMENTO_CONFIRMADO", label: "Pagamento confirmado", icon: "$" },
  { status: "EM_PRODUCAO", label: "Em produção", icon: "⚙" },
  { status: "ENVIADO", label: "Enviado", icon: "➜" },
  { status: "ENTREGUE", label: "Entregue", icon: "⌂" },
];

export function OrderTimeline({ status }: { status: string }) {
  if (status === "CANCELADO") {
    return (
      <div className="text-sm text-danger border border-danger/30 bg-danger/10 rounded-xl px-4 py-3">
        Pedido cancelado
      </div>
    );
  }

  const activeIndex = Math.max(0, FLOW.findIndex((step) => step.status === status));

  return (
    <div className="flex items-start gap-1">
      {FLOW.map((step, index) => {
        const state = index < activeIndex ? "done" : index === activeIndex ? "current" : "pending";
        return (
          <div key={step.status} className="flex-1 flex flex-col items-center text-center">
            <div className="flex items-center w-full">
              <div className={`flex-1 h-px ${index === 0 ? "opacity-0" : state === "pending" ? "bg-line" : "bg-amber"}`} />
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  state === "pending"
                    ? "bg-paper border border-line text-ink-muted"
                    : state === "current"
                      ? "bg-amber text-white"
                      : "bg-good text-white"
                }`}
              >
                {state === "done" ? "✓" : step.icon}
              </div>
              <div
                className={`flex-1 h-px ${index === FLOW.length - 1 ? "opacity-0" : state === "done" ? "bg-amber" : "bg-line"}`}
              />
            </div>
            <p className={`text-[10px] mt-1.5 leading-tight ${state === "pending" ? "text-ink-muted" : "text-ink"}`}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
