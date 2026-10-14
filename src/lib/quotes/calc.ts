// ---------------------------------------------------------------------
// O cálculo de preço da calculadora de orçamento, num lugar só — usado
// pelo Orçamento e pela Venda direta, pra os dois darem sempre o mesmo
// resultado.
//
//   filamento + energia + mão de obra + custos fixos = custo de produção
//   custo de produção × margem                       = lucro
//   custo de produção + lucro                        = preço sugerido
// ---------------------------------------------------------------------
export type PriceParams = {
  watts: number;
  kwhPrice: number;
  labor: number;
  fixedCosts: number;
  marginPercent: number;
};

export const DEFAULT_PRICE_PARAMS: PriceParams = {
  watts: 200,
  kwhPrice: 0.8,
  labor: 15,
  fixedCosts: 0,
  marginPercent: 30,
};

export type PriceResult = {
  filament: number;
  energy: number;
  production: number;
  profit: number;
  suggested: number;
};

export function calcPrice(filamentCost: number, hours: number, params: PriceParams): PriceResult {
  const filament = Math.max(0, filamentCost);
  const energy = (Math.max(0, params.watts) / 1000) * Math.max(0, hours) * Math.max(0, params.kwhPrice);
  const production = filament + energy + Math.max(0, params.labor) + Math.max(0, params.fixedCosts);
  const profit = (production * Math.max(0, params.marginPercent)) / 100;
  return { filament, energy, production, profit, suggested: production + profit };
}

// Parâmetros salvos na conta (accounts.pricing_params). Campo ausente ou
// inválido cai no padrão — assim conta antiga continua funcionando.
export function readPricingParams(raw: unknown): PriceParams {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = (key: keyof PriceParams) => {
    const n = Number(src[key]);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_PRICE_PARAMS[key];
  };
  return {
    watts: pick("watts"),
    kwhPrice: pick("kwhPrice"),
    labor: pick("labor"),
    fixedCosts: pick("fixedCosts"),
    marginPercent: pick("marginPercent"),
  };
}
