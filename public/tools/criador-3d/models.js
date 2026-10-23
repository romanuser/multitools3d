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
    id: "placa_pix", nome: "Placa Pague com Pix", resumo: "QR Code Pix de verdade. Parede, balcão (com pé) ou compacta.", icone: "💳",
    partes: [{ id: "placa", nome: "Placa", cor: "#ffffff" }, { id: "detalhes", nome: "QR, textos e moldura", cor: "#0f172a" }, { id: "pe", nome: "Pé de balcão", cor: "#0f172a" }],
    partesSe: { pe: (p) => p.formato === "balcao" }, separaPartes: ["pe"], pix: true,   // só o pé é peça separada
    campos: [
      txt("chave", "Chave Pix", "", 77, "E-mail, telefone (+55…), CPF/CNPJ ou chave aleatória."),
      txt("recebedor", "Nome do recebedor", "Minha Loja", 25), txt("cidade", "Cidade", "São Paulo", 15),
      num("valor", "Valor fixo (opcional, R$)", 0, 0, 100000, 0.01, "Deixe 0 pro cliente digitar o valor."),
      escolha("formato", "Formato", [["vertical", "Vertical (parede)"], ["balcao", "Balcão (com pé)"], ["compacta", "Compacta (quadrada, pra colar)"]], "vertical"),
      txt("titulo", "Título", "PAGUE COM PIX", 18), sim("instrucao", "Escrever “Aponte a câmera do celular”", true), fonte("Poppins Bold"),
      num("largura", "Largura (mm)", 100, 70, 200, 1), num("esp", "Espessura (mm)", 3, 2, 5, 0.2), num("relevo", "Altura do relevo (mm)", 1, 0.6, 2, 0.2),
    ],
    dicas: ["Teste o QR com o app do seu banco antes de imprimir.", "Placa branca e detalhes pretos (troca de cor na camada, ou AMS com o 3MF)."],
  },

  {
    id: "litofania", nome: "Litofania", resumo: "Foto que aparece contra a luz, com base ou luminária.", icone: "🖼️", motor: "js", separadas: true,
    partes: [{ id: "litofania", nome: "Litofania", cor: "#f5f5f4" }, { id: "base", nome: "Base", cor: "#3a3542" }],
    partesSe: { base: (p) => p.base !== "nenhuma" && ["plana", "curva", "cilindro"].includes(p.formato) },
    campos: [
      imagem("foto", "Foto", "Fotos com bom contraste ficam melhores. JPG ou PNG."),
      escolha("formato", "Formato", [["plana", "Plana"], ["curva", "Curva (em pé)"], ["cilindro", "Cilindro 360° (luminária)"], ["coracao", "Coração"], ["circulo", "Círculo"], ["quadrado", "Quadrado"]], "plana",
        "No cilindro, a largura é a volta inteira da foto."),
      escolha("base", "Base", [["pe", "Pé com encaixe"], ["luminaria", "Luminária (velinha de LED)"], ["nenhuma", "Sem base"]], "pe",
        "Na luminária, a velinha de LED (38–40 mm) fica atrás da foto. Coração, círculo e quadrado saem sem base."),
      sim("previa_luz", "Prévia contra a luz", true),
      num("largura", "Largura da foto (mm)", 100, 40, 200, 1),
      num("tmax", "Espessura máxima (mm)", 3, 2, 5, 0.1, "Partes escuras da foto."),
      num("tmin", "Espessura mínima (mm)", 0.8, 0.4, 1.5, 0.1, "Partes claras da foto."),
      num("moldura", "Moldura (mm)", 3, 0, 10, 0.5),
      num("angulo", "Curvatura (graus, só curva)", 120, 60, 180, 5),
      num("gama", "Contraste", 1, 0.5, 2, 0.05, "Acima de 1 escurece os tons médios."),
    ],
    dicas: ["Imprima a foto em PLA BRANCO, 100% de preenchimento, camada de 0,12 mm.", "A plana sai deitada: gire pra imprimir em pé (mais detalhe).",
      "A base pode ser de qualquer cor. A placa entra 6 mm no encaixe (a moldura de baixo já é maior pra isso)."],
  },
  {
    id: "cortador", nome: "Cortador de biscoito", resumo: "Cortador no formato do seu logo ou desenho.", icone: "🍪", logo: "silhueta",
    partes: [{ id: "cortador", nome: "Cortador", cor: "#f472b6" }],
    campos: [...LOGO(70), num("altura", "Altura da lâmina (mm)", 14, 8, 25, 1), num("parede", "Espessura da lâmina (mm)", 1, 0.6, 2, 0.1),
      num("aba", "Aba de apoio (mm)", 3, 0, 6, 0.5)],
    dicas: ["Use PLA alimentício e lave antes de usar. Formas simples cortam melhor (só o contorno externo é usado)."],
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

  {
    id: "chaveiro_litofania", nome: "Chaveiro de litofania", resumo: "Fotinho de 4 cm que aparece contra a luz.", icone: "🔆", motor: "js",
    partes: [{ id: "litofania", nome: "Chaveiro", cor: "#f5f5f4" }],
    campos: [
      imagem("foto", "Foto", "Rostos e fotos com fundo simples ficam melhores nesse tamanho."),
      escolha("formato", "Formato", [["coracao", "Coração"], ["circulo", "Círculo"], ["quadrado", "Quadrado"]], "coracao"),
      num("largura", "Largura (mm)", 40, 30, 60, 1), num("tmax", "Espessura máxima (mm)", 2.4, 1.6, 3.2, 0.1), num("tmin", "Espessura mínima (mm)", 0.6, 0.4, 1, 0.1),
      num("moldura", "Moldura (mm)", 2, 1.5, 4, 0.5), num("gama", "Contraste", 1, 0.5, 2, 0.05), num("furo", "Furo da argola (mm)", 4, 3, 6, 0.5),
      sim("previa_luz", "Prévia contra a luz", true),
    ],
    dicas: ["PLA branco, 100% de preenchimento, camada de 0,08–0,12 mm, deitado."],
  },
  {
    id: "medalha", nome: "Medalha", resumo: "Texto, ano e estrela ou logo. Pra formatura, campeonato e empresa.", icone: "🥇", logo: "opcional",
    partes: [{ id: "medalha", nome: "Medalha", cor: "#d4a017" }, { id: "relevo", nome: "Relevo (borda, emblema, texto)", cor: "#fff3b0" }],
    campos: [
      txt("texto", "Texto", "CAMPEÃO", 18), txt("linha2", "Ano / 2ª linha", "2026", 14, "", true),
      escolha("centro", "Emblema", [["estrela", "Estrela"], ["logo", "Logo (envie abaixo)"], ["nenhum", "Nenhum"]], "estrela"),
      imagem("logo", "Logo (se escolher “Logo”)", "Desenho escuro em fundo claro, ou fundo transparente."),
      num("limiar", "Limiar do logo", 0.5, 0.1, 0.9, 0.05), sim("inverter", "Inverter o logo", false), fonte("Poppins Bold"),
      num("diametro", "Diâmetro (mm)", 60, 35, 100, 1), num("esp", "Espessura (mm)", 3, 2, 5, 0.2), num("relevo", "Altura do relevo (mm)", 1.2, 0.6, 2, 0.2),
      escolha("fita", "Passador", [["rasgo", "Rasgo pra fita"], ["argola", "Argola"]], "rasgo"),
    ],
    dicas: ["Dourado + amarelo claro, prata + branco ou bronze + preto ficam ótimos.", "Gere um lote: mude só o texto ou o ano e baixe de novo."],
  },
  {
    id: "trofeu", nome: "Troféu", resumo: "Pedestal com placa e taça, estrela ou logo no topo.", icone: "🏆", logo: "opcional",
    partes: [{ id: "pedestal", nome: "Pedestal", cor: "#1f2937" }, { id: "topo", nome: "Topo", cor: "#d4a017" }, { id: "texto", nome: "Placa (texto)", cor: "#d4a017" }],
    campos: [
      txt("texto", "Texto da placa", "CAMPEÃO", 18), txt("linha2", "Ano / 2ª linha", "2026", 16, "", true),
      escolha("topo", "Topo", [["taca", "Taça"], ["estrela", "Estrela"], ["logo", "Logo (envie abaixo)"]], "taca"),
      imagem("logo", "Logo (se escolher “Logo”)", "O logo fica em pé, recortado, em cima do pedestal."),
      num("limiar", "Limiar do logo", 0.5, 0.1, 0.9, 0.05), sim("inverter", "Inverter o logo", false), fonte("Poppins Bold"),
      num("altura", "Altura total (mm)", 140, 90, 250, 1), num("largura", "Largura do pedestal (mm)", 60, 40, 120, 1),
    ],
    dicas: ["A taça imprime sem suporte (as paredes têm no máximo 45°).", "Pedestal preto com topo e placa dourados: troca de filamento por parte (AMS)."],
  },
  {
    id: "cracha", nome: "Crachá", resumo: "Tamanho de cartão, com nome, cargo e empresa.", icone: "🪪",
    partes: [{ id: "base", nome: "Crachá", cor: "#1e40af" }, { id: "texto", nome: "Textos", cor: "#ffffff" }],
    campos: [
      txt("nome", "Nome", "Rafael Roman", 22), txt("cargo", "Cargo", "Gerente", 26, "", true), txt("empresa", "Empresa", "Minha Empresa", 26, "", true), fonte("Poppins Bold"),
      escolha("orientacao", "Orientação", [["horizontal", "Deitado"], ["vertical", "Em pé"]], "horizontal"),
      escolha("prendedor", "Prender com", [["rasgo", "Presilha / jacaré (rasgo)"], ["furo", "Cordão (furo)"]], "rasgo"),
      num("esp", "Espessura (mm)", 2, 1.4, 3, 0.2), num("relevo", "Altura do relevo (mm)", 0.8, 0.4, 1.6, 0.2),
    ],
    dicas: ["Pra uma equipe inteira: troque só o nome e o cargo e baixe de novo."],
  },
  {
    id: "polia", nome: "Polia", resumo: "Canal V, canal redondo, lisa ou dentada GT2.", icone: "⚙️",
    partes: [{ id: "polia", nome: "Polia", cor: "#64748b" }],
    campos: [
      escolha("tipo", "Tipo", [["canal_v", "Canal em V (correia em V)"], ["canal_redondo", "Canal redondo (corda/correia redonda)"], ["gt2", "Dentada GT2 (2 mm)"], ["lisa", "Lisa"]], "canal_v"),
      num("diametro", "Diâmetro externo (mm)", 40, 15, 200, 0.5, "Na GT2 o diâmetro vem do número de dentes."),
      num("dentes", "Dentes (só GT2)", 20, 12, 80, 1), num("largura", "Largura (mm)", 10, 4, 40, 0.5),
      num("canal", "Profundidade do canal (mm)", 4, 1, 15, 0.5), num("furo", "Furo do eixo (mm)", 5, 2, 30, 0.1),
      sim("chato", "Eixo com lado chato (motor de passo)", false), sim("cubo", "Cubo com parafuso de trava", true), num("parafuso", "Parafuso de trava (mm)", 3, 2, 5, 0.5),
    ],
    dicas: ["Imprima a 100% de preenchimento em PETG ou ABS pra peça que gira.", "GT2: o perfil dos dentes é aproximado — teste com a correia antes de produzir em série."],
  },
  {
    id: "suporte_l", nome: "Suporte em L / cantoneira", resumo: "Suporte com reforço, cantoneira comprida ou mão francesa.", icone: "📐",
    partes: [{ id: "suporte", nome: "Suporte", cor: "#f97316" }],
    campos: [
      escolha("tipo", "Tipo", [["suporte", "Suporte em L (com reforço)"], ["cantoneira", "Cantoneira (perfil L comprido)"], ["mao_francesa", "Mão francesa (prateleira)"]], "suporte"),
      num("aba_a", "Aba deitada (mm)", 40, 10, 200, 1), num("aba_b", "Aba em pé (mm)", 40, 10, 200, 1),
      num("largura", "Largura (mm)", 20, 8, 100, 1), num("comprimento", "Comprimento (só cantoneira, mm)", 100, 30, 250, 1),
      num("esp", "Espessura (mm)", 4, 1.6, 10, 0.2), num("furo", "Furo do parafuso (mm)", 4.5, 2.5, 8, 0.1),
      num("furos_por_aba", "Furos por aba", 2, 1, 4, 1), sim("escareado", "Furo escareado (cabeça chata)", true),
    ],
    dicas: ["Imprima deitado sobre a aba maior, com 4+ paredes, em PETG ou ABS pra aguentar peso."],
  },
  {
    id: "tampa", nome: "Tampa de reposição", resumo: "Pelo diâmetro da boca do pote: de pressão ou de rosca.", icone: "🫙",
    partes: [{ id: "tampa", nome: "Tampa", cor: "#ef4444" }],
    campos: [
      escolha("tipo", "Tipo", [["pressao", "Pressão (encaixa apertando)"], ["rosca", "Rosca (experimental)"]], "pressao"),
      num("diametro", "Diâmetro EXTERNO da boca (mm)", 70, 15, 200, 0.1, "Meça a boca do pote com paquímetro (na rosca, meça no topo dos filetes)."),
      num("altura", "Altura da tampa (mm)", 12, 5, 40, 0.5), num("passo", "Passo da rosca (mm)", 3, 1, 6, 0.1, "Distância entre um filete e o próximo."),
      num("folga", "Folga (mm)", 0.3, 0, 1, 0.05, "Aumente se ficar apertada; diminua se ficar frouxa."),
      num("parede", "Parede (mm)", 2, 1.2, 4, 0.2), num("topo", "Topo (mm)", 2, 1.2, 4, 0.2),
      sim("serrilha", "Serrilhado na lateral", true), txt("texto", "Texto no topo", "", 16, "", true), fonte("Poppins Bold"),
    ],
    dicas: ["Faça primeiro um teste com 4 mm de altura pra acertar a folga antes da tampa inteira.", "Pra comida, use PLA/PETG alimentício e lave antes."],
  },
];
