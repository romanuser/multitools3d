// Motor do Criador 3D: roda o OpenSCAD fora da tela principal (não trava a página).
// O motor (11 MB) vem do jsDelivr, que tem servidores no Brasil e é bem mais rápido;
// se falhar, usa a cópia local do próprio site.
const CDN = "https://cdn.jsdelivr.net/npm/openscad-wasm-prebuilt@1.2.0/dist/openscad.js";
let motor = null;
function carregarMotor() {
  motor ??= import(CDN).catch(() => import("./vendor/openscad.js"));
  return motor;
}
carregarMotor();   // já começa a baixar enquanto a pessoa escolhe o modelo

const fontCache = new Map();   // nome do arquivo -> bytes (baixa cada fonte uma vez)
const lit = (v) => Array.isArray(v) ? `[${v.map(lit).join(",")}]` : typeof v === "string" ? JSON.stringify(v) : String(v);

async function font(file) {
  if (!fontCache.has(file)) fontCache.set(file, new Uint8Array(await (await fetch(`fonts/${file}`)).arrayBuffer()));
  return fontCache.get(file);
}

self.onmessage = async ({ data }) => {
  const { id, modelo, params, partes, fontes, arquivos = [] } = data;   // arquivos: [{ nome, dados }] (ex.: a placa da litofania)
  try {
    const src = await (await fetch(`modelos/${modelo}.scad`)).text();
    const files = await Promise.all(fontes.map(async (f) => [f, await font(f)]));
    const out = [];
    for (const parte of partes) {
      // uma "sessão" nova por parte: o OpenSCAD não aceita duas gerações na mesma
      const logs = [];
      const { createOpenSCAD } = await carregarMotor();
      const inst = (await createOpenSCAD({ print: (s) => logs.push(s), printErr: (s) => logs.push(s) })).getInstance();
      try { inst.FS.mkdir("/fonts"); } catch { /* já existe */ }
      let uses = "";
      for (const [f, bytes] of files) { inst.FS.writeFile(`/fonts/${f}`, bytes); uses += `use </fonts/${f}>\n`; }
      for (const a of arquivos) inst.FS.writeFile("/" + a.nome, new Uint8Array(a.dados));
      inst.FS.writeFile("/m.scad", uses + src);
      const defs = Object.entries({ ...params, parte }).flatMap(([k, v]) => ["-D", `${k}=${lit(v)}`]);
      const t = performance.now();
      const rc = inst.callMain(["/m.scad", ...defs, "--enable=textmetrics", "--backend=manifold", "--export-format=binstl", "-o", "/o.stl"]);
      let bytes = null;
      try { bytes = inst.FS.readFile("/o.stl"); } catch { /* sem saída */ }
      const erros = logs.filter((l) => /ERROR|WARNING/.test(l) && !/Fontconfig|localization/.test(l));
      if (rc !== 0 || !bytes || bytes.length < 84) throw new Error(erros[0] || `Não consegui gerar a parte "${parte}".`);
      out.push({ parte, stl: bytes.buffer, ms: Math.round(performance.now() - t) });
      self.postMessage({ id, progresso: parte });
    }
    self.postMessage({ id, ok: true, partes: out }, out.map((p) => p.stl));
  } catch (e) {
    self.postMessage({ id, ok: false, erro: e?.message || String(e) });
  }
};
