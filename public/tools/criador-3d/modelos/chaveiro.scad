// Chaveiro com nome — modelo próprio do Multiferramenta 3D
// Partes: "base" (cor de fundo) e "texto" (letras em relevo)
texto = "Ana"; fonte = "Pacifico"; tamanho = 14;
base_esp = 3; texto_alt = 1.2; margem = 3; furo = 4.5;
parte = "base";
$fn = 48;

m = textmetrics(texto, font = fonte, size = tamanho, halign = "left", valign = "center");
x0 = m.position[0];

module letras() text(texto, font = fonte, size = tamanho, halign = "left", valign = "center");
module contorno() offset(r = -2) offset(r = 2 + margem) letras();
module aba() translate([x0 - margem - furo / 2 - 1.2, 0]) circle(d = furo + 5);

module base() difference() {
  linear_extrude(base_esp) union() { contorno(); hull() { aba(); translate([x0 + 2, 0]) circle(d = furo + 5); } }
  translate([x0 - margem - furo / 2 - 1.2, 0, -1]) cylinder(d = furo, h = base_esp + 2);
}
module relevo() translate([0, 0, base_esp]) linear_extrude(texto_alt) letras();

if (parte == "base") base();
else if (parte == "texto") relevo();
