// Cubo de calibração 20 mm com X, Y e Z gravados: meça com o paquímetro e ajuste fluxo e dimensões.
lado = 20;
parte = "cubo";
fonte = "Poppins:style=Bold";
module letra(s) linear_extrude(0.8) text(s, size = lado * 0.45, font = fonte, halign = "center", valign = "center");
if (parte == "cubo") difference() {
  cube([lado, lado, lado]);
  translate([lado / 2, -0.01, lado / 2]) rotate([90, 0, 0]) mirror([0, 0, 1]) letra("X");   // frente: eixo X
  translate([lado + 0.01, lado / 2, lado / 2]) rotate([90, 0, 90]) mirror([0, 0, 1]) letra("Y");   // lado: eixo Y
  translate([lado / 2, lado / 2, lado - 0.79]) letra("Z");                                 // topo: eixo Z
}
