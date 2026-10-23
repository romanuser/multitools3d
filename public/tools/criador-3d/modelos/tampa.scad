// Tampa de reposição — modelo próprio do Multiferramenta 3D
// tipo: pressao (encaixa por fricção) | rosca (rosca interna, experimental)
tipo = "pressao";
diametro = 70;           // diâmetro EXTERNO da boca do pote/frasco (meça com paquímetro)
altura = 12;             // altura da saia
topo = 2; parede = 2; folga = 0.3;
passo = 3;               // rosca: distância entre os filetes
serrilha = true; texto = ""; fonte = "Poppins:style=Bold";
parte = "tampa";
$fn = 128;

Di = diametro + 2 * folga; De = Di + 2 * parede + (tipo == "rosca" ? 2 : 0);
module serrilhado() if (serrilha) for (i = [0 : 59]) rotate(i * 6) translate([De / 2, 0, 0]) cylinder(d = 1.6, h = altura + topo, $fn = 12);
module rosca_negativa() {   // "parafuso" do tamanho da boca: a tampa é o molde dele (rosca senoidal)
  e = passo * 0.3; h = altura;
  linear_extrude(height = h, twist = -360 * h / passo, slices = max(24, h / passo * 24)) translate([e, 0]) circle(d = Di + 2 * e - 2 * e);
}
if (parte == "tampa") difference() {
  union() { cylinder(d = De, h = altura + topo); serrilhado(); }
  if (tipo == "rosca") translate([0, 0, -0.01]) rosca_negativa();
  else translate([0, 0, -0.01]) cylinder(d = Di, h = altura);
  if (tipo == "pressao") translate([0, 0, -0.01]) cylinder(d1 = Di + 1.2, d2 = Di, h = 1.5);      // chanfro de entrada
  if (len(texto) > 0) translate([0, 0, altura + topo - 0.6]) linear_extrude(1) resize([min(De * 0.7, len(texto) * 9), 0], auto = true) text(texto, font = fonte, size = 10, halign = "center", valign = "center");
}
