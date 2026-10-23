// Troféu — modelo próprio do Multiferramenta 3D
// Partes: "pedestal", "topo" (taça, estrela ou logo) e "texto" (placa da frente) — em pé, pronto pra multicor
texto = "CAMPEÃO"; linha2 = "2026"; fonte = "Poppins:style=Bold";
topo = "taca";          // taca | estrela | logo
logo = []; lw = 40; lh = 40;
altura = 140;           // altura total aproximada
largura = 60; relevo = 1;
parte = "pedestal";
$fn = 72;

ph = altura * 0.22;                 // altura do pedestal
pw = largura; pd = largura * 0.72;
th = altura - ph;                   // altura do topo
module estrela(r) polygon([for (i = [0 : 9]) let(a = 90 + i * 36, rr = i % 2 == 0 ? r : r * 0.42) [rr * cos(a), rr * sin(a)]]);
module pedestal() { cube([pw, pd, ph * 0.82], center = false); translate([pw * 0.08, pd * 0.08, ph * 0.82]) cube([pw * 0.84, pd * 0.84, ph * 0.18]); }
module taca() {
  s = min(th / 100, pw * 0.84 / 2 / 28);     // a boca da taça cabe no topo do pedestal
  rotate_extrude() polygon([[0, 0], [18 * s, 0], [18 * s, 3 * s], [6 * s, 6 * s], [4 * s, 10 * s], [4 * s, 34 * s], [8 * s, 38 * s],
    [24 * s, 54 * s], [28 * s, 80 * s], [28 * s, 96 * s], [25.6 * s, 96 * s], [25.6 * s, 81 * s], [21.8 * s, 56 * s], [6 * s, 40 * s], [0, 40 * s]]);
}
cx = pw / 2; cy = pd / 2; z0 = ph;
// estrela/logo: chapa em pé de 6 mm com um pezinho de apoio
module em_pe(alt) { translate([0, 3, 0]) rotate([90, 0, 0]) linear_extrude(6) translate([0, alt / 2 + 6]) children(); translate([0, 0, 3]) cube([min(alt * 0.4, pw * 0.7), 12, 6], center = true); }
if (parte == "pedestal") pedestal();
else if (parte == "topo") translate([cx, cy, z0]) {
  if (topo == "taca") taca();
  else if (topo == "estrela") let(r = min(th * 0.42, pw * 0.55)) em_pe(2 * r) estrela(r);
  else if (topo == "logo") let(k = min(th * 0.85 / max(lh, 1), pw * 1.05 / max(lw, 1))) em_pe(lh * k) scale(k) for (p = logo) polygon(points = p[0], paths = p[1]);
}
if (parte == "texto") translate([cx, 0, ph * 0.41]) rotate([90, 0, 0]) linear_extrude(relevo) {
  translate([0, len(linha2) > 0 ? ph * 0.12 : 0]) resize([min(pw * 0.86, len(texto) * pw * 0.11), 0], auto = true) text(texto, font = fonte, size = 10, halign = "center", valign = "center");
  if (len(linha2) > 0) translate([0, -ph * 0.2]) resize([0, ph * 0.2], auto = true) text(linha2, font = fonte, size = 10, halign = "center", valign = "center");
}
