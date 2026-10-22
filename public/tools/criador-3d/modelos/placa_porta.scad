// Plaquinha de porta — modelo próprio do Multiferramenta 3D
// Partes: "placa" e "texto"
texto = "101"; linha2 = "Escritório"; fonte = "Poppins:style=Bold";
largura = 120; altura = 60; esp = 4; relevo = 1.2; raio = 8; borda = 2.5; furos = true;
parte = "placa";
$fn = 48;

module contorno(r = 0) offset(r = raio) offset(delta = -raio) square([largura - 2 * r, altura - 2 * r], center = true);
tem2 = len(linha2) > 0;
module textos() {
  translate([0, tem2 ? altura * 0.1 : 0]) resize([0, altura * (tem2 ? 0.42 : 0.55)], auto = true) text(texto, font = fonte, size = 10, halign = "center", valign = "center");
  if (tem2) translate([0, -altura * 0.26]) resize([min(largura - 30, len(linha2) * altura * 0.1), 0], auto = true) text(linha2, font = fonte, size = 10, halign = "center", valign = "center");
  difference() { contorno(); offset(delta = -borda) contorno(); }          // moldura em relevo
}
if (parte == "placa") difference() {
  linear_extrude(esp) contorno();
  if (furos) for (x = [-1, 1]) translate([x * (largura / 2 - 8), 0, -1]) { cylinder(d = 3.5, h = esp + 2); translate([0, 0, esp - 1.5]) cylinder(d1 = 3.5, d2 = 7, h = 1.6); }
}
else if (parte == "texto") translate([0, 0, esp]) linear_extrude(relevo) textos();
