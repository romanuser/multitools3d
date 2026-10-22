// Carimbo com logo — modelo próprio do Multiferramenta 3D
// Partes: "carimbo" (placa + desenho ESPELHADO em relevo) e "cabo" (cole atrás da placa)
logo = []; lw = 40; lh = 40;
esp = 4; relevo = 2.5; margem = 3; cabo_d = 22; cabo_alt = 28;
parte = "carimbo";
$fn = 64;

module desenho() mirror([1, 0]) for (p = logo) polygon(points = p[0], paths = p[1]);
if (parte == "carimbo") {
  linear_extrude(esp) offset(r = margem) square([lw, lh], center = true);
  translate([0, 0, esp]) linear_extrude(relevo) desenho();
}
else if (parte == "cabo") {
  cylinder(d1 = min(lw, lh, 30), d2 = cabo_d * 0.7, h = cabo_alt * 0.55);
  translate([0, 0, cabo_alt * 0.55]) cylinder(d1 = cabo_d * 0.7, d2 = cabo_d, h = cabo_alt * 0.25);
  translate([0, 0, cabo_alt * 0.8]) resize([cabo_d, cabo_d, cabo_alt * 0.4]) sphere(d = cabo_d);
}
