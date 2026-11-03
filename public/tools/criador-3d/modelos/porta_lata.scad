// Porta-lata com alça, faixas com texto e emblema — modelo próprio do Multiferramenta 3D
// Peças: "principal" (cor 1) e "faixas" (cor 2) formam o copo multicor;
//        "emblema_base" (cor 1) + "emblema_detalhes" (cor 2) formam o emblema, impresso deitado e moldado no copo.
diametro_lata = 66.2;      // diâmetro da lata (mm)
altura = 150;              // altura do porta-lata (473 ml)
folga = 0.4;               // folga de cada lado (lata entra justa)
parede = 4.6; fundo = 2.4;
alca = true;
fonte = "Poppins:style=Bold";
texto_tam = 7;             // altura das letras nas faixas
faixa_alt = 12;            // altura de cada faixa
faixas_baixo = 3;          // quantas faixas embaixo (0 a 3)
borda = true;              // faixa na borda de cima
// cor de cada faixa: 1 = cor principal, 2 = cor das faixas (o texto sai na outra cor)
cor_borda = 2; cor_f1 = 2; cor_f2 = 1; cor_f3 = 2;
borda_frente = "SEU TIME"; borda_verso = "DESDE 1921";
f1_frente = "AQUI É"; f2_frente = "SÓ"; f3_frente = "PAIXÃO";
f1_verso = "MAIOR"; f2_verso = "DO"; f3_verso = "MUNDO";
textura = true; textura_tam = 18;
textura_emblema = false;   // textura também atrás do emblema (atrapalha a colagem)
escada = 0.8;              // cada faixa de baixo sai isso a mais que a de cima ("escada"; o pé fica em destaque)
emblema_d = 69;            // diâmetro do emblema
logo = []; lw = 60; lh = 60;   // emblema vetorizado (desenho escuro = cor 2)
parte = "principal";
$fn = 160;

Ri = (diametro_lata + 2 * folga) / 2;
R = Ri + parede;
PROF = 0.8; SAI = 1.0;                 // faixa: entra 0,8 mm na parede e sai 1 mm
FRENTE = 0; VERSO = 180; ALCA_ANG = 90;

// z (base) de cada faixa: f1 é a de cima do grupo de baixo
nb = max(0, min(3, faixas_baixo));
function z_f(k) = (nb - k) * faixa_alt;            // k = 1, 2, 3
faixas = concat(
  [for (k = [1 : 3]) if (k <= nb) [z_f(k), [cor_f1, cor_f2, cor_f3][k - 1], [f1_frente, f2_frente, f3_frente][k - 1], [f1_verso, f2_verso, f3_verso][k - 1], SAI + (k - 1) * escada]],
  borda ? [[altura - faixa_alt, cor_borda, borda_frente, borda_verso, SAI]] : []
);
z_meio0 = nb * faixa_alt; z_meio1 = borda ? altura - faixa_alt : altura;   // faixa livre do corpo

module anel(z, r0, r1, h) translate([0, 0, z]) difference() { cylinder(r = r1, h = h); translate([0, 0, -1]) cylinder(r = r0, h = h + 2); }

// --- texto curvado em volta do copo (cada letra no ângulo certo, pela largura real) ---
function adv(s) = [for (i = [0 : len(s) - 1]) textmetrics(s[i], size = texto_tam, font = fonte).advance[0]];
function acum(v, i) = i == 0 ? 0 : acum(v, i - 1) + v[i - 1];
module texto_curvo(s, a0, zc, sai = SAI) if (len(s) > 0) {
  a = adv(s); total = acum(a, len(s)) ;
  for (i = [0 : len(s) - 1]) if (s[i] != " ") {
    x = acum(a, i) + a[i] / 2 - total / 2;
    rotate([0, 0, a0 + x / R * 180 / PI]) translate([R - PROF - 0.5, 0, zc]) rotate([90, 0, 90])
      linear_extrude(PROF + sai + 1) text(s[i], size = texto_tam, font = fonte, halign = "center", valign = "center");
  }
}
// letras "brutas": passam além da faixa por dentro e por fora (pra recortar limpo)
module letras(f) union() { texto_curvo(f[2], FRENTE, f[0] + faixa_alt / 2, f[4]); texto_curvo(f[3], VERSO, f[0] + faixa_alt / 2, f[4]); }
// letra embutida: da parede (r0) até a face de fora da faixa
module letras_embutidas(f, r0) intersection() { anel(f[0], r0, R + f[4], faixa_alt); letras(f); }
module faixa_cheia(f) anel(f[0], R - PROF, R + f[4], faixa_alt);
// recorte das letras: passa além da face de fora (corta limpo, sem faces coincidentes)
module letras_recorte(f) intersection() { anel(f[0], R - PROF, R + f[4] + 1, faixa_alt); letras(f); }

// --- alça inclinada: braços sobem indo pra fora, tudo arredondado ---
// três barras (braço de cima, pegada, braço de baixo), cada uma = envoltório de 4 esferas (bordas redondas)
alca_t = 10; alca_w = 20; alca_d = 38;      // espessura, largura e quanto sai do copo
sobe_cima = 8; sobe_baixo = 10;             // inclinação dos braços
alca_v1 = z_meio1 - 2 - sobe_cima;          // fixação de cima (o braço sobe até z_meio1 - 2)
alca_v0 = z_meio0 + 3;                      // fixação de baixo
module alca2d() {                            // perfil de lado: u = pra fora do copo, v = altura
  A1 = [0, alca_v1 - alca_t / 2];   A2 = [alca_d - alca_t / 2, alca_v1 - alca_t / 2 + sobe_cima];
  B1 = [0, alca_v0 + alca_t / 2];   B2 = [alca_d - alca_t / 2, alca_v0 + alca_t / 2 + sobe_baixo];
  union() for (seg = [[A1, A2], [A2, B2], [B2, B1]]) hull() for (q = seg) translate(q) circle(d = alca_t, $fn = 40);
}
arred = 2.5;                                  // arredondamento das bordas da alça
module alca3d() if (alca && alca_v1 - alca_v0 > 40) rotate([0, 0, ALCA_ANG]) translate([R - 3, 0, 0]) rotate([90, 0, 0])
  minkowski() {
    linear_extrude(alca_w - 2 * arred, center = true) offset(delta = -arred) alca2d();
    sphere(r = arred, $fn = 16);
  }

// --- textura: símbolos pequenos em relevo (0,5 mm) no copo inteiro, acompanhando a curva ---
passo_ang = (textura_tam + 7) / R * 180 / PI;                       // espaço entre símbolos na volta
n_ang = max(4, floor(360 / passo_ang));
linhas = max(1, floor((z_meio1 - z_meio0 - 4) / (textura_tam + 6)));
z_emb = (z_meio0 + z_meio1) / 2;                                      // centro do emblema (frente)
function ang_dif(a, b) = abs(((a - b + 540) % 360) - 180);
function livre(a, zc) =
  (textura_emblema || norm([ang_dif(a, FRENTE) * PI / 180 * R, zc - z_emb]) > emblema_d / 2 + textura_tam / 2 + 2) &&
  !(alca && ang_dif(a, ALCA_ANG) * PI / 180 * R < alca_w / 2 + textura_tam / 2 + 3 && zc > alca_v0 - textura_tam && zc < alca_v1 + sobe_cima + textura_tam);
module mini_logo() let (k = textura_tam / max(lw, lh)) scale([k, k]) for (p = logo) polygon(points = p[0], paths = p[1]);   // desenho já vem centralizado
module textura3d() if (textura && len(logo) > 0) intersection() {
  anel(z_meio0 + 2, R - 0.3, R + 0.5, z_meio1 - z_meio0 - 4);
  for (j = [0 : linhas - 1]) for (i = [0 : n_ang - 1])
    let (zc = z_meio0 + (z_meio1 - z_meio0) * (j + 0.5) / linhas, aa = (i + (j % 2) * 0.5) * 360 / n_ang)
      if (livre(aa, zc)) rotate([0, 0, aa]) translate([R - 2, 0, zc]) rotate([90, 0, 90]) linear_extrude(4) mini_logo();
}

// --- copo ---
// Regra pra peça sair perfeita: o que é da MESMA cor se sobrepõe 0,2 mm (funde num corpo só);
// o que é de cores diferentes só encosta (cada cor é uma peça do 3MF).
module corpo_bruto() difference() {
  union() { cylinder(r = R, h = altura); alca3d(); }
  translate([0, 0, fundo]) cylinder(r = Ri, h = altura);
}
module principal() union() {
  difference() {
    union() {
      corpo_bruto();
      for (f = faixas) if (f[1] == 1) anel(f[0], R - 0.2, R + f[4], faixa_alt);         // faixa cor 1: sai da parede
      textura3d();
    }
    for (f = faixas) if (f[1] == 2) anel(f[0], R - PROF, R + f[4] + 1, faixa_alt);      // espaço das faixas cor 2
    for (f = faixas) if (f[1] == 1) letras_recorte(f);                                   // espaço das letras cor 2
  }
  for (f = faixas) if (f[1] == 2) letras_embutidas(f, R - PROF - 0.2);                  // letras cor 1 nas faixas cor 2
}
module faixas_cor2() union() {
  for (f = faixas) if (f[1] == 2) difference() { faixa_cheia(f); letras(f); }             // faixa cor 2 vazada nas letras
  for (f = faixas) if (f[1] == 1) letras_embutidas(f, R - PROF);                         // letras cor 2 nas faixas cor 1
}

// --- emblema (deitado, separado) ---
module emblema_desenho() let (k = (emblema_d * 0.97) / max(lw, lh)) scale([k, k]) for (p = logo) polygon(points = p[0], paths = p[1]);

if (parte == "principal") principal();
else if (parte == "faixas") faixas_cor2();
else if (parte == "emblema_base") linear_extrude(0.8) circle(d = emblema_d);
else if (parte == "emblema_detalhes") translate([0, 0, 0.8]) linear_extrude(0.6) intersection() { circle(d = emblema_d - 0.4); emblema_desenho(); }
