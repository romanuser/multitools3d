// Placa de Wi-Fi com QR Code — modelo próprio do Multiferramenta 3D
// Partes: "placa" e "detalhes" (QR e textos em outra cor)
titulo = "Wi-Fi"; rede = "MinhaRede"; senha = "12345678"; mostrar_senha = true;
fonte = "Poppins:style=Bold";
largura = 100; altura = 150; esp = 3; relevo = 1; margem = 8; raio = 6;
qr = ["1"];
parte = "placa";
$fn = 48;

n = len(qr); lado = largura - 2 * margem; mod = lado / n;
topo_qr = altura / 2 - margem - 18;
module placa() linear_extrude(esp) offset(r = raio) offset(delta = -raio) square([largura, altura], center = true);
module qrcode() translate([-lado / 2, topo_qr - lado]) for (y = [0 : n - 1]) for (x = [0 : n - 1])
  if (qr[y][x] == "1") translate([x * mod, (n - 1 - y) * mod]) square([mod + 0.01, mod + 0.01]);
module linha(t, y, s) translate([0, y]) resize([min(largura - 2 * margem, len(t) * s * 0.75), 0], auto = true) text(t, font = fonte, size = s, halign = "center", valign = "center");
module textos() {
  translate([0, altura / 2 - margem - 7]) text(titulo, font = fonte, size = 10, halign = "center", valign = "center");
  linha(str("Rede: ", rede), topo_qr - lado - 8, 5);
  if (mostrar_senha) linha(str("Senha: ", senha), topo_qr - lado - 16, 5);
}
if (parte == "placa") placa();
else if (parte == "detalhes") translate([0, 0, esp]) linear_extrude(relevo) { qrcode(); textos(); }
