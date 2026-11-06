// Torre de temperatura — um andar por temperatura (10 mm cada), com ponte, saliência a 45° e a temperatura gravada.
// No fatiador: troque a temperatura do bico a cada 10 mm (o primeiro andar começa em 1 mm, em cima da base).
t_inicio = 230;   // temperatura do primeiro andar (de baixo)
t_fim = 190;      // temperatura do último andar
passo = 5;
parte = "torre";
$fn = 32;
fonte = "Poppins:style=Bold";

n = floor(abs(t_inicio - t_fim) / passo) + 1;
dir = t_fim < t_inicio ? -1 : 1;
A = 10; L = 30; P = 10;                     // andar: altura, largura, profundidade
module andar(t) difference() {
  union() {
    cube([L, P, A]);
    // saliência a 45° do lado direito
    translate([L, 0, 0]) rotate([90, 0, 0]) translate([0, 0, -P]) linear_extrude(P) polygon([[0, 2], [0, A], [A - 2, A]]);
  }
  translate([7, -1, 1.2]) cube([12, P + 2, 4.2]);                          // vão da ponte
  translate([L / 2 + 2.5, -0.01, 6.6]) rotate([90, 0, 0]) mirror([0, 0, 1])   // temperatura gravada na frente
    linear_extrude(0.6) text(str(t), size = 3.2, font = fonte, halign = "center", valign = "center");
}
if (parte == "torre") union() {
  translate([-3, -3, 0]) cube([L + A + 4, P + 6, 1]);                        // base
  for (i = [0 : n - 1]) translate([0, 0, 1 + i * A]) andar(t_inicio + dir * i * passo);
}
