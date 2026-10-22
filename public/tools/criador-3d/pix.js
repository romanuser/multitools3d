// BR Code (Pix estático) — padrão EMV do Banco Central
const f = (id, v) => id + String(v.length).padStart(2, "0") + v;
export function crc16(s) {                       // CRC16-CCITT (0x1021, inicial 0xFFFF)
  let c = 0xffff;
  for (const ch of new TextEncoder().encode(s)) { c ^= ch << 8; for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff; }
  return c.toString(16).toUpperCase().padStart(4, "0");
}
const limpa = (s, n) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .\-@]/g, "").trim().slice(0, n).toUpperCase();
export function pixPayload({ chave, nome, cidade, valor, txid = "***" }) {
  const conta = f("00", "br.gov.bcb.pix") + f("01", chave.trim());
  let p = f("00", "01") + f("26", conta) + f("52", "0000") + f("53", "986");
  if (valor && Number(valor) > 0) p += f("54", Number(valor).toFixed(2));
  p += f("58", "BR") + f("59", limpa(nome || "LOJA", 25)) + f("60", limpa(cidade || "BRASIL", 15)) + f("62", f("05", txid));
  p += "6304"; return p + crc16(p);
}
