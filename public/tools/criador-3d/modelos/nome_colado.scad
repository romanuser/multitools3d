// Nome em 3D com letras COLADAS (uma peça só) — modelo próprio do Multiferramenta 3D
// Peças: "letras" (o nome) e "base" (contorno em volta, outra cor — opcional).
// Junta as letras pela parte DESENHADA de cada uma (sem a margem invisível) e emenda pingos e acentos.
nome = "Rafael";
fonte = "Pacifico";
altura_letra = 30;       // tamanho do texto (mm)
espessura = 5;           // espessura das letras
aperto = 15;             // quanto cada letra sobrepõe a próxima (% da largura da menor)
borda = 2.5;             // contorno em volta: garante peça única (0 = sem contorno)
espessura_base = 2;      // espessura do contorno
barra = false;           // barra embaixo pro nome ficar em pé
parte = "letras";
$fn = 48;

S = altura_letra;
function M(c) = textmetrics(c, size = S, font = fonte);
function esq(c) = c == " " ? 0 : M(c).position[0];                 // onde começa a tinta
function larg(c) = c == " " ? 0 : M(c).size[0];                    // largura da tinta
XH = M("x").size[1];                                                // altura do "x"
ESPACO = M(" ").advance[0] * 0.7;
// x de cada letra (origem do glifo), encostando a tinta com sobreposição
function px(i) = i == 0 ? -esq(nome[0])
  : nome[i] == " " ? px(i - 1) + esq(nome[i - 1]) + larg(nome[i - 1]) + ESPACO
  : nome[i - 1] == " " ? px(i - 1) - esq(nome[i])
  : px(i - 1) + esq(nome[i - 1]) + larg(nome[i - 1]) - (aperto / 100) * min(larg(nome[i - 1]), larg(nome[i])) - esq(nome[i]);
n = len(nome);
LARGURA = px(n - 1) + esq(nome[n - 1]) + larg(nome[n - 1]);

// letras com acento/pingo: emenda forte só na região do acento (o resto da letra não muda)
ACIMA_MIN = "ijáàâãäéèêëíìîïóòôõöúùûüñ";
ACIMA_MAI = "ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑ";
ABAIXO = "çÇ";
function tem(c, s) = len(search(c, s)) > 0;
module glifo(c) text(c, size = S, font = fonte, valign = "baseline");
module emendado(c) {
  r = S * 0.12;
  y0 = tem(c, ACIMA_MAI) ? S * 0.62 : XH * 0.72;
  union() {
    glifo(c);
    if (tem(c, ACIMA_MIN) || tem(c, ACIMA_MAI))
      intersection() { offset(r = -r) offset(r = r) glifo(c); translate([-S, y0]) square([4 * S, 2 * S]); }
    if (tem(c, ABAIXO))
      intersection() { offset(r = -r) offset(r = r) glifo(c); translate([-S, -2 * S]) square([4 * S, 2 * S + S * 0.12]); }
  }
}
module letras_cruas() translate([-LARGURA / 2, 0]) for (i = [0 : n - 1]) if (nome[i] != " ") translate([px(i), 0]) emendado(nome[i]);
// ligação entre cada par de letras vizinhas: fechamento forte, mas só na faixa de baixo e só entre as duas
// (cria uma ligação tipo letra cursiva sem mexer nos buracos internos das letras)
module ligacoes() translate([-LARGURA / 2, 0]) for (i = [0 : n - 2]) if (nome[i] != " " && nome[i + 1] != " ") {
  dir_i = px(i) + esq(nome[i]) + larg(nome[i]);              // fim da tinta da letra i
  esq_j = px(i + 1) + esq(nome[i + 1]);                      // começo da tinta da letra seguinte
  // região da ligação: do último quarto da letra i ao primeiro quarto da seguinte
  x0 = min(dir_i - larg(nome[i]) * 0.25, esq_j); x1 = max(esq_j + larg(nome[i + 1]) * 0.25, dir_i);
  R = S * 0.25;
  intersection() {
    offset(r = -R) offset(r = R) union() { translate([px(i), 0]) glifo(nome[i]); translate([px(i + 1), 0]) glifo(nome[i + 1]); }
    translate([x0, -S * 0.02]) square([x1 - x0, XH * 0.62]);
  }
}
module barra2d() if (barra) translate([-LARGURA / 2 - 1, -S * 0.06]) square([LARGURA + 2, S * 0.14]);
// arremate nas emendas + limpeza de lascas finas demais pra existir (< 0,3 mm)
module nome2d() offset(r = 0.15) offset(r = -0.15) offset(r = -0.6) offset(r = 0.6) union() { letras_cruas(); ligacoes(); barra2d(); }
// contorno: primeiro "abraça" o nome todo (fecha brechas grandes e o espaço entre palavras), depois engrossa a borda
module contorno2d() offset(r = borda) offset(r = -S * 0.5) offset(r = S * 0.5) nome2d();

z_letras = borda > 0 ? espessura_base : 0;
if (parte == "letras") translate([0, 0, z_letras]) linear_extrude(espessura) nome2d();
else if (parte == "base" && borda > 0) linear_extrude(espessura_base) contorno2d();
