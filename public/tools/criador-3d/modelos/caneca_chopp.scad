// Caneca de chopp com alça, faixas com texto e emblema — modelo próprio do Multiferramenta 3D
// Pra BEBER DIRETO: borda da boca lisa e arredondada, interior liso, fundo grosso.
// Peças: "principal" (cor 1) e "faixas" (cor 2) formam a caneca multicor;
//        "emblema_base" (cor 1) + "emblema_detalhes" (cor 2) formam o emblema, impresso deitado e moldado na caneca.
capacidade = 500;          // ml (até a linha da espuma)
diametro_interno = 78;     // diâmetro por dentro
espuma = 15;               // folga acima do líquido (colarinho)
boca = 12;                 // faixa lisa no topo, onde a boca encosta (sem faixa, texto ou textura)
parede = 3.2; fundo = 6;
alca = true;
fonte = "Poppins:style=Bold";
texto_tam = 7;             // altura das letras nas faixas
relevo_texto = 0.8;        // quanto a escrita sai da faixa (relevo na mesma cor)
faixa_alt = 12;            // altura de cada faixa
faixas_baixo = 3;          // quantas faixas embaixo (0 a 3)
borda = true;              // faixa na borda de cima
// cor de cada faixa: 1 = cor principal, 2 = cor das faixas (o texto sai na outra cor)
cor_borda = 2; cor_f1 = 2; cor_f2 = 1; cor_f3 = 2;
borda_frente = "SEU TIME"; borda_verso = "DESDE 1921";
f1_frente = "AQUI É"; f2_frente = "SÓ"; f3_frente = "PAIXÃO";
f1_verso = "MAIOR"; f2_verso = "DO"; f3_verso = "MUNDO";
textura = true; textura_tam = 18;
textura_emblema = true;    // textura também atrás do emblema (copo inteiro)
escada = 0.8;              // cada faixa de baixo sai isso a mais que a de cima ("escada"; o pé fica em destaque)
emblema_d = 69;            // diâmetro do emblema
logo = []; lw = 60; lh = 60;   // emblema vetorizado (desenho escuro = cor 2)
silhueta = [];             // contorno de fora do escudo (mesma escala do desenho)
formato_emblema = "contorno";   // contorno (o da imagem) | redondo | escudo | escudo_reto | oval
borda_emblema = 1.5;       // aro da base em volta do desenho
parte = "principal";
$fn = 160;

Ri = diametro_interno / 2;
R = Ri + parede;
altura = fundo + capacidade * 1000 / (PI * Ri * Ri) + espuma;   // altura calculada pela capacidade
PROF = 0.8; SAI = 1.0;                 // faixa: entra 0,8 mm na parede e sai 1 mm
FRENTE = 0; VERSO = 180; ALCA_ANG = 90;

// z (base) de cada faixa: f1 é a de cima do grupo de baixo
nb = max(0, min(3, faixas_baixo));
function z_f(k) = (nb - k) * faixa_alt;            // k = 1, 2, 3
faixas = concat(
  [for (k = [1 : 3]) if (k <= nb) [z_f(k), [cor_f1, cor_f2, cor_f3][k - 1], [f1_frente, f2_frente, f3_frente][k - 1], [f1_verso, f2_verso, f3_verso][k - 1], SAI + (k - 1) * escada]],
  borda ? [[altura - boca - faixa_alt, cor_borda, borda_frente, borda_verso, SAI]] : []    // logo abaixo da boca lisa
);
z_meio0 = nb * faixa_alt; z_meio1 = borda ? altura - boca - faixa_alt : altura - boca;   // faixa livre do corpo

module anel(z, r0, r1, h) translate([0, 0, z]) difference() { cylinder(r = r1, h = h); translate([0, 0, -1]) cylinder(r = r0, h = h + 2); }

// --- texto curvado em volta do copo (cada letra no ângulo certo, pela largura real) ---
function adv(s) = [for (i = [0 : len(s) - 1]) textmetrics(s[i], size = texto_tam, font = fonte).advance[0]];
function acum(v, i) = i == 0 ? 0 : acum(v, i - 1) + v[i - 1];
module texto_curvo(s, a0, zc, sai = SAI) if (len(s) > 0) {
  a = adv(s); total = acum(a, len(s)) ;
  for (i = [0 : len(s) - 1]) if (s[i] != " ") {
    x = acum(a, i) + a[i] / 2 - total / 2;
    rotate([0, 0, a0 + x / R * 180 / PI]) translate([R - PROF - 0.5, 0, zc]) rotate([90, 0, 90])
      linear_extrude(PROF + sai + 2.5) text(s[i], size = texto_tam, font = fonte, halign = "center", valign = "center");
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
alca_t = 13; alca_w = 24; alca_d = 46;      // espessura, largura e quanto sai da caneca (cabe a mão: 4 dedos)
sobe_cima = 8; sobe_baixo = 10;             // inclinação dos braços
// caneca: a alça vai quase de ponta a ponta — de cima (logo abaixo da borda) até logo acima do pé.
// Onde ela cruza uma faixa colorida, aquele trecho sai na cor da faixa (cada camada continua com uma cor só).
alca_v1 = altura - 3 - sobe_cima;           // fixação de cima (o braço sobe até 3 mm abaixo da borda)
alca_v0 = (nb > 0 ? faixa_alt : fundo) + 3; // fixação de baixo: logo acima do pé
module alca2d() {                            // perfil de lado: u = pra fora do copo, v = altura
  A1 = [0, alca_v1 - alca_t / 2];   A2 = [alca_d - alca_t / 2, alca_v1 - alca_t / 2 + sobe_cima];
  B1 = [0, alca_v0 + alca_t / 2];   B2 = [alca_d - alca_t / 2, alca_v0 + alca_t / 2 + sobe_baixo];
  // pegada em curva suave pra fora (formato D): 6 trechos numa curva entre A2 e B2.
  // O contorno é "limpo" (fecha e abre 0,4 mm) pra o arredondamento 3D rodar rápido.
  M = [alca_d - alca_t / 2 + 10, (A2[1] + B2[1]) / 2];
  curva_d = [for (i = [0 : 6]) let (t = i / 6) (1 - t) * (1 - t) * A2 + 2 * (1 - t) * t * M + t * t * B2];
  offset(r = 0.4) offset(r = -0.4) union() {
    for (seg = [[A1, A2], [B2, B1]]) hull() for (q = seg) translate(q) circle(d = alca_t, $fn = 32);
    for (i = [0 : 5]) hull() { translate(curva_d[i]) circle(d = alca_t, $fn = 32); translate(curva_d[i + 1]) circle(d = alca_t, $fn = 32); }
  }
}
arred = 2.4;                                  // arredondamento das bordas da alça
// Alça em FATIAS: a do meio com o contorno inteiro e as das bordas encolhendo num quarto de círculo.
// Dá a borda arredondada só com operações simples (sem minkowski): rápido e estável em qualquer tamanho.
DEGRAUS = 4;
function recuo(k) = arred - sqrt(arred * arred - pow((k + 0.5) * arred / DEGRAUS, 2));
module alca3d() if (alca && alca_v1 - alca_v0 > 40) rotate([0, 0, ALCA_ANG]) translate([R - 3, 0, 0]) rotate([90, 0, 0]) {
  meio = alca_w / 2 - arred;
  union() {
    translate([0, 0, -meio]) linear_extrude(2 * meio) alca2d();
    for (k = [0 : DEGRAUS - 1]) for (lado = [-1, 1]) {
      z0 = meio + k * arred / DEGRAUS;
      translate([0, 0, lado > 0 ? z0 - 0.01 : -z0 - arred / DEGRAUS + 0.01]) linear_extrude(arred / DEGRAUS) offset(delta = -recuo(k)) alca2d();
    }
  }
}

// --- textura: símbolos pequenos em relevo (0,5 mm) no copo inteiro, acompanhando a curva ---
passo_ang = (textura_tam + 7) / R * 180 / PI;                       // espaço entre símbolos na volta
n_ang = max(4, floor(360 / passo_ang));
linhas = max(1, floor((z_meio1 - z_meio0 - 4) / (textura_tam + 6)));
z_emb = (z_meio0 + z_meio1) / 2;                                      // centro do emblema (frente)
function ang_dif(a, b) = abs(((a - b + 540) % 360) - 180);
function livre(a, zc) =
  (textura_emblema || norm([ang_dif(a, FRENTE) * PI / 180 * R, zc - z_emb]) > emblema_d / 2 + textura_tam / 2 + 2) &&
  // alça: só desvia dos dois pontos onde os braços encostam no copo (entre eles o copo aparece e leva símbolo)
  !(alca && ang_dif(a, ALCA_ANG) * PI / 180 * R < alca_w / 2 + textura_tam / 2 + 2 &&
    (abs(zc - (alca_v1 - alca_t / 2)) < alca_t / 2 + textura_tam / 2 + 2 || abs(zc - (alca_v0 + alca_t / 2)) < alca_t / 2 + textura_tam / 2 + 2));
module mini_logo() let (k = textura_tam / max(lw, lh)) scale([k, k]) for (p = logo) polygon(points = p[0], paths = p[1]);   // desenho já vem centralizado
module textura3d() if (textura && len(logo) > 0) intersection() {
  anel(z_meio0 + 2, R - 0.3, R + 0.5, z_meio1 - z_meio0 - 4);
  for (j = [0 : linhas - 1]) for (i = [0 : n_ang - 1])
    let (zc = z_meio0 + (z_meio1 - z_meio0) * (j + 0.5) / linhas, aa = (i + (j % 2) * 0.5) * 360 / n_ang)
      if (livre(aa, zc)) rotate([0, 0, aa]) translate([R - 2, 0, zc]) rotate([90, 0, 90]) linear_extrude(4) mini_logo();
}

// --- copo ---
// Pra imprimir RÁPIDO: cada faixa é de UMA cor só, de dentro até fora (a camada inteira tem uma cor),
// e a escrita sai em RELEVO na mesma cor da faixa. A impressora só troca de cor na divisa entre faixas.
RELEVO_TXT = relevo_texto;
// borda da boca arredondada (meio círculo de dentro até fora da parede)
module borda_boca() translate([0, 0, altura - parede / 2]) rotate_extrude() translate([(Ri + R) / 2, 0]) circle(d = parede, $fn = 32);
// interior: canto do fundo arredondado (limpa fácil, não acumula sujeira)
module cavidade() rotate_extrude() intersection() {
  translate([0, fundo]) offset(r = 5) offset(delta = -5) translate([-Ri, 0]) square([2 * Ri, altura + 20]);
  translate([0, fundo]) square([Ri + 1, altura + 20]);
}
module corpo_bruto() difference() {
  union() { cylinder(r = R, h = altura - parede / 2); borda_boca(); alca3d(); }
  cavidade();
}
// faixa inteira: da cavidade até a face de fora (a de baixo inclui o fundo)
module faixa_inteira(f) difference() {
  translate([0, 0, f[0]]) cylinder(r = R + f[4], h = faixa_alt);
  cavidade();
}
// escrita em relevo: 0,6 mm pra fora, entrando 0,3 mm na faixa (funde com ela)
module letras_relevo(f) intersection() { anel(f[0], R + f[4] - 0.3, R + f[4] + RELEVO_TXT, faixa_alt); letras(f); }
module zona(f) translate([0, 0, f[0]]) cylinder(r = R + alca_d + 20, h = faixa_alt);   // cobre a alça também

module principal() union() {
  difference() {
    union() { corpo_bruto(); textura3d(); }
    for (f = faixas) if (f[1] == 2) zona(f);                        // altura das faixas cor 2: é da outra peça
  }
  for (f = faixas) if (f[1] == 1) union() { faixa_inteira(f); letras_relevo(f); }
}
module faixas_cor2() union() {
  for (f = faixas) if (f[1] == 2) union() {
    faixa_inteira(f); letras_relevo(f);
    difference() { intersection() { alca3d(); zona(f); } cavidade(); }        // listra da alça na cor da faixa
  }
}

// --- emblema (deitado, separado) ---
// formato: o contorno da própria imagem (qualquer time) ou um formato genérico
contorno_ok = formato_emblema == "contorno" && len(silhueta) > 0;
k_emb = contorno_ok ? (emblema_d - 2 * borda_emblema) / max(lw, lh) : (emblema_d * 0.8) / max(lw, lh);
module poligonos(ps) for (p = ps) polygon(points = p[0], paths = p[1]);
module emblema_desenho() scale([k_emb, k_emb]) poligonos(logo);
// formatos genéricos (largura = emblema_d)
function curva(p0, p1, p2, n = 24) = [for (i = [0 : n]) let (t = i / n) (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2];
module formato2d(f) scale([emblema_d / 2, emblema_d / 2]) {
  if (f == "escudo")            // escudo pontudo
    polygon(concat([[-1, 1], [1, 1], [1, 0.2]], curva([1, 0.2], [0.95, -0.7], [0, -1.2]), curva([0, -1.2], [-0.95, -0.7], [-1, 0.2])));
  else if (f == "escudo_reto")  // topo reto, base arredondada
    union() { translate([-1, -0.1]) square([2, 1.1]); translate([0, -0.1]) scale([1, 1.05]) circle(1, $fn = 96); }
  else if (f == "oval") scale([0.86, 1.08]) circle(1, $fn = 96);
  else circle(1, $fn = 120);
}
module base2d() {
  if (contorno_ok) offset(r = borda_emblema) scale([k_emb, k_emb]) poligonos(silhueta);
  else formato2d(formato_emblema);
}

if (parte == "principal") principal();
else if (parte == "faixas") faixas_cor2();
else if (parte == "emblema_base") linear_extrude(0.8) base2d();
else if (parte == "emblema_detalhes") translate([0, 0, 0.8]) linear_extrude(0.6) intersection() { offset(r = -0.4) base2d(); emblema_desenho(); }
