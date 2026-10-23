// Medalha — modelo próprio do Multiferramenta 3D
// Partes: "medalha" (disco + passador da fita) e "relevo" (borda, emblema e textos — outra cor)
texto = "CAMPEÃO"; linha2 = "2026"; fonte = "Poppins:style=Bold";
centro = "estrela";     // estrela | logo | nenhum
logo = []; lw = 30; lh = 30;
diametro = 60; esp = 3; relevo = 1.2; borda = 2.5; fita = "rasgo";   // rasgo | argola
parte = "medalha";
$fn = 96;

R = diametro / 2;
module estrela(r) polygon([for (i = [0 : 9]) let(a = 90 + i * 36, rr = i % 2 == 0 ? r : r * 0.42) [rr * cos(a), rr * sin(a)]]);
module emblema() translate([0, R * 0.22]) {
  if (centro == "estrela") estrela(R * 0.36);
  else if (centro == "logo") resize([0, R * 0.62], auto = true) for (p = logo) polygon(points = p[0], paths = p[1]);
}
tem_emb = centro != "nenhum";
module textos() {
  y1 = tem_emb ? -R * 0.28 : R * 0.08;
  translate([0, y1]) resize([min(diametro * 0.72, len(texto) * diametro * 0.085), 0], auto = true) text(texto, font = fonte, size = 10, halign = "center", valign = "center");
  if (len(linha2) > 0) translate([0, y1 - R * 0.3]) resize([0, R * 0.2], auto = true) text(linha2, font = fonte, size = 10, halign = "center", valign = "center");
}
module passador() {
  if (fita == "rasgo") difference() { hull() { translate([-9, R - 2]) square([18, 1]); translate([-8, R + 5]) circle(r = 3); translate([8, R + 5]) circle(r = 3); }
    hull() { translate([-6.5, R + 4.5]) circle(r = 1.6); translate([6.5, R + 4.5]) circle(r = 1.6); } }
  else difference() { hull() { translate([0, R + 3]) circle(r = 5); translate([-3, R - 2]) square([6, 1]); } translate([0, R + 3]) circle(r = 2.5); }
}
if (parte == "medalha") linear_extrude(esp) union() { circle(r = R); passador(); }
else if (parte == "relevo") translate([0, 0, esp]) linear_extrude(relevo) {
  difference() { circle(r = R); circle(r = R - borda); }
  emblema(); textos();
}
