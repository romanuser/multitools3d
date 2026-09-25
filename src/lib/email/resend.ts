import "server-only";
import { Resend } from "resend";

// ---------------------------------------------------------------------
// Cliente do Resend, criado uma única vez por processo. RESEND_API_KEY
// vem do painel resend.com/api-keys. Sem ela, qualquer tentativa de
// enviar e-mail retorna um erro claro em vez de quebrar a build.
// ---------------------------------------------------------------------
let client: Resend | null = null;

export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY não configurada. Crie uma conta em resend.com, gere uma chave em " +
        "resend.com/api-keys e adicione RESEND_API_KEY nas variáveis de ambiente."
    );
  }
  if (!client) client = new Resend(apiKey);
  return client;
}

// E-mail que aparece como remetente. onboarding@resend.dev funciona sem
// nenhuma configuração, mas só entrega pro próprio e-mail da conta Resend
// — pra mandar pra qualquer cliente cadastrado, é preciso verificar um
// domínio próprio em resend.com/domains e trocar essa variável.
export function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || "Multiferramenta 3D <onboarding@resend.dev>";
}
