// Base da litofania — modelo próprio do Multiferramenta 3D
// tipo: "pe" (encaixe simples) ou "luminaria" (encaixe + espaço pra velinha de LED atrás da foto)
formato = "plana";      // plana | curva | cilindro
tipo = "pe";
largura = 106;          // largura TOTAL da placa (com moldura)
esp = 3;                // espessura máxima da placa
raio = 48;              // raio da curva (litofania curva)
encaixe = 6;            // profundidade da ranhura
folga = 0.4;            // folga de cada lado da ranhura
vela = 40;              // diâmetro do espaço da velinha de LED
parte = "base";
$fn = 96;

alt = encaixe + 3;
fenda = esp + 2 * folga;

module plana() {
  prof = tipo == "luminaria" ? 70 : 26;
  y_fenda = tipo == "luminaria" ? -prof / 2 + 12 : 0;       // na luminária a placa fica na frente, a luz atrás
  difference() {
    translate([0, 0, 0]) linear_extrude(alt) offset(r = 5) square([largura + 12 - 10, prof - 10], center = true);
    translate([-(largura + 2 * folga) / 2, y_fenda - fenda / 2, 3]) cube([largura + 2 * folga, fenda, encaixe + 1]);
    if (tipo == "luminaria") translate([0, y_fenda + fenda / 2 + 4 + vela / 2, alt - 4]) cylinder(d = vela + 1, h = 5);
  }
}

module curva() {
  ang = largura / raio * 180 / PI;                           // arco total da placa
  c = [0, raio];                                             // centro da curva (onde fica a luz)
  difference() {
    linear_extrude(alt) hull() {
      translate(c) rotate(-90 - ang / 2 - 4) circle_sector(raio + esp + 8, ang + 8);
      translate(c) circle(d = (tipo == "luminaria" ? vela + 16 : 20));
    }
    // ranhura em arco: mesmo raio da placa
    translate([c[0], c[1], 3]) rotate([0, 0, -90 - ang / 2 - 1]) rotate_extrude(angle = ang + 2)
      translate([raio - folga, 0]) square([fenda, encaixe + 1]);
    if (tipo == "luminaria") translate([c[0], c[1], alt - 4]) cylinder(d = vela + 1, h = 5);
  }
}
// cilindro 360°: ranhura redonda inteira, velinha no centro e saída pro fio (luminária)
module cilindro() difference() {
  linear_extrude(alt) circle(r = raio + esp + 7);
  translate([0, 0, 3]) rotate_extrude() translate([raio - folga, 0]) square([fenda, encaixe + 1]);
  if (tipo == "luminaria") {
    translate([0, 0, alt - 4]) cylinder(d = min(vela + 1, 2 * raio - 4), h = 5);
    translate([0, 0, alt - 4]) rotate([0, 0, -90]) translate([0, -3, 0]) cube([raio + esp + 10, 6, 5]);   // canal pro fio, se for LED com cabo
  }
}
module circle_sector(r, a) polygon(concat([[0, 0]], [for (t = [0 : a / 48 : a]) [r * cos(t), r * sin(t)]]));

if (parte == "base") { if (formato == "cilindro") cilindro(); else if (formato == "curva") curva(); else plana(); }
