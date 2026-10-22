// Placa "Pague com Pix" com QR Code — modelo próprio do Multiferramenta 3D
// Partes: "placa" (fundo) e "detalhes" (QR, textos — outra cor)
titulo = "PAGUE COM PIX"; chave = "suachave@email.com"; fonte = "Liberation Sans:style=Bold";
largura = 100; altura = 140; esp = 3; relevo = 1; margem = 8; raio = 6;
qr = ["1"];          // linhas do QR Code (vem do criador)
parte = "placa";
$fn = 48;

n = len(qr); lado = largura - 2 * margem; mod = lado / n;
topo_qr = altura / 2 - margem - 18;

module placa() linear_extrude(esp) offset(r = raio) offset(delta = -raio) square([largura, altura], center = true);
module qrcode() translate([-lado / 2, topo_qr - lado]) for (y = [0 : n - 1]) for (x = [0 : n - 1])
  if (qr[y][x] == "1") translate([x * mod, (n - 1 - y) * mod]) square([mod + 0.01, mod + 0.01]);
module textos() {
  translate([0, altura / 2 - margem - 7]) text(titulo, font = fonte, size = 9, halign = "center", valign = "center");
  translate([0, topo_qr - lado - 9]) resize([min(largura - 2 * margem, len(chave) * 4.2), 0], auto = true) text(chave, font = fonte, size = 5, halign = "center", valign = "center");
}
module detalhes() translate([0, 0, esp]) linear_extrude(relevo) { qrcode(); textos(); }

if (parte == "placa") placa();
else if (parte == "detalhes") detalhes();
