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
const imagem = (modo, rotulo, dica = "") => ({ id: "imagem", rotulo, tipo: "imagem", modo, dica });   // modo: "logo" | "foto"
const escolha = (id, rotulo, opcoes, padrao, dica = "") => ({ id, rotulo, tipo: "escolha", opcoes, padrao, dica });
const LOGO = (largura) => [
  imagem("logo", "Logo ou desenho", "PNG, JPG ou SVG. Funciona melhor com desenho escuro em fundo claro (ou fundo transparente)."),
  num("limiar", "Limiar (o que é desenho)", 0.5, 0.1, 0.9, 0.05, "Mexa se o desenho sair com falhas ou borrões."),
  sim("inverter", "Inverter (desenho claro em fundo escuro)", false),
  num("largura", "Largura do desenho (mm)", largura, 15, 150, 1),
];

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

  {
    id: "litofania", nome: "Litofania", resumo: "Foto que aparece contra a luz. Plana ou curva.", icone: "🖼️", motor: "js",
    partes: [{ id: "litofania", nome: "Litofania", cor: "#f5f5f4" }],
    campos: [
      imagem("foto", "Foto", "Fotos com bom contraste ficam melhores. JPG ou PNG."),
      escolha("formato", "Formato", [["plana", "Plana"], ["curva", "Curva (em pé)"]], "plana"),
      num("largura", "Largura da foto (mm)", 100, 40, 200, 1),
      num("tmax", "Espessura máxima (mm)", 3, 2, 5, 0.1, "Partes escuras da foto."),
      num("tmin", "Espessura mínima (mm)", 0.8, 0.4, 1.5, 0.1, "Partes claras da foto."),
      num("moldura", "Moldura (mm)", 3, 0, 10, 0.5),
      num("angulo", "Curvatura (graus, só curva)", 120, 60, 180, 5),
      num("gama", "Contraste", 1, 0.5, 2, 0.05, "Acima de 1 escurece os tons médios."),
    ],
    dicas: ["Imprima em PLA BRANCO, 100% de preenchimento, camada de 0,12 mm.", "A plana sai deitada: gire pra imprimir em pé (mais detalhe). Veja pelo lado do relevo, contra a luz."],
  },
  {
    id: "chaveiro_logo", nome: "Chaveiro de logomarca", resumo: "Envie o logo: vira chaveiro com relevo, 2 cores.", icone: "🏷️", logo: "logo",
    partes: [{ id: "base", nome: "Base", cor: "#1f2937" }, { id: "logo", nome: "Logo em relevo", cor: "#f59e0b" }],
    campos: [...LOGO(40),
      escolha("formato", "Formato da base", [["contorno", "Contorno do logo"], ["circulo", "Círculo"], ["retangulo", "Retângulo"]], "contorno"),
      escolha("argola", "Posição da argola", [["topo", "Em cima"], ["esquerda", "À esquerda"]], "topo"),
      num("base_esp", "Espessura da base (mm)", 3, 2, 5, 0.2), num("relevo_alt", "Altura do relevo (mm)", 1.2, 0.6, 3, 0.2),
      num("margem", "Margem (mm)", 3, 1.5, 8, 0.5), num("furo", "Furo da argola (mm)", 4.5, 3, 7, 0.5)],
    dicas: ["Ótimo pra brinde de empresa: gere uma vez e imprima a quantidade que quiser."],
  },
  {
    id: "cortador", nome: "Cortador de biscoito", resumo: "Cortador no formato do seu logo ou desenho.", icone: "🍪", logo: "silhueta",
    partes: [{ id: "cortador", nome: "Cortador", cor: "#f472b6" }],
    campos: [...LOGO(70), num("altura", "Altura da lâmina (mm)", 14, 8, 25, 1), num("parede", "Espessura da lâmina (mm)", 1, 0.6, 2, 0.1),
      num("aba", "Aba de apoio (mm)", 3, 0, 6, 0.5)],
    dicas: ["Use PLA alimentício e lave antes de usar. Formas simples cortam melhor (só o contorno externo é usado)."],
  },
  {
    id: "carimbo", nome: "Carimbo", resumo: "Carimbo do seu logo (já sai espelhado) com cabo.", icone: "🔖", logo: "logo", separadas: true,
    partes: [{ id: "carimbo", nome: "Carimbo", cor: "#f59e0b" }, { id: "cabo", nome: "Cabo (colar atrás)", cor: "#78350f" }],
    campos: [...LOGO(40), num("esp", "Espessura da placa (mm)", 4, 2, 8, 0.5), num("relevo", "Altura do relevo (mm)", 2.5, 1, 5, 0.5),
      num("margem", "Margem (mm)", 3, 1, 10, 0.5)],
    dicas: ["Imprima o carimbo com o desenho pra cima e cole o cabo atrás. Use TPU pro relevo marcar melhor."],
  },
  {
    id: "placa_wifi", nome: "Placa de Wi-Fi", resumo: "Aponte a câmera e conecte: QR Code da sua rede.", icone: "📶", wifi: true, fontesExtras: [],
    partes: [{ id: "placa", nome: "Placa", cor: "#ffffff" }, { id: "detalhes", nome: "QR e textos", cor: "#1e3a8a" }],
    campos: [
      txt("rede", "Nome da rede (SSID)", "MinhaRede", 32), txt("senha", "Senha", "", 63, "", true),
      escolha("seguranca", "Segurança", [["WPA", "WPA/WPA2/WPA3 (a maioria)"], ["WEP", "WEP"], ["nopass", "Sem senha"]], "WPA"),
      sim("mostrar_senha", "Escrever a senha na placa", true), txt("titulo", "Título", "Wi-Fi", 14), fonte("Poppins Bold"),
      num("largura", "Largura (mm)", 100, 70, 200, 1), num("altura", "Altura (mm)", 150, 110, 280, 1),
      num("esp", "Espessura (mm)", 3, 2, 5, 0.2), num("relevo", "Altura do relevo (mm)", 1, 0.6, 2, 0.2),
    ],
    dicas: ["Teste o QR com a câmera do celular antes de imprimir.", "Ótimo pra vender pra restaurantes, salões e Airbnb."],
  },
  {
    id: "tag_pet", nome: "Tag de pet", resumo: "Plaquinha de coleira com nome e telefone.", icone: "🐾", fontesExtras: ["Poppins-Bold.ttf"],
    partes: [{ id: "base", nome: "Base", cor: "#ef4444" }, { id: "texto", nome: "Nome e telefone", cor: "#ffffff" }],
    campos: [
      txt("nome", "Nome do pet", "Thor", 12), txt("telefone", "Telefone", "(27) 99999-9999", 18, "", true),
      escolha("formato", "Formato", [["osso", "Osso"], ["coracao", "Coração"], ["circulo", "Círculo"]], "osso"), fonte("Luckiest Guy"),
      num("tamanho", "Tamanho (mm)", 38, 25, 60, 1), num("esp", "Espessura (mm)", 3, 2, 5, 0.2),
      num("relevo", "Altura do relevo (mm)", 1, 0.6, 2, 0.2), num("furo", "Furo (mm)", 4, 3, 6, 0.5),
    ],
    dicas: ["PETG aguenta melhor o dia a dia do pet que PLA."],
  },
  {
    id: "placa_porta", nome: "Plaquinha de porta", resumo: "Número ou nome com moldura, com ou sem furos.", icone: "🚪",
    partes: [{ id: "placa", nome: "Placa", cor: "#111827" }, { id: "texto", nome: "Texto e moldura", cor: "#d4a017" }],
    campos: [
      txt("texto", "Texto principal", "101", 16), txt("linha2", "Segunda linha", "Escritório", 28, "", true), fonte("Poppins Bold"),
      num("largura", "Largura (mm)", 120, 60, 250, 1), num("altura", "Altura (mm)", 60, 30, 150, 1),
      num("esp", "Espessura (mm)", 4, 2, 8, 0.2), num("relevo", "Altura do relevo (mm)", 1.2, 0.6, 3, 0.2),
      num("borda", "Moldura (mm)", 2.5, 0, 6, 0.5), sim("furos", "Furos pra parafuso", true),
    ],
    dicas: ["Sem furos? Use fita dupla face."],
  },
  {
    id: "swatch", nome: "Amostra de filamento", resumo: "Cartão com degraus de espessura e nome da cor.", icone: "🎨", fontesExtras: [],
    partes: [{ id: "amostra", nome: "Amostra", cor: "#2563eb" }],
    campos: [
      txt("marca", "Marca", "Marca", 18), txt("cor", "Cor", "Azul Royal", 22), txt("info", "Material / temperatura", "PLA · 210°C", 24), fonte("Poppins Bold"),
      num("largura", "Largura (mm)", 75, 60, 100, 1), num("altura", "Altura (mm)", 40, 30, 60, 1), num("esp", "Espessura (mm)", 2.4, 1.6, 3.2, 0.2),
    ],
    dicas: ["Imprima com o próprio filamento: os degraus mostram como a cor fica em cada espessura."],
  },
  {
    id: "caixa", nome: "Caixa com tampa", resumo: "Nas medidas que você quiser, com tampa de encaixe.", icone: "📦", separadas: true,
    partes: [{ id: "caixa", nome: "Caixa", cor: "#16a34a" }, { id: "tampa", nome: "Tampa", cor: "#86efac" }],
    campos: [
      num("largura", "Largura interna (mm)", 80, 20, 250, 1), num("profundidade", "Profundidade interna (mm)", 60, 20, 250, 1),
      num("altura", "Altura interna (mm)", 40, 10, 150, 1), num("parede", "Parede (mm)", 2, 1.2, 4, 0.2), num("fundo", "Fundo (mm)", 2, 1.2, 4, 0.2),
      num("raio", "Cantos arredondados (mm)", 5, 0, 20, 0.5), num("folga", "Folga da tampa (mm)", 0.25, 0, 0.6, 0.05, "Aumente se a tampa ficar apertada."),
      txt("texto", "Texto na tampa", "", 20, "", true), fonte("Poppins Bold"),
    ],
    dicas: ["Imprima a tampa com o texto virado pra mesa (ele já sai espelhado e gravado embaixo)."],
  },
];
