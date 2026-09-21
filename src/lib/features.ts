// ---------------------------------------------------------------------
// Interruptores de ferramentas. Quando uma ferramenta está "false", ela
// aparece como "Em desenvolvimento" no painel e as rotas de API dela
// respondem 503 (assim ninguém consegue chamar o serviço por fora).
// Pra liberar de novo, é só trocar pra true.
// ---------------------------------------------------------------------
export const FEATURES: { photoTo3D: boolean } = {
  photoTo3D: false,
};

export const FEATURE_DISABLED_MESSAGE = "Essa ferramenta está em desenvolvimento.";
