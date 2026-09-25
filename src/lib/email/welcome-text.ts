// ---------------------------------------------------------------------
// Mesmo texto do e-mail de boas-vindas, em versão simples (sem HTML),
// pra usar no link "mailto"/Gmail. Sem "server-only": este arquivo roda
// no navegador do admin.
// ---------------------------------------------------------------------

export function welcomeSubject(isPromo: boolean) {
  return isPromo
    ? "Bem-vindo(a) à Multiferramenta 3D — você ganhou o VIP vitalício"
    : "Bem-vindo(a) à Multiferramenta 3D — seu guia está aqui";
}

export function welcomeBody(siteUrl: string, isPromo: boolean) {
  const guiaUrl = `${siteUrl}/guia-multiferramenta-3d.pdf`;

  const intro = isPromo
    ? `Obrigado por ser um dos nossos 100 primeiros usuários a se cadastrar na Multiferramenta 3D. Como brinde pelo feito, subimos seu plano para o VIP vitalício, que te dá direito, além de todas as ferramentas do plano Free, a um e-commerce próprio pra vender suas impressões online.\n\nPreparamos um guia de como explorar melhor as ferramentas: ${guiaUrl}`
    : `Sua conta na Multiferramenta 3D foi criada com sucesso. Preparamos um guia de como explorar melhor as ferramentas: ${guiaUrl}`;

  return [
    "Olá!",
    "",
    intro,
    "",
    "Desejamos boas-vindas, com melhores organizações, e que a ferramenta auxilie o seu dia a dia.",
    "",
    `Multiferramenta3D — ${siteUrl}`,
    "WebdevStudio — https://webdev-studio-chi.vercel.app/",
  ].join("\n");
}

// Monta o link que abre o Gmail (na aba/janela onde o admin já está
// logado) com o compose preenchido: assunto, corpo e destinatários em
// cópia oculta (Bcc), pra um cliente não ver o e-mail do outro.
export function buildGmailComposeUrl(recipientEmails: string[], isPromo: boolean, siteUrl: string) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    tf: "1",
    su: welcomeSubject(isPromo),
    body: welcomeBody(siteUrl, isPromo),
    bcc: recipientEmails.join(","),
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
