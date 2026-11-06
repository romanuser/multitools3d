// Chaveiro abridor de lata no FORMATO DO SÍMBOLO enviado — modelo próprio do Multiferramenta 3D
// Peças: "base" (cor 1: corpo no formato do símbolo + argola + ponta abridora) e "detalhes" (cor 2: desenho embutido no topo).
// Abridor: na ponta, uma FENDA horizontal (tipo boca de pregador). A mandíbula de baixo, fina e chanfrada,
// escorrega por baixo da tampinha; a ponta da tampinha entra na fenda e, girando o chaveiro, ela levanta.
tamanho = 50;             // maior medida do símbolo (mm)
espessura = 4;
aro = 2;                  // borda lisa em volta do desenho
logo = []; lw = 60; lh = 60;
silhueta = [];            // contorno de fora do símbolo (mesma escala do desenho)
formato = "contorno";     // contorno | redondo
furo = 5;                 // furo da argola
fenda_larg = 13;          // largura da fenda (a tampinha tem ~10–11 mm)
fenda_alt = 1.2;          // altura da fenda
fenda_fundo = 7;          // profundidade da fenda
parte = "base";
$fn = 72;

RELEVO = 0.8;
k = (tamanho - 2 * aro) / max(lw, lh);
usa_contorno = formato == "contorno" && len(silhueta) > 0;
module poligonos(ps) for (p = ps) polygon(points = p[0], paths = p[1]);
module corpo2d() { if (usa_contorno) offset(r = aro) scale([k, k]) poligonos(silhueta); else circle(d = tamanho); }
// altura do símbolo (pra posicionar argola e ponta)
H = usa_contorno ? lh * k + 2 * aro : tamanho;
W = usa_contorno ? lw * k + 2 * aro : tamanho;

// argola: orelha no topo do símbolo
module argola2d() difference() {
  hull() { translate([0, H / 2 + furo / 2 + 1]) circle(d = furo + 5.5); translate([0, H / 2 - 5]) circle(d = furo + 5.5); }
  translate([0, H / 2 + furo / 2 + 1]) circle(d = furo);
}
// ponta abridora: língua que sai de baixo do símbolo
LINGUA_L = 16; LINGUA_W = fenda_larg + 7;
module lingua3d() hull() {
  translate([-LINGUA_W / 2, -H / 2 + 4, 0]) cube([LINGUA_W, 1, espessura]);
  translate([-LINGUA_W / 2 + 1, -H / 2 - LINGUA_L, 0]) cube([LINGUA_W - 2, 1, espessura]);
}
// fenda na ponta (aberta pra frente) + chanfro embaixo da mandíbula de baixo (escorrega por baixo da tampinha)
z_fenda = 1.2;
module fenda3d() {
  translate([-fenda_larg / 2, -H / 2 - LINGUA_L - 1, z_fenda]) cube([fenda_larg, fenda_fundo + 1, fenda_alt]);
  // entrada da fenda alargada (funil), pra tampinha achar o caminho
  translate([0, -H / 2 - LINGUA_L - 0.01, z_fenda + fenda_alt / 2]) rotate([-90, 0, 0])
    linear_extrude(2, scale = [1, 0.4]) square([fenda_larg + 2, fenda_alt * 2.4], center = true);
  // chanfro da mandíbula de baixo: a ponta fica com ~0,4 mm
  translate([-LINGUA_W, -H / 2 - LINGUA_L - 1, 0]) rotate([-atan((z_fenda - 0.4) / 5), 0, 0]) translate([0, 0, -10]) cube([2 * LINGUA_W, 6, 10]);
}

module desenho2d() intersection() { offset(r = -0.4) corpo2d(); scale([k, k]) poligonos(logo); }
module detalhes() translate([0, 0, espessura - RELEVO]) linear_extrude(RELEVO) desenho2d();
module recorte_desenho() translate([0, 0, espessura - RELEVO]) linear_extrude(RELEVO + 1) desenho2d();

module corpo() difference() {
  union() { linear_extrude(espessura) union() { corpo2d(); argola2d(); } lingua3d(); }
  fenda3d();
}

if (parte == "base") difference() { corpo(); recorte_desenho(); }
else if (parte == "detalhes") detalhes();
