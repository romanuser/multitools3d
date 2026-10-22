// Amostra de filamento (swatch) — modelo próprio do Multiferramenta 3D
// Parte: "amostra" (imprima no próprio filamento). Degraus de 0,4 a 2,0 mm mostram a transparência.
marca = "Marca"; cor = "Azul Royal"; info = "PLA · 210°C"; fonte = "Poppins:style=Bold";
largura = 75; altura = 40; esp = 2.4; gravacao = 0.6; raio = 4;
parte = "amostra";
$fn = 40;

degraus = [0.4, 0.8, 1.2, 1.6, 2.0]; dw = (largura - 14) / len(degraus);
module cartao() offset(r = raio) offset(delta = -raio) square([largura, altura], center = true);
if (parte == "amostra") difference() {
  union() {
    translate([0, 0, 0]) linear_extrude(esp) intersection() { cartao(); translate([-largura / 2, -altura / 2 + 12]) square([largura, altura]); }
    for (i = [0 : len(degraus) - 1]) linear_extrude(degraus[i]) intersection() { cartao(); translate([-largura / 2 + 7 + i * dw, -altura / 2]) square([dw + 0.01, 12]); }
    linear_extrude(esp) intersection() { cartao(); union() { translate([-largura / 2, -altura / 2]) square([7, 12]); translate([largura / 2 - 7, -altura / 2]) square([7, 12]); } }
  }
  translate([0, 0, esp - gravacao]) linear_extrude(gravacao + 1) {
    translate([-largura / 2 + 12, altura / 2 - 9]) resize([min(largura - 24, len(marca) * 5), 0], auto = true) text(marca, font = fonte, size = 6, valign = "center");
    translate([-largura / 2 + 6, altura / 2 - 18]) resize([min(largura - 12, len(cor) * 4.2), 0], auto = true) text(cor, font = fonte, size = 5, valign = "center");
    translate([-largura / 2 + 6, altura / 2 - 25]) resize([min(largura - 12, len(info) * 3.4), 0], auto = true) text(info, font = fonte, size = 4, valign = "center");
  }
  translate([largura / 2 - 7, altura / 2 - 7, -1]) cylinder(d = 5, h = esp + 2);            // furo pra argola
}
