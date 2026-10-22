// Catálogo do Criador 3D — modelos próprios do Multiferramenta 3D.
export const FONTES = [
  { nome: "Pacifico", arquivo: "Pacifico-Regular.ttf", scad: "Pacifico", tipo: "Cursiva" },
  { nome: "Courgette", arquivo: "Courgette-Regular.ttf", scad: "Courgette", tipo: "Cursiva" },
  { nome: "Lobster", arquivo: "Lobster-Regular.ttf", scad: "Lobster", tipo: "Cursiva" },
  { nome: "Great Vibes", arquivo: "GreatVibes-Regular.ttf", scad: "Great Vibes", tipo: "Cursiva fina" },
  { nome: "Satisfy", arquivo: "Satisfy-Regular.ttf", scad: "Satisfy", tipo: "Cursiva" },
  { nome: "Kaushan Script", arquivo: "KaushanScript-Regular.ttf", scad: "Kaushan Script", tipo: "Pincel" },
  { nome: "Bebas Neue", arquivo: "BebasNeue-Regular.ttf", scad: "Bebas Neue", tipo: "Bastão alta" },
  { nome: "Anton", arquivo: "Anton-Regular.ttf", scad: "Anton", tipo: "Bastão forte" },
  { nome: "Poppins Bold", arquivo: "Poppins-Bold.ttf", scad: "Poppins:style=Bold", tipo: "Moderna" },
  { nome: "Archivo Black", arquivo: "ArchivoBlack-Regular.ttf", scad: "Archivo Black", tipo: "Pesada" },
  { nome: "Righteous", arquivo: "Righteous-Regular.ttf", scad: "Righteous", tipo: "Retrô" },
  { nome: "Luckiest Guy", arquivo: "LuckiestGuy-Regular.ttf", scad: "Luckiest Guy", tipo: "Divertida" },
];

const num = (id, rotulo, padrao, min, max, passo = 0.1, dica = "") => ({ id, rotulo, tipo: "numero", padrao, min, max, passo, dica });
const txt = (id, rotulo, padrao, max = 30, dica = "", opcional = false) => ({ id, rotulo, tipo: "texto", padrao, max, dica, opcional });
const fonte = (padrao) => ({ id: "fonte", rotulo: "Fonte", tipo: "fonte", padrao });
const sim = (id, rotulo, padrao, dica = "") => ({ id, rotulo, tipo: "sim", padrao, dica });

export const MODELOS = [
  {
    id: "letreiro_led", nome: "Letreiro LED", resumo: "Letras ocas pra fita de LED, com tampa difusora.", icone: "💡",
    separadas: true,   // corpo e tampa são impressos separados
    partes: [{ id: "corpo", nome: "Corpo (canal)", cor: "#3a3542" }, { id: "tampa", nome: "Tampa difusora", cor: "#f2f2f2" }],
    campos: [
      txt("texto", "Texto", "Nome", 20), fonte("Courgette"),
      num("tamanho", "Altura das letras (mm)", 60, 20, 200, 1),
      num("profundidade", "Profundidade da parede (mm)", 20, 8, 40, 1),
      num("canal", "Largura extra do canal (mm)", 4, 1, 10, 0.5, "Engrossa o traço da letra pra caber a fita de LED."),
      num("parede", "Espessura da parede (mm)", 1.6, 0.8, 4, 0.2),
      num("fundo", "Espessura do fundo (mm)", 1.2, 0.6, 3, 0.2),
      num("tampa_esp", "Espessura da tampa (mm)", 1.2, 0.6, 3, 0.2),
      num("folga", "Folga da tampa (mm)", 0.3, 0, 1, 0.05, "Aumente se a tampa ficar apertada."),
      sim("unir", "Unir letras numa peça só", true),
    ],
    dicas: ["Imprima a tampa em PLA ou PETG branco (translúcido difunde melhor a luz).", "A fita de LED neon flexível encaixa no canal; faça o furo do fio com broca no fundo."],
  },
  {
    id: "chaveiro", nome: "Chaveiro com nome", resumo: "Base com argola e nome em relevo, 2 cores.", icone: "🔑",
    partes: [{ id: "base", nome: "Base", cor: "#7c3aed" }, { id: "texto", nome: "Nome em relevo", cor: "#ffffff" }],
    campos: [
      txt("texto", "Nome", "Ana", 16), fonte("Pacifico"),
      num("tamanho", "Tamanho do texto (mm)", 14, 8, 30, 0.5),
      num("base_esp", "Espessura da base (mm)", 3, 2, 5, 0.2),
      num("texto_alt", "Altura do relevo (mm)", 1.2, 0.6, 3, 0.2),
      num("margem", "Margem em volta (mm)", 3, 1.5, 6, 0.5),
      num("furo", "Furo da argola (mm)", 4.5, 3, 7, 0.5),
    ],
    dicas: ["Troque a cor no começo da camada do relevo (ou use AMS com o 3MF)."],
  },
  {
    id: "porta_copos", nome: "Porta-copos", resumo: "Redondo, com borda e nome em relevo.", icone: "🥤",
    partes: [{ id: "base", nome: "Base", cor: "#1f2937" }, { id: "texto", nome: "Nome em relevo", cor: "#f59e0b" }],
    campos: [
      txt("texto", "Texto", "Família", 24), fonte("Lobster"),
      num("tamanho", "Tamanho do texto (mm)", 14, 8, 30, 0.5, "Se não couber, o texto encolhe sozinho."),
      num("diametro", "Diâmetro (mm)", 95, 70, 120, 1),
      num("base_esp", "Espessura (mm)", 4, 2, 6, 0.2),
      num("borda", "Largura da borda (mm)", 1.6, 0, 4, 0.2),
      num("borda_alt", "Altura da borda (mm)", 1.2, 0, 3, 0.2),
      num("texto_alt", "Altura do relevo (mm)", 1, 0.6, 2, 0.2),
    ],
    dicas: ["Faça um jogo com nomes diferentes: gere, baixe e troque só o texto."],
  },
  {
    id: "topo_bolo", nome: "Topo de bolo", resumo: "Nome e 2ª linha com hastes, letras em outra cor.", icone: "🎂",
    partes: [{ id: "topo", nome: "Silhueta e hastes", cor: "#ffffff" }, { id: "letras", nome: "Letras", cor: "#d4a017" }],
    campos: [
      txt("texto", "Nome", "Maria", 14), txt("linha2", "Segunda linha", "15 anos", 20, "Deixe vazio pra usar só o nome.", true), fonte("Pacifico"),
      num("tamanho", "Tamanho do nome (mm)", 30, 15, 80, 1),
      num("tamanho2", "Tamanho da 2ª linha (mm)", 14, 8, 40, 1),
      num("espessura", "Espessura (mm)", 3, 2, 5, 0.2),
      num("contorno", "Contorno (mm)", 2.5, 1, 5, 0.5),
      num("haste_comp", "Comprimento das hastes (mm)", 70, 30, 120, 1),
      num("relevo", "Altura das letras (mm)", 1, 0.6, 2, 0.2),
    ],
    dicas: ["Use PLA alimentício ou embrulhe as hastes em plástico filme antes de espetar no bolo."],
  },
  {
    id: "placa_pix", nome: "Placa Pague com Pix", resumo: "Com QR Code Pix de verdade (padrão do Banco Central).", icone: "💳",
    partes: [{ id: "placa", nome: "Placa", cor: "#ffffff" }, { id: "detalhes", nome: "QR e textos", cor: "#111111" }],
    pix: true,
    campos: [
      txt("chave", "Chave Pix", "", 77, "E-mail, telefone (+55…), CPF/CNPJ ou chave aleatória."),
      txt("recebedor", "Nome do recebedor", "Minha Loja", 25), txt("cidade", "Cidade", "São Paulo", 15),
      num("valor", "Valor fixo (opcional, R$)", 0, 0, 100000, 0.01, "Deixe 0 pro cliente digitar o valor."),
      txt("titulo", "Título", "PAGUE COM PIX", 18), fonte("Poppins Bold"),
      num("largura", "Largura (mm)", 100, 70, 200, 1), num("altura", "Altura (mm)", 140, 100, 280, 1),
      num("esp", "Espessura (mm)", 3, 2, 5, 0.2), num("relevo", "Altura do relevo (mm)", 1, 0.6, 2, 0.2),
    ],
    dicas: ["Teste o QR com o app do seu banco antes de imprimir: abra o 3MF e confira a chave.", "Imprima a placa branca e o QR preto (troca de cor na camada, ou AMS)."],
  },
];
