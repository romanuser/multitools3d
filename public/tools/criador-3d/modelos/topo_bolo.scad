// Topo de bolo — modelo próprio do Multiferramenta 3D
// Partes: "topo" (silhueta com contorno e duas hastes) e "letras" (nome em relevo, outra cor)
texto = "Maria"; linha2 = "15 anos"; fonte = "Pacifico"; tamanho = 30; tamanho2 = 14;
espessura = 3; contorno = 2.5; relevo = 1; haste_comp = 70; haste_larg = 4;
parte = "topo";
$fn = 40;

m = textmetrics(texto, font = fonte, size = tamanho, halign = "center", valign = "baseline");
largura = m.size[0];
tem2 = len(linha2) > 0;

module desenho() {
  text(texto, font = fonte, size = tamanho, halign = "center", valign = "baseline");
  if (tem2) translate([0, -tamanho2 * 1.5]) text(linha2, font = fonte, size = tamanho2, halign = "center", valign = "baseline");
}
module silhueta() offset(r = -3) offset(r = 3 + contorno) desenho();
// as hastes sobem por dentro do desenho até a linha de base do nome: ficam
// sempre ligadas ao topo, qualquer que seja a fonte (na peça única, a parte
// escondida dentro do desenho não aparece)
fundo_y = tem2 ? -tamanho2 * 1.5 - tamanho2 * 0.4 - contorno : -tamanho * 0.3 - contorno;
module hastes() for (x = [-largura / 4, largura / 4]) translate([x - haste_larg / 2, fundo_y - haste_comp]) square([haste_larg, haste_comp - fundo_y + tamanho * 0.25]);

if (parte == "topo") linear_extrude(espessura) union() { silhueta(); hastes(); }
else if (parte == "letras") translate([0, 0, espessura]) linear_extrude(relevo) desenho();
