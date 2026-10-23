// Suporte em L, cantoneira e mão francesa — modelo próprio do Multiferramenta 3D
tipo = "suporte";        // suporte (com reforço) | cantoneira (perfil comprido) | mao_francesa
aba_a = 40; aba_b = 40;  // comprimento de cada aba
largura = 20;            // largura do suporte (no perfil: comprimento total = comprimento)
comprimento = 100;       // só cantoneira
esp = 4;
furo = 4.5; escareado = true; furos_por_aba = 2;
parte = "suporte";
$fn = 40;

module furo_escareado(h) { translate([0, 0, -1]) cylinder(d = furo, h = h + 2); if (escareado) translate([0, 0, h - furo * 0.5]) cylinder(d1 = furo, d2 = furo * 2, h = furo * 0.5 + 0.01); }
L = tipo == "cantoneira" ? comprimento : largura;
module corpo() {
  cube([L, aba_a, esp]);                                    // aba A (deitada, no eixo Y)
  cube([L, esp, aba_b]);                                    // aba B (em pé, no eixo Z)
  if (tipo == "suporte") for (x = [L / 2 - esp / 2]) translate([x, 0, 0]) rotate([90, 0, 90]) linear_extrude(esp)    // reforço triangular
    polygon([[esp, esp], [min(aba_a, aba_b) * 0.7, esp], [esp, min(aba_a, aba_b) * 0.7]]);
  if (tipo == "mao_francesa") translate([0, 0, 0]) rotate([90, 0, 90]) linear_extrude(L) difference() {
    polygon([[0, 0], [aba_a, 0], [aba_a, esp], [esp, aba_b], [0, aba_b]]);
    offset(r = -esp) polygon([[0, 0], [aba_a, 0], [aba_a, esp], [esp, aba_b], [0, aba_b]]);
  }
}
nx = tipo == "cantoneira" ? max(1, floor(comprimento / 50)) : 1;
if (parte == "suporte") difference() {
  corpo();
  for (j = [0 : nx - 1]) let(x = L * (j + 0.5) / nx) {
    for (i = [1 : furos_por_aba]) let(y = esp + 4 + (aba_a - esp - 8) * (furos_por_aba == 1 ? 0.5 : (i - 1) / (furos_por_aba - 1))) translate([x, y, 0]) furo_escareado(esp);
    for (i = [1 : furos_por_aba]) let(z = esp + 4 + (aba_b - esp - 8) * (furos_por_aba == 1 ? 0.5 : (i - 1) / (furos_por_aba - 1))) translate([x, esp, z]) rotate([90, 0, 0]) furo_escareado(esp);
  }
}
