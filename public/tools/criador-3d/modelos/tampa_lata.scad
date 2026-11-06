// Tampa GIRATÓRIA de lata, POR DENTRO da borda — modelo próprio do Multiferramenta 3D
// A borda da lata fica livre: você bebe direto no metal, como sem tampa.
// O disco fica rebaixado dentro do topo da lata, preso por atrito numa saia curta (com fendas), e GIRA:
//  janela em cima da boca da lata = aberto; meia volta = fechado.
// Impressa com o topo na mesa: sem suporte.
diam_interno = 49.5;   // diâmetro POR DENTRO da borda, no topo da lata
aperto = 0.3;          // quanto a saia é maior que o furo (prende por atrito; as fendas cedem)
profundidade = 6.0;    // do topo da borda até o fundo rebaixado da lata
rebaixo = 0.8;         // o disco fica isso abaixo da borda (a boca encosta só na lata)
abertura = 80;         // tamanho da janela (graus)
texto = ""; fonte = "Poppins:style=Bold"; texto_tam = 5;
teste = false;         // só a saia + um anel fino, pra conferir o encaixe
parte = "tampa";
$fn = 128;

placa = 1.4;                                   // espessura do disco
R = diam_interno / 2 - 0.3;                    // disco (um pouco menor que o furo)
saia_r = diam_interno / 2 + aperto / 2;        // raio externo da saia (aperta na parede)
saia_e = 1.2;                                  // espessura da saia
saia_h = min(3.0, profundidade - rebaixo - placa - 1.6);   // não encosta no fundo (nem na argolinha da lata)

// janela: "meia-lua" perto da borda, do lado da boca da lata
module janela2d() intersection() {
  difference() { circle(r = R - 1.6); circle(r = R - 12); }
  polygon([[0, 0], for (a = [90 - abertura / 2 : 4 : 90 + abertura / 2]) [2 * R * cos(a), 2 * R * sin(a)], [2 * R * cos(90 + abertura / 2), 2 * R * sin(90 + abertura / 2)]]);
}
module disco() difference() {
  cylinder(r = R, h = placa);
  translate([0, 0, -1]) linear_extrude(placa + 2) janela2d();
  // sulcos pra girar com a ponta do dedo (rebaixados: nada sai acima da borda)
  for (a = [-35, 0, 35]) rotate(a + 180) translate([0, 9, -0.01]) linear_extrude(0.7) offset(r = 1.2) square([0.01, 12], center = true);
  // setinha apontando a janela
  translate([0, R - 15.5, -0.01]) linear_extrude(0.5) mirror([1, 0, 0]) polygon([[-3, 0], [3, 0], [0, 4]]);
  if (len(texto) > 0) translate([0, -R + 10, -0.01]) linear_extrude(0.5) mirror([1, 0, 0])
    text(texto, size = texto_tam, font = fonte, halign = "center", valign = "center");
}
// saia: anel curto com fendas (flexiona pra entrar e prende por atrito)
module saia() translate([0, 0, placa - 0.01]) difference() {
  union() {
    cylinder(r = saia_r, h = saia_h + 0.01);
  }
  translate([0, 0, -1]) cylinder(r = saia_r - saia_e, h = saia_h + 2);
  for (a = [0 : 45 : 359]) rotate(a + 22.5) translate([saia_r - saia_e - 1, -0.6, 0.8]) cube([saia_e + 2, 1.2, saia_h + 1]);
  // chanfro de entrada
  translate([0, 0, saia_h - 0.8]) difference() { cylinder(r = saia_r + 1, h = 1.81); cylinder(r1 = saia_r, r2 = saia_r - 0.8, h = 1.81); }
}
module anel_teste() union() {
  difference() { cylinder(r = R, h = placa); translate([0, 0, -1]) cylinder(r = R - 5, h = placa + 2); }
  saia();
  translate([0, -(R - 2.5), placa - 0.01]) linear_extrude(0.6) text(str(diam_interno), size = 2.6, font = fonte, halign = "center", valign = "center");
}

if (parte == "tampa") { if (teste) anel_teste(); else union() { disco(); saia(); } }
