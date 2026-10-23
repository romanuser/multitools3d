// Polia — modelo próprio do Multiferramenta 3D
// tipo: lisa | canal_v (correia em V) | canal_redondo (corda/correia redonda) | gt2 (correia dentada GT2, 2 mm)
tipo = "canal_v";
diametro = 40;          // diâmetro externo (GT2: calculado pelos dentes)
largura = 10;           // largura da polia
dentes = 20;            // só GT2
furo = 5;               // eixo
chato = false;          // eixo com lado chato (motor de passo / D)
cubo = true; cubo_alt = 7; parafuso = 3;   // cubo com furo pro parafuso de trava (M3)
canal = 4;              // profundidade do canal (V / redondo)
parte = "polia";
$fn = 96;

pd = dentes * 2 / PI; od = pd - 0.508;         // GT2: diâmetro primitivo e externo
D = tipo == "gt2" ? od : diametro;
module perfil_v() polygon([[furo / 2, 0], [D / 2, 0], [D / 2, largura * 0.2], [D / 2 - canal, largura / 2], [D / 2, largura * 0.8], [D / 2, largura], [furo / 2, largura]]);
module perfil_redondo() difference() { translate([furo / 2, 0]) square([D / 2 - furo / 2, largura]); translate([D / 2, largura / 2]) circle(r = canal); }
module gt2() {
  aba = 1.2; corpo = largura - 2 * aba;
  cylinder(d = od + 3, h = aba);
  translate([0, 0, aba - 0.01]) linear_extrude(corpo + 0.02) difference() {   // sobrepõe as abas (não só encosta)
    circle(d = od, $fn = dentes * 8);
    for (i = [0 : dentes - 1]) rotate(i * 360 / dentes) translate([od / 2 + 0.05, 0]) circle(r = 0.6, $fn = 24);   // vão de cada dente
  }
  translate([0, 0, largura - aba]) cylinder(d = od + 3, h = aba);
}
module eixo() { difference() { circle(d = furo); if (chato) translate([furo / 2 - 0.5, -furo]) square([furo, 2 * furo]); } }
if (parte == "polia") difference() {
  union() {
    if (tipo == "gt2") gt2();
    else if (tipo == "canal_v") rotate_extrude() perfil_v();
    else if (tipo == "canal_redondo") rotate_extrude() perfil_redondo();
    else cylinder(d = D, h = largura);
    if (cubo) translate([0, 0, largura - 0.01]) cylinder(d = max(furo + 10, 14), h = cubo_alt);
  }
  translate([0, 0, -1]) linear_extrude(largura + cubo_alt + 2) eixo();
  if (cubo) translate([0, 0, largura + cubo_alt / 2]) rotate([0, 90, 0]) cylinder(d = parafuso, h = 20);   // furo radial do parafuso de trava
}
