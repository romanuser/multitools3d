// Cortador de biscoito / massinha com logo — modelo próprio do Multiferramenta 3D
// Parte: "cortador". Usa só a silhueta externa do desenho.
silhueta = []; lw = 60; lh = 60;
altura = 14; parede = 1.0; aba = 3; aba_esp = 1.6; unir = 2;
parte = "cortador";
$fn = 40;

module s() offset(r = -unir) offset(r = unir) for (p = silhueta) polygon(points = p[0], paths = p[1]);
if (parte == "cortador") {
  linear_extrude(altura) difference() { offset(r = parede) s(); s(); }                 // lâmina
  linear_extrude(aba_esp) difference() { offset(r = parede + aba) s(); s(); }          // aba de apoio (fica pra baixo na impressão)
}
