// Letreiro LED com letras ocas — modelo próprio do Multiferramenta 3D
// Partes: "corpo" (canal onde vai a fita de LED) e "tampa" (difusor translúcido)
texto = "Nome"; fonte = "Courgette"; tamanho = 60;
profundidade = 20;   // altura da parede (mm)
parede = 1.6;        // espessura da parede
fundo = 1.2;         // espessura do fundo
canal = 4;           // quanto o traço da letra é engrossado pra caber o LED
folga = 0.3;         // folga de encaixe da tampa
tampa_esp = 1.2;     // espessura da tampa difusora
unir = true;         // une letras próximas numa peça só
parte = "corpo";
$fn = 40;

module letras() text(texto, font = fonte, size = tamanho, halign = "center", valign = "center");
module interno() offset(r = canal) letras();
module externo() if (unir) offset(r = -3) offset(r = 3) offset(r = parede) interno(); else offset(r = parede) interno();

module corpo() difference() {
  linear_extrude(profundidade) externo();
  translate([0, 0, fundo]) linear_extrude(profundidade) interno();
}
module tampa() linear_extrude(tampa_esp) offset(delta = -folga) interno();

if (parte == "corpo") corpo();
else if (parte == "tampa") tampa();
