// Exportação: STL binário e 3MF (peça com partes separadas, pronta pra multicor/AMS).

// Lê os triângulos de um STL binário -> Float32Array [x,y,z, x,y,z, x,y,z, ...]
export function stlTriangles(buf) {
  const dv = new DataView(buf); const n = dv.getUint32(80, true); const out = new Float32Array(n * 9);
  for (let i = 0; i < n; i++) { const o = 84 + i * 50 + 12; for (let k = 0; k < 9; k++) out[i * 9 + k] = dv.getFloat32(o + k * 4, true); }
  return out;
}

// --- ZIP sem compressão (o 3MF é um ZIP) ---
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(files) {   // files: [{ name, data: Uint8Array }]
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name); const crc = crc32(f.data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true);
    h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
    c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const size = central.reduce((s, p) => s + p.length, 0);
  const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, size, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: "model/3mf" });
}

// partes: [{ nome, cor:"#rrggbb", tri: Float32Array, dy: deslocamento Y, solta: impressa separada }]
// As partes "juntas" viram UMA peça com várias partes (multicor); as "soltas" viram peças próprias.
export function make3mf(partes) {
  const fmt = (v) => (Math.round(v * 1000) / 1000).toString();
  let objs = ""; let id = 1; const ids = [];
  const mats = partes.map((p) => `<base name="${p.nome}" displaycolor="${p.cor.toUpperCase()}FF"/>`).join("");
  partes.forEach((p, idx) => {
    const map = new Map(); const verts = []; const tris = [];
    const key = (x, y, z) => `${fmt(x)},${fmt(y)},${fmt(z)}`;
    for (let i = 0; i < p.tri.length; i += 9) {
      const t = [];
      for (let k = 0; k < 3; k++) {
        const x = p.tri[i + k * 3], y = p.tri[i + k * 3 + 1] + (p.dy || 0), z = p.tri[i + k * 3 + 2]; const kk = key(x, y, z);
        if (!map.has(kk)) { map.set(kk, verts.length); verts.push(`<vertex x="${fmt(x)}" y="${fmt(y)}" z="${fmt(z)}"/>`); }
        t.push(map.get(kk));
      }
      if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) tris.push(`<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`);
    }
    objs += `<object id="${id}" name="${p.nome}" type="model" pid="100" pindex="${idx}"><mesh><vertices>${verts.join("")}</vertices><triangles>${tris.join("")}</triangles></mesh></object>`;
    ids.push(id++);
  });
  const juntas = ids.filter((_, k) => !partes[k].solta), soltas = ids.filter((_, k) => partes[k].solta);
  let build = soltas.map((i) => `<item objectid="${i}"/>`).join("");
  if (juntas.length === 1) build = `<item objectid="${juntas[0]}"/>` + build;
  else if (juntas.length > 1) { objs += `<object id="${id}" name="Peça" type="model"><components>${juntas.map((i) => `<component objectid="${i}"/>`).join("")}</components></object>`; build = `<item objectid="${id}"/>` + build; }
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="pt-BR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Application">Multiferramenta 3D — Criador 3D</metadata>
<resources><basematerials id="100">${mats}</basematerials>${objs}</resources><build>${build}</build></model>`;
  const enc = new TextEncoder();
  return zip([
    { name: "[Content_Types].xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`) },
    { name: "_rels/.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`) },
    { name: "3D/3dmodel.model", data: enc.encode(model) },
  ]);
}
