// Tag de pet (coleira) — modelo próprio do Multiferramenta 3D
// Partes: "base" e "texto"
nome = "Thor"; telefone = "(27) 99999-9999"; fonte = "Luckiest Guy";
formato = "osso";                       // osso | circulo | coracao
tamanho = 38; esp = 3; relevo = 1; furo = 4;
parte = "base";
$fn = 64;

module forma() {
  if (formato == "osso") { square([tamanho * 0.75, tamanho * 0.38], center = true);
    for (x = [-1, 1], y = [-1, 1]) translate([x * tamanho * 0.38, y * tamanho * 0.15]) circle(d = tamanho * 0.34); }
  else if (formato == "coracao") translate([0, -tamanho * 0.08]) rotate(45) { square(tamanho * 0.55, center = true);
    translate([0, tamanho * 0.275]) circle(d = tamanho * 0.55); translate([tamanho * 0.275, 0]) circle(d = tamanho * 0.55); }
  else circle(d = tamanho);
}
furo_pos = formato == "osso" ? [-tamanho * 0.38, tamanho * 0.15] : formato == "coracao" ? [-tamanho * 0.194, tamanho * 0.389 - furo / 2 - 2.2] : [0, tamanho / 2 - furo / 2 - 2];
lar = formato == "osso" ? tamanho * 0.62 : tamanho * 0.7;
module textos() {
  translate([0, formato == "osso" ? 1.5 : 2]) resize([lar, 0], auto = true) text(nome, font = fonte, size = 10, halign = "center", valign = "center");
  if (len(telefone) > 0) translate([0, formato == "osso" ? -4.5 : -tamanho * 0.2]) resize([lar * 0.9, 0], auto = true) text(telefone, font = "Poppins:style=Bold", size = 4, halign = "center", valign = "center");
}
if (parte == "base") difference() { linear_extrude(esp) forma(); translate([furo_pos[0], furo_pos[1], -1]) cylinder(d = furo, h = esp + 2); }
else if (parte == "texto") translate([0, 0, esp]) linear_extrude(relevo) textos();
