// Placa "Pague com Pix" — modelo próprio do Multiferramenta 3D
// formato: vertical (parede) | balcao (com pé inclinado, peça separada) | compacta (quadrada, pra colar)
// Partes: "placa", "detalhes" (QR, textos e moldura — outra cor) e "pe" (só no balcão)
titulo = "PAGUE COM PIX"; chave = "suachave@email.com"; recebedor = ""; valor = ""; instrucao = true;
fonte = "Poppins:style=Bold"; formato = "vertical";
largura = 100; esp = 3; relevo = 1; raio = 6;
qr = ["1"];
parte = "placa";
$fn = 48;

compacta = formato == "compacta";
margem = 8; n = len(qr);
lado = largura - 2 * margem - (compacta ? 6 : 0);
mod = lado / n;
// alturas das faixas de texto (de cima pra baixo)
h_tit = 9; h_inst = instrucao ? 6 : 0; h_ch = compacta ? 0 : 13; h_rec = (!compacta && len(recebedor) > 0) ? 7 : 0; h_val = (!compacta && len(valor) > 0) ? 9 : 0;
altura = compacta ? largura + 16 : margem + h_tit + 4 + h_inst + lado + 4 + h_val + h_rec + h_ch + margem;
topo = altura / 2 - margem;
y_qr_topo = topo - h_tit - 4 - h_inst;
module contorno() offset(r = raio) offset(delta = -raio) square([largura, altura], center = true);
module linha(t, y, s, wmax) if (len(t) > 0) translate([0, y]) resize([min(wmax, len(t) * s * 0.78), 0], auto = true) text(t, font = fonte, size = s, halign = "center", valign = "center");
module qrcode() translate([-lado / 2, y_qr_topo - lado]) for (y = [0 : n - 1]) for (x = [0 : n - 1])
  if (qr[y][x] == "1") translate([x * mod, (n - 1 - y) * mod]) square([mod + 0.01, mod + 0.01]);
module detalhes() {
  linha(titulo, topo - h_tit / 2, 8, largura - 2 * margem);
  if (instrucao) linha("Aponte a câmera do celular", topo - h_tit - 2 - h_inst / 2, 3.6, largura - 2 * margem);
  qrcode();
  yb = y_qr_topo - lado - 4;
  if (h_val > 0) linha(valor, yb - h_val / 2, 7, largura - 2 * margem);
  if (h_rec > 0) linha(str("Para: ", recebedor), yb - h_val - h_rec / 2, 4, largura - 2 * margem);
  if (h_ch > 0) { linha("Chave Pix", yb - h_val - h_rec - 3.5, 3.2, largura - 2 * margem); linha(chave, yb - h_val - h_rec - 9, 4.2, largura - 2 * margem); }
  difference() { contorno(); offset(delta = -2) contorno(); }          // moldura
}
// pé do balcão: bloco com ranhura inclinada 15° (a placa fica levemente deitada pra trás)
ang = 15; folga = 0.4; encaixe = 8;
module pe() difference() {
  hull() { translate([-largura * 0.4, -18, 0]) cube([largura * 0.8, 36, 4]); translate([-largura * 0.36, -10, 0]) cube([largura * 0.72, 20, encaixe + 4]); }
  // ranhura atravessa o pé de ponta a ponta: a placa (mais larga que o pé) encaixa e sobra dos lados
  translate([0, 0, 4]) rotate([-ang, 0, 0]) translate([-(largura + 20) / 2, -(esp + 2 * folga) / 2, 0]) cube([largura + 20, esp + 2 * folga, 40]);
}
if (parte == "placa") linear_extrude(esp) contorno();
else if (parte == "detalhes") translate([0, 0, esp]) linear_extrude(relevo) detalhes();
else if (parte == "pe" && formato == "balcao") pe();
echo(ALTURA = altura, MODULO = mod);
