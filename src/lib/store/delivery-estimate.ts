// ---------------------------------------------------------------------
// Transforma o tempo de produção (em minutos, somado no checkout) +
// prazo de frete (em dias, vindo da cotação escolhida) num texto único
// de previsão de entrega. Usado no recibo, no card do pedido (lojista) e
// na página de acompanhamento do cliente.
//
// A conversão de minutos pra dias de produção assume uma jornada de 8h
// de trabalho por dia — é uma estimativa, não promete hora exata.
// ---------------------------------------------------------------------
const WORK_MINUTES_PER_DAY = 8 * 60;

export function estimateDeliveryDays(productionMinutes: number, shippingDays: number | null, isPickup: boolean) {
  const productionDays = productionMinutes > 0 ? Math.ceil(productionMinutes / WORK_MINUTES_PER_DAY) : 0;
  const freightDays = isPickup ? 0 : shippingDays ?? null;

  const totalDays = freightDays != null ? productionDays + freightDays : null;

  return { productionDays, freightDays, totalDays };
}

export function formatDeliveryEstimate(productionMinutes: number, shippingDays: number | null, isPickup: boolean) {
  const { productionDays, freightDays, totalDays } = estimateDeliveryDays(productionMinutes, shippingDays, isPickup);

  if (!productionDays && freightDays == null) return null;

  if (isPickup) {
    return productionDays > 0
      ? `Pronto pra retirada em até ${productionDays} ${productionDays === 1 ? "dia" : "dias"} (produção)`
      : "Pronto pra retirada";
  }

  if (freightDays == null) {
    return productionDays > 0 ? `${productionDays} ${productionDays === 1 ? "dia" : "dias"} de produção` : null;
  }

  if (!productionDays) {
    return `${freightDays} ${freightDays === 1 ? "dia" : "dias"} de frete`;
  }

  return `Até ${totalDays} ${totalDays === 1 ? "dia" : "dias"} no total (${productionDays} de produção + ${freightDays} de frete)`;
}
