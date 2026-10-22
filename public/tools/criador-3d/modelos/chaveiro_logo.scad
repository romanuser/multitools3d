// Chaveiro de logomarca — modelo próprio do Multiferramenta 3D
// Partes: "base" e "logo" (relevo em outra cor). O logo vem vetorizado do criador.
logo = []; lw = 40; lh = 40;            // polígonos do logo (mm) e seu tamanho
formato = "contorno";                   // contorno | circulo | retangulo
base_esp = 3; relevo_alt = 1.2; margem = 3; furo = 4.5; argola = "topo";
parte = "base";
$fn = 48;

module desenho() for (p = logo) polygon(points = p[0], paths = p[1]);
module forma() {
  if (formato == "circulo") circle(d = max(lw, lh) + 2 * margem);
  else if (formato == "retangulo") offset(r = margem) square([lw, lh], center = true);
  else offset(r = -2) offset(r = 2 + margem) desenho();
}
ext = formato == "circulo" ? max(lw, lh) / 2 + margem : (argola == "topo" ? lh / 2 + margem : lw / 2 + margem);
pos = argola == "topo" ? [0, ext + furo / 2 + 1.2] : [-(ext + furo / 2 + 1.2), 0];
// a aba vai da argola até o centro: fica sempre presa, qualquer que seja o logo
module aba() hull() { translate(pos) circle(d = furo + 5); circle(d = furo + 5); }

if (parte == "base") difference() {
  linear_extrude(base_esp) union() { forma(); aba(); }
  translate([pos[0], pos[1], -1]) cylinder(d = furo, h = base_esp + 2);
}
else if (parte == "logo") translate([0, 0, base_esp]) linear_extrude(relevo_alt) desenho();
