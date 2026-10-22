// Porta-copos com nome — modelo próprio do Multiferramenta 3D
// Partes: "base" e "texto"
texto = "Família"; fonte = "Pacifico"; tamanho = 14;
diametro = 95; base_esp = 4; borda = 1.6; borda_alt = 1.2; texto_alt = 1;
parte = "base";
$fn = 96;

m = textmetrics(texto, font = fonte, size = tamanho, halign = "center", valign = "center");
escala = min(1, (diametro - 2 * borda - 10) / max(m.size[0], 1));   // encolhe o texto se não couber

module base() union() {
  cylinder(d = diametro, h = base_esp);
  translate([0, 0, base_esp]) difference() { cylinder(d = diametro, h = borda_alt); translate([0, 0, -1]) cylinder(d = diametro - 2 * borda, h = borda_alt + 2); }
}
module relevo() translate([0, 0, base_esp]) linear_extrude(texto_alt) scale(escala) text(texto, font = fonte, size = tamanho, halign = "center", valign = "center");

if (parte == "base") base();
else if (parte == "texto") relevo();
