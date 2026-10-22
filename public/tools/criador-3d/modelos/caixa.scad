// Caixa com tampa de encaixe — modelo próprio do Multiferramenta 3D
// Partes: "caixa" e "tampa" (impressas separadas). Medidas INTERNAS.
largura = 80; profundidade = 60; altura = 40; parede = 2; fundo = 2; raio = 5; folga = 0.25;
texto = ""; fonte = "Poppins:style=Bold"; gravacao = 0.6;
parte = "caixa";
$fn = 48;

module ret(w, d, r) offset(r = max(0.01, r)) offset(delta = -max(0.01, r)) square([w, d], center = true);
aba = 6;            // altura do encaixe da tampa
if (parte == "caixa") difference() {
  linear_extrude(fundo + altura) ret(largura + 2 * parede, profundidade + 2 * parede, raio + parede);
  translate([0, 0, fundo]) linear_extrude(altura + 1) ret(largura, profundidade, raio);
}
else if (parte == "tampa") difference() {
  union() {
    linear_extrude(fundo) ret(largura + 2 * parede, profundidade + 2 * parede, raio + parede);
    translate([0, 0, fundo]) linear_extrude(aba) difference() {             // encaixe que entra na caixa
      ret(largura - 2 * folga, profundidade - 2 * folga, raio - folga); ret(largura - 2 * folga - 2 * 1.2, profundidade - 2 * folga - 2 * 1.2, raio - folga - 1.2);
    }
  }
  if (len(texto) > 0) translate([0, 0, -0.01]) linear_extrude(gravacao) mirror([1, 0]) resize([min(largura * 0.8, len(texto) * 9), 0], auto = true) text(texto, font = fonte, size = 10, halign = "center", valign = "center");
}
