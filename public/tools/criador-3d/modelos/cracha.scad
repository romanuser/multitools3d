// Crachá — modelo próprio do Multiferramenta 3D (tamanho de cartão, 86 × 54 mm)
// Partes: "base" e "texto"
nome = "Rafael Roman"; cargo = "Gerente"; empresa = "Multiferramenta 3D"; fonte = "Poppins:style=Bold";
orientacao = "horizontal";   // horizontal | vertical
esp = 2; relevo = 0.8; raio = 3; prendedor = "rasgo";   // rasgo (presilha/jacaré) | furo (cordão)
parte = "base";
$fn = 48;

L = orientacao == "vertical" ? 54 : 86; A = orientacao == "vertical" ? 86 : 54;
topo_util = A / 2 - (prendedor == "rasgo" ? 9 : 8);       // abaixo do rasgo
module cartao() offset(r = raio) offset(delta = -raio) square([L, A], center = true);
module furo() { if (prendedor == "rasgo") translate([-7, A / 2 - 6.5]) square([14, 3.2]); else translate([0, A / 2 - 5]) circle(d = 4.5); }
module linha(t, y, h, wmax) if (len(t) > 0) translate([0, y]) resize([min(wmax, len(t) * h * 0.72), 0], auto = true) text(t, font = fonte, size = h, halign = "center", valign = "center");
module textos() {
  linha(empresa, topo_util - 5, 5, L - 12);
  linha(nome, orientacao == "vertical" ? 0 : -3, 8, L - 10);
  linha(cargo, orientacao == "vertical" ? -12 : -14, 5.5, L - 14);
  translate([0, topo_util - 10.5]) square([L - 16, 0.8], center = true);      // filete abaixo da empresa
}
if (parte == "base") linear_extrude(esp) difference() { cartao(); furo(); }
else if (parte == "texto") translate([0, 0, esp]) linear_extrude(relevo) textos();
