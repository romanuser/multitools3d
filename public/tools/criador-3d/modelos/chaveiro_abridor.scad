// Chaveiro-emblema com abridor de anel de lata — modelo próprio do Multiferramenta 3D
// Peças: "base" (cor 1: disco, argola e língua abridora) e "detalhes" (cor 2: emblema ou texto embutido no topo).
// Abridor: a ponta fina entra embaixo do anel e levanta; a abertura engancha o anel pra puxar.
diametro = 50;
espessura = 4;
centro = "logo";          // logo | texto
texto = "MEU TIME"; fonte = "Poppins:style=Bold"; texto_tam = 7;
logo = []; lw = 60; lh = 60;
borda = 2;                // aro liso em volta do emblema
furo = 5;                 // furo da argola
lingua = 18;              // comprimento da língua abridora
parte = "base";
$fn = 120;

R = diametro / 2;
RELEVO = 0.8;             // profundidade do emblema embutido
LW = 16;                  // largura da língua

module argola2d() difference() { hull() { translate([0, R + furo / 2 + 1.5]) circle(d = furo + 5); translate([0, R - 4]) circle(d = furo + 5); } translate([0, R + furo / 2 + 1.5]) circle(d = furo); }
module desenho2d() {
  if (centro == "logo" && len(logo) > 0) let (k = (diametro - 2 * borda - 2) / max(lw, lh)) scale([k, k]) for (p = logo) polygon(points = p[0], paths = p[1]);
  else if (centro == "texto" && len(texto) > 0)
    resize([min(diametro - 2 * borda - 6, len(texto) * texto_tam * 0.8), 0], auto = true) text(texto, size = texto_tam, font = fonte, halign = "center", valign = "center");
}
// língua: vai afinando de "espessura" (junto do disco) até 0,8 mm na ponta
module lingua3d() hull() {
  translate([-LW / 2, -R - 1, 0]) cube([LW, 2, espessura]);
  translate([-LW / 2 + 2, -R - lingua, 0]) cube([LW - 4, 0.8, 0.8]);
}
module abertura() translate([0, -R - 7.5, -1]) linear_extrude(espessura + 2) hull() { translate([-4.5, 0]) circle(d = 3.6); translate([4.5, 0]) circle(d = 3.6); }

module corpo() difference() {
  union() { linear_extrude(espessura) union() { circle(r = R); argola2d(); } lingua3d(); }
  abertura();
}
module desenho_limitado() intersection() { circle(r = R - borda); desenho2d(); }
module detalhes() translate([0, 0, espessura - RELEVO]) linear_extrude(RELEVO) desenho_limitado();
module recorte() translate([0, 0, espessura - RELEVO]) linear_extrude(RELEVO + 1) desenho_limitado();   // passa do topo: corta limpo

if (parte == "base") difference() { corpo(); recorte(); }
else if (parte == "detalhes") detalhes();
