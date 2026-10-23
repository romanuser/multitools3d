// Chaveiro de litofania — modelo próprio do Multiferramenta 3D.
// A litofania já vem pronta no formato (coração, círculo, quadrado) em /lito.stl; aqui só entra a argola,
// encostada na MOLDURA lisa (não no relevo da foto), com o furo todo fora da peça.
furo = 4; px = 0; py = 20; tmax = 2.4;   // px, py: centro da argola (vem calculado do criador)
parte = "litofania";
$fn = 64;
rr = (furo + 4.4) / 2;
if (parte == "litofania") difference() {
  union() { import("/lito.stl", convexity = 4); translate([px, py, 0]) cylinder(r = rr, h = tmax); }
  translate([px, py, -1]) cylinder(d = furo, h = tmax + 2);
}
