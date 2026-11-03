// Tampa giratória para lata (473, 350 e 269 ml — mesma boca) — modelo próprio do Multiferramenta 3D
// Peças: "anel" (encaixa na borda da lata) e o disco giratório: "disco" (cor 1) + "disco_detalhes" (cor 2, emblema ou texto).
// O anel e o disco são impressos DE CABEÇA PRA BAIXO (face de cima na mesa): saem lisos e sem suporte.
// Padrões medidos em lata real (testados na impressão: encaixe firme, com clique)
diam_borda = 54.8;     // diâmetro da borda (recravação) da lata
folga = 0.2;           // folga de cada lado no alojamento da borda
trava = 1.1;           // quanto a trava entra por baixo da borda
altura_borda = 2.9;    // altura da borda da lata (alojamento)
parede = 2.4;          // parede da saia
centro = "logo";       // logo | texto | nada
texto = "MEU TIME"; fonte = "Poppins:style=Bold"; texto_tam = 6;
logo = []; lw = 60; lh = 60;
teste = false;         // anel de teste: só o encaixe (imprime em minutos) pra acertar a medida
parte = "anel";
$fn = 128;

placa = 1.4;                            // espessura do topo do anel e do disco
Dh = diam_borda + 2 * folga;            // alojamento da borda
De = Dh + 2 * parede;                   // diâmetro externo do anel (60 mm no padrão)
r_trava = diam_borda / 2 - trava;
saia = altura_borda + 2.6;              // alojamento + trava (+0,4 acima da trava: sem faces coincidentes)
BOCA = [0, 15.5];                       // centro da abertura (lado da boca da lata)
module boca2d() translate(BOCA) hull() { translate([-5, 0]) circle(d = 13); translate([5, 0]) circle(d = 13); }
Dd = De - 4;                            // disco giratório
furo_pino = 6.2;

// ---------- anel (impresso com o topo na mesa; a saia sobe) ----------
module anel() difference() {
  union() {
    // topo + saia num bloco só (sem faces encostadas)
    difference() { cylinder(d = De, h = placa + saia); translate([0, 0, placa]) cylinder(d = Dh, h = saia + 1); }
    // trava: "dente" interno com rampa dos dois lados (entra e trava); começa dentro da parede
    translate([0, 0, placa + altura_borda]) rotate_extrude()
      polygon([[Dh / 2 + 1, 0], [Dh / 2, 0], [r_trava, 1.0], [r_trava, 1.4], [Dh / 2, 2.2], [Dh / 2 + 1, 2.2]]);
  }
  translate([0, 0, -1]) cylinder(d = furo_pino, h = placa + 2);
  translate([0, 0, -1]) linear_extrude(placa + 2) boca2d();
  // fendas na saia pra trava flexionar
  for (a = [22.5 : 45 : 359]) rotate(a) translate([De / 2 - 4, -0.6, placa + 1]) cube([6, 1.2, saia + 1]);
}

// ---------- disco giratório (impresso com a face de cima na mesa: o desenho vai espelhado) ----------
module desenho2d() mirror([1, 0, 0]) translate([0, -8.5]) {
  if (centro == "logo" && len(logo) > 0) let (k = 26 / max(lw, lh)) scale([k, k]) for (p = logo) polygon(points = p[0], paths = p[1]);
  else if (centro == "texto" && len(texto) > 0)
    resize([min(Dd - 14, len(texto) * texto_tam * 0.8), 0], auto = true) text(texto, size = texto_tam, font = fonte, halign = "center", valign = "center");
}
module disco_inteiro() difference() {
  union() {
    cylinder(d = Dd, h = placa);
    translate([0, -Dd / 2 - 2.5, 0]) linear_extrude(placa) offset(r = 2) square([10, 5], center = true);   // pegador pra girar
    // pino de pressão (passa pelo furo do anel e trava por baixo)
    translate([0, 0, placa]) cylinder(d = 5.8, h = placa + 0.4);
    translate([0, 0, 2 * placa + 0.4]) cylinder(d1 = 7.0, d2 = 5.2, h = 1.8);
  }
  translate([0, 0, placa + 0.6]) cube([1.4, 9, 10], center = true);     // fenda: o pino aperta pra entrar
  translate([0, 0, -1]) linear_extrude(placa + 2) mirror([1, 0, 0]) boca2d();
}
module detalhes() intersection() {
  translate([0, 0, -0.01]) linear_extrude(0.61) difference() { desenho2d(); mirror([1, 0, 0]) boca2d(); }
  cylinder(d = Dd - 2, h = 1);
}

// anel de teste: o mesmo encaixe, mas o topo vira só uma aba de 4 mm (sem furo, sem boca) + a medida gravada
module anel_teste() difference() {
  union() {
    difference() { cylinder(d = De, h = placa + saia); translate([0, 0, -1]) cylinder(d = Dh - 8, h = placa + 2); translate([0, 0, placa]) cylinder(d = Dh, h = saia + 1); }
    translate([0, 0, placa + altura_borda]) rotate_extrude()
      polygon([[Dh / 2 + 1, 0], [Dh / 2, 0], [r_trava, 1.0], [r_trava, 1.4], [Dh / 2, 2.2], [Dh / 2 + 1, 2.2]]);
  }
  for (a = [22.5 : 45 : 359]) rotate(a) translate([De / 2 - 4, -0.6, placa + 1]) cube([6, 1.2, saia + 1]);
  // medida gravada embaixo da aba (lado da mesa), pra não confundir os testes
  translate([0, -(Dh / 2 - 2), -0.01]) linear_extrude(0.6) mirror([1, 0, 0]) text(str(diam_borda), size = 2.6, font = fonte, halign = "center", valign = "center");
}

if (parte == "anel") { if (teste) anel_teste(); else anel(); }
else if (parte == "disco") difference() { disco_inteiro(); detalhes(); }
else if (parte == "disco_detalhes") detalhes();
