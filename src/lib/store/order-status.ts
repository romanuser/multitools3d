export const ORDER_STATUSES = [
  "AGUARDANDO_PAGAMENTO",
  "PAGAMENTO_CONFIRMADO",
  "EM_PRODUCAO",
  "ENVIADO",
  "ENTREGUE",
  "CANCELADO",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
