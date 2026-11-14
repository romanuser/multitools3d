// Letreiro LED no formato do LOGO (caixa de luz) — modelo próprio do Multiferramenta 3D
// Peças: "corpo" (opaco: parede no contorno do logo + fundo com furos), "difusor" (translúcido) e "desenho" (opaco).
// difusor + desenho formam a frente em 2 cores, impressa deitada; a fita de LED vai colada no fundo do corpo.
largura_total = 300;      // largura total do letreiro (mm)
largura = largura_total;  // (o Criador usa "largura" pro logo vetorizado: o campo da tela é largura_total)
profundidade = 30;        // profundidade da caixa (espaço do LED)
parede = 2.0; fundo = 2.0;
formato = "contorno";     // contorno (segue o logo) | placa (retângulo arredondado) | oval
unir = 8;                 // contorno: fecha vãos entre partes do logo (mm) pra virar uma caixa só
margem = 10;              // placa/oval: espaço em volta do logo
frente = 2.0;             // espessura da frente
acende = "fundo";         // fundo (o desenho fica escuro e o resto acende) | desenho (só o desenho acende)
folga = 0.3;
furo_cabo = 6;
pendurar = true;          // furos de fechadura atrás
logo = []; lw = 60; lh = 60; silhueta = [];
// dividir em placas (letreiro maior que a mesa): cortes com encaixe rabo de andorinha
dividir = false;
mesa = 180;               // A1 mini 180 · Ender 3 220 · A1/P1S/X1 256
fonte = "Poppins:style=Bold";
parte = "corpo";
$fn = 48;

k = largura / lw;
H = lh * k;
module poligonos(ps) for (p = ps) polygon(points = p[0], paths = p[1]);
module logo_sil() scale([k, k]) poligonos(len(silhueta) ? silhueta : logo);
module contorno2d() {
  if (formato == "placa") offset(r = 8) offset(delta = margem - 8) square([largura, H], center = true);
  else if (formato == "oval") scale([(largura + 2 * margem) / 2, (H + 2 * margem) / 2]) circle(1, $fn = 120);
  else offset(r = -unir) offset(r = unir) logo_sil();
}
module desenho2d() scale([k, k]) poligonos(logo);
module interno2d() offset(delta = -parede) contorno2d();
module frente2d() offset(delta = -folga) interno2d();

// corpo: fundo + parede; degrau interno (em escadinha de 45°, imprime sem suporte) onde a frente assenta
DEG = 1.6;                // largura do degrau
z_frente = profundidade - frente;
module corpo() difference() {
  union() {
    difference() { linear_extrude(profundidade) contorno2d(); translate([0, 0, fundo]) linear_extrude(profundidade) interno2d(); }
    for (i = [0 : 3]) translate([0, 0, z_frente - DEG + i * DEG / 4 - 0.01])
      linear_extrude(DEG / 4 + 0.01) difference() { interno2d(); offset(delta = -DEG * (i + 1) / 4) interno2d(); }
  }
  translate([0, -H * 0.32, -1]) cylinder(d = furo_cabo, h = fundo + 2);                  // cabo da fita
  if (pendurar) for (x = [-largura * 0.18, largura * 0.18]) translate([x, H * 0.18, -0.01]) {   // fechadura
    hull() { cylinder(d = 4.5, h = fundo + 1); translate([0, 6, 0]) cylinder(d = 4.5, h = fundo + 1); }
    translate([0, 6, 0]) cylinder(d = 9, h = fundo * 0.55);
    hull() { translate([0, 0, fundo * 0.55 - 0.01]) cylinder(d = 9, h = 0.01); translate([0, 6, fundo * 0.55 - 0.01]) cylinder(d = 9, h = 0.01); }
  }
}
// frente: o desenho embutido NIVELADO (0,8 mm no modo fundo; espessura toda no modo desenho)
ESP_DES = acende == "fundo" ? 0.8 : frente;
module des3d() translate([0, 0, frente - ESP_DES]) linear_extrude(ESP_DES) intersection() { frente2d(); desenho2d(); }
module recorte_des() translate([0, 0, frente - ESP_DES]) linear_extrude(ESP_DES + 1) intersection() { frente2d(); desenho2d(); }
module frente_inteira() linear_extrude(frente) frente2d();

// ---------- divisão em placas ----------
BW = formato == "contorno" ? largura + 2 * unir : largura + 2 * margem;   // tamanho ocupado (com folga)
BH = formato == "contorno" ? H + 2 * unir : H + 2 * margem;
TAB = 6; TW0 = 10; TW1 = 15;                 // rabo de andorinha: profundidade, largura na raiz e na ponta
PASSO = mesa - 2 * TAB - 10;                 // tamanho útil de cada placa
nx = dividir ? max(1, ceil(BW / PASSO)) : 1;
ny = dividir ? max(1, ceil(BH / PASSO)) : 1;
cw = BW / nx; ch = BH / ny;
GAP = 14;                                    // espaço entre as placas no arquivo
X0 = function (i) -BW / 2 + i * cw;
Y0 = function (j) -BH / 2 + j * ch;
// encaixes de uma divisa vertical (entre colunas i e i+1, na linha j) e horizontal (entre linhas j e j+1, na coluna i)
module tabs_v(i, j) let (x = X0(i + 1), n = max(1, floor(ch / 50)))
  for (t = [0 : n - 1]) let (y = Y0(j) + (t + 0.5) * ch / n)
    polygon([[x - 0.5, y - TW0 / 2], [x, y - TW0 / 2], [x + TAB, y - TW1 / 2], [x + TAB, y + TW1 / 2], [x, y + TW0 / 2], [x - 0.5, y + TW0 / 2]]);
module tabs_h(i, j) let (y = Y0(j + 1), n = max(1, floor(cw / 50)))
  for (t = [0 : n - 1]) let (x = X0(i) + (t + 0.5) * cw / n)
    polygon([[x - TW0 / 2, y - 0.5], [x - TW0 / 2, y], [x - TW1 / 2, y + TAB], [x + TW1 / 2, y + TAB], [x + TW0 / 2, y], [x + TW0 / 2, y - 0.5]]);
// célula (i, j): o retângulo + os encaixes que saem dela − os encaixes que entram nela (exatamente complementares)
module celula(i, j) difference() {
  union() {
    translate([i == 0 ? -BW : X0(i), j == 0 ? -BH : Y0(j)])
      square([(i == 0 ? X0(1) + BW : cw) + (i == nx - 1 ? BW : 0), (j == 0 ? Y0(1) + BH : ch) + (j == ny - 1 ? BH : 0)]);
    if (i < nx - 1) tabs_v(i, j);
    if (j < ny - 1) tabs_h(i, j);
  }
  if (i > 0) tabs_v(i - 1, j);
  if (j > 0) tabs_h(i, j - 1);
}
LETRAS = "ABCDEFGHIJ";
module em_placas(rotular = false) {
  if (nx * ny == 1) children();
  else for (i = [0 : nx - 1]) for (j = [0 : ny - 1]) translate([i * GAP, j * GAP, 0]) difference() {
    intersection() { children(); translate([0, 0, -1]) linear_extrude(profundidade + 5) celula(i, j); }
    // identificação gravada embaixo (linha de cima = A): espelhada pra ler certo virando a placa
    if (rotular) translate([X0(i) + cw / 2, Y0(j) + ch / 2, -0.01]) linear_extrude(0.6) mirror([1, 0, 0])
      text(str(LETRAS[ny - 1 - j], i + 1), size = 8, font = fonte, halign = "center", valign = "center");
  }
}

if (parte == "corpo") em_placas(true) corpo();
else if (parte == "difusor") em_placas() {
  if (acende == "fundo") difference() { frente_inteira(); recorte_des(); }
  else intersection() { frente_inteira(); translate([0, 0, -1]) linear_extrude(frente + 2) desenho2d(); }   // só o desenho é translúcido
}
else if (parte == "desenho") em_placas() {
  if (acende == "fundo") des3d();
  else difference() { frente_inteira(); translate([0, 0, -1]) linear_extrude(frente + 2) desenho2d(); }   // o resto é opaco
}
