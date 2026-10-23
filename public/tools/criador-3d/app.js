import * as THREE from "./vendor/three.module.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { FONTES, MODELOS } from "./models.js";
import { stlTriangles, make3mf } from "./export3d.js";
import { pixPayload } from "./pix.js";
import { vetorizarLogo } from "./logo.js";
import { gerarLitofania, gerarCilindro, gerarLitofaniaForma } from "./litofania.js";

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, attrs); kids.forEach((k) => e.append(k)); return e; };

// ---------- visualização 3D ----------
const view = $("view");
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); view.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color("#0f0b1a");
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
scene.add(new THREE.HemisphereLight("#ffffff", "#2a2140", 1.6));
const sun = new THREE.DirectionalLight("#ffffff", 1.8); sun.position.set(1, -1.5, 2.5); scene.add(sun);
const grid = new THREE.GridHelper(400, 40, "#3b2f5e", "#241c3d"); grid.rotation.x = Math.PI / 2; scene.add(grid);
camera.up.set(0, 0, 1);
const grupo = new THREE.Group(); scene.add(grupo);
function resize() { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(view); resize();
(function loop() { controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop); })();

function enquadrar() {
  const box = new THREE.Box3().setFromObject(grupo); if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()); const r = Math.max(s.x, s.y, s.z);
  controls.target.copy(c); camera.position.set(c.x + r * 0.15, c.y - r * 1.25, c.z + r * 0.95); camera.near = r / 100; camera.far = r * 20; camera.updateProjectionMatrix();
  grid.position.set(c.x, c.y, 0);
}

// ---------- imagens enviadas (logo / foto) ----------
const imagens = {};   // por modo: { gray, alpha, w, h }
const EXEMPLO = { logo: "exemplos/logo-exemplo.png", foto: "exemplos/foto-exemplo.jpg" };
function carregarImagem(src, modo) {
  return new Promise((ok, erro) => {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => {
      const max = modo === "foto" ? 520 : 360; const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
      const c = el("canvas", { width: w, height: h }); const g = c.getContext("2d"); g.drawImage(im, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data; const gray = new Float32Array(w * h), alpha = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) { const a = d[i * 4 + 3] / 255; alpha[i] = a; gray[i] = a < 0.5 ? 1 : (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255; }
      imagens[modo] = { gray, alpha, w, h }; ok(imagens[modo]);
    };
    im.onerror = () => erro(new Error("Não consegui abrir essa imagem."));
    im.src = src;
  });
}
// prévia: logo em preto e branco (como vai ser recortado); foto em cinza
function desenharPrevia() {
  const c = document.getElementById("previa"); const campo = modelo.campos.find((x) => x.tipo === "imagem"); if (!c || !campo) return;
  const img = imagens[campo.modo]; const g = c.getContext("2d"); g.fillStyle = "#1f1836"; g.fillRect(0, 0, c.width, c.height); if (!img) return;
  const k = Math.min(c.width / img.w, c.height / img.h), w = Math.round(img.w * k), h = Math.round(img.h * k);
  const lim = Number(document.querySelector('[data-campo="limiar"]')?.value ?? 0.5), inv = document.querySelector('[data-campo="inverter"]')?.checked;
  const out = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = Math.min(img.h - 1, Math.floor(y / k)) * img.w + Math.min(img.w - 1, Math.floor(x / k)); let v;
    if (campo.modo === "foto") v = img.gray[i] * 255;
    else { const esc = img.alpha[i] < 0.5 ? 0 : (inv ? img.gray[i] : 1 - img.gray[i]); v = esc >= lim ? 20 : 245; }
    const o = (y * w + x) * 4; out.data[o] = out.data[o + 1] = out.data[o + 2] = v; out.data[o + 3] = 255;
  }
  g.putImageData(out, Math.round((c.width - w) / 2), Math.round((c.height - h) / 2));
}

// ---------- estado ----------
let modelo = MODELOS[0];
let resultado = null;          // [{ parte, nome, cor, tri, dy }]
const cores = {};              // cor escolhida por parte
const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
let pedido = 0;

let statusTimer = 0;
function status(msg, erro = false) { clearTimeout(statusTimer); const s = $("status"); s.textContent = msg; s.className = "status" + (erro ? " erro" : ""); s.style.display = msg ? "" : "none"; }

// ---------- lista de modelos e formulário ----------
function montarModelos() {
  $("modelos").replaceChildren(...MODELOS.map((m) => {
    const b = el("button", { type: "button", className: "modelo" }, el("span", { className: "ic", textContent: m.icone }), el("b", { textContent: m.nome }), el("small", { textContent: m.resumo }));
    b.setAttribute("aria-pressed", m === modelo); b.onclick = async () => {
      modelo = m; resultado = null; grupo.clear(); $("barra").replaceChildren(); montarModelos(); montarForm();
      const ci = m.campos.find((c) => c.tipo === "imagem");
      if (ci && !imagens[ci.modo]) { try { await carregarImagem(EXEMPLO[ci.modo], ci.modo); } catch { /* segue sem */ } }
      desenharPrevia(); gerar();
    };
    return b;
  }));
}

function campoUI(c) {
  const id = "f_" + c.id; const wrap = el("div", { className: "campo" });
  if (c.tipo === "imagem") {
    const arq = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/svg+xml", style: "padding:6px" });
    const ex = el("button", { type: "button", className: "btn2", textContent: "Usar exemplo", style: "font-size:12px;padding:6px 12px" });
    arq.onchange = async () => { const f = arq.files?.[0]; if (!f) return; try { await carregarImagem(URL.createObjectURL(f), c.modo); desenharPrevia(); gerar(); } catch (e) { status(e.message, true); } };
    ex.onclick = async () => { await carregarImagem(EXEMPLO[c.modo], c.modo); arq.value = ""; desenharPrevia(); gerar(); };
    wrap.append(el("label", { textContent: c.rotulo }),
      el("div", { className: "linha", style: "align-items:flex-start" }, el("canvas", { id: "previa", width: 96, height: 96, style: "border-radius:10px;border:1px solid var(--line);flex:none" }),
        el("div", { style: "display:flex;flex-direction:column;gap:6px;min-width:0" }, arq, ex)));
    if (c.dica) wrap.append(el("small", { textContent: c.dica }));
    return wrap;
  }
  if (c.tipo === "escolha") {
    const s = el("select", { id }); s.dataset.campo = c.id;
    c.opcoes.forEach(([v, r]) => s.append(el("option", { value: v, textContent: r, selected: v === c.padrao })));
    wrap.append(el("label", { htmlFor: id, textContent: c.rotulo }), s);
    if (c.dica) wrap.append(el("small", { textContent: c.dica }));
    return wrap;
  }
  if (c.tipo === "sim") {
    const i = el("input", { type: "checkbox", id, checked: c.padrao }); i.dataset.campo = c.id; if (c.id === "inverter") i.onchange = desenharPrevia; if (c.id === "previa_luz") i.onchange = () => resultado && desenhar();
    wrap.append(el("label", { className: "chk", htmlFor: id }, i, c.rotulo));
  } else if (c.tipo === "fonte") {
    const s = el("select", { id }); s.dataset.campo = c.id;
    FONTES.forEach((f) => s.append(el("option", { value: f.nome, textContent: `${f.nome} — ${f.tipo}`, selected: f.nome === c.padrao })));
    wrap.append(el("label", { htmlFor: id, textContent: c.rotulo }), s);
  } else if (c.tipo === "numero") {
    const r = el("input", { type: "range", min: c.min, max: Math.min(c.max, c.id === "valor" ? 0 : c.max), step: c.passo, value: c.padrao, "aria-label": c.rotulo });
    const n = el("input", { type: "number", id, min: c.min, max: c.max, step: c.passo, value: c.padrao }); n.dataset.campo = c.id;
    r.oninput = () => { n.value = r.value; if (c.id === "limiar") desenharPrevia(); }; n.oninput = () => { r.value = n.value; if (c.id === "limiar") desenharPrevia(); };
    wrap.append(el("label", { htmlFor: id, textContent: c.rotulo }), c.id === "valor" ? n : el("div", { className: "linha" }, r, n));
  } else {
    const i = el("input", { type: "text", id, value: c.padrao, maxLength: c.max, placeholder: c.opcional ? "(opcional)" : "" }); i.dataset.campo = c.id;
    i.onkeydown = (e) => { if (e.key === "Enter") gerar(); };
    wrap.append(el("label", { htmlFor: id, textContent: c.rotulo }), i);
  }
  if (c.dica) wrap.append(el("small", { textContent: c.dica }));
  return wrap;
}

function montarForm() {
  $("titulo-campos").textContent = `Personalizar · ${modelo.nome}`;
  $("form").replaceChildren(...modelo.campos.map(campoUI));
  $("dicas").replaceChildren(...(modelo.dicas || []).map((d) => el("li", { textContent: d })));
  modelo.partes.forEach((p) => (cores[modelo.id + p.id] ??= p.cor));
}

function lerValores() {
  const v = {};
  for (const c of modelo.campos) {
    if (c.tipo === "imagem") continue;
    const i = document.querySelector(`[data-campo="${c.id}"]`);
    if (c.tipo === "sim") v[c.id] = i.checked;
    else if (c.tipo === "numero") { let n = Number(String(i.value).replace(",", ".")); if (!Number.isFinite(n)) n = c.padrao; v[c.id] = Math.min(c.max, Math.max(c.min, n)); }
    else v[c.id] = String(i.value).trim();
  }
  return v;
}

// partes que existem com essas opções (ex.: pé só na placa de balcão)
const partesAtivas = (p) => modelo.partes.filter((pt) => !modelo.partesSe?.[pt.id] || modelo.partesSe[pt.id](p));
let paramsAtual = {}, aviso = "";
const separadasAgora = () => !!(modelo.separadas || modelo.separaPartes);
// essa parte é impressa separada? (ex.: na placa Pix só o pé; no letreiro, a tampa)
const parteSolta = (pid, i) => i > 0 && (modelo.separaPartes ? modelo.separaPartes.includes(pid) : !!modelo.separadas);
// recorte quadrado no centro da foto (litofania em formato)
function fotoQuadrada(img) {
  const lado = Math.min(img.w, img.h), x0 = Math.floor((img.w - lado) / 2), y0 = Math.floor((img.h - lado) / 2), g = new Float32Array(lado * lado);
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) g[y * lado + x] = img.gray[(y + y0) * img.w + x + x0];
  return { gray: g, lado };
}
// argola do chaveiro de litofania: topo da metade esquerda no coração, topo do meio nos outros; encosta 1,5 mm na moldura
function posArgola(contorno, forma, furo) {
  const cand = forma === "coracao" ? contorno.filter(([x]) => x < 0) : contorno; let topo = cand[0];
  for (const q of cand) if (q[1] > topo[1]) topo = q;
  return [forma === "coracao" ? topo[0] : 0, topo[1] + (furo + 4.4) / 2 - 1.5];
}
const paraSTL = (L) => { const n = L.triangulos, buf = new ArrayBuffer(84 + n * 50), dv = new DataView(buf); dv.setUint32(80, n, true);
  for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) dv.setFloat32(84 + i * 50 + 12 + k * 4, L.tri[i * 9 + k], true); return buf; };

// ---------- gerar ----------
function prepararParametros(v) {
  const f = FONTES.find((x) => x.nome === v.fonte) || FONTES[0];
  const p = { ...v }; if (v.fonte) p.fonte = f.scad;
  if (modelo.id === "placa_pix") {
    if (!v.chave) throw new Error("Digite a chave Pix.");
    const payload = pixPayload({ chave: v.chave, nome: v.recebedor, cidade: v.cidade, valor: v.valor });
    const q = window.qrcode(0, "M"); q.addData(payload); q.make();
    const n = q.getModuleCount();
    p.qr = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => (q.isDark(y, x) ? "1" : "0")).join(""));
    p.valor = v.valor > 0 ? "R$ " + Number(v.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
    delete p.cidade;
    const lado = p.largura - 16 - (p.formato === "compacta" ? 6 : 0), mod = lado / n;
    aviso = mod < 1.5 ? ` · atenção: QR pequeno (quadradinhos de ${mod.toFixed(1).replace(".", ",")} mm) — aumente a largura` : "";
  }
  if (modelo.logo === "opcional") {
    const usa = p.centro === "logo" || p.topo === "logo";
    if (usa) {
      const img = imagens.logo; if (!img) throw new Error("Envie o logo (ou escolha estrela).");
      const r = vetorizarLogo(window.d3.contours, img.gray, img.alpha, img.w, img.h, { limiar: v.limiar, inverter: v.inverter, largura: 30 });
      if (!r || !r.poligonos.length) throw new Error("Não achei o desenho no logo: mexa no limiar ou marque “inverter”.");
      p.logo = r.poligonos; p.lw = 30; p.lh = +r.altura.toFixed(2);
    }
    delete p.limiar; delete p.inverter;
  }
  if (modelo.logo && modelo.logo !== "opcional") {
    const img = imagens.logo; if (!img) throw new Error("Envie um logo ou desenho.");
    const r = vetorizarLogo(window.d3.contours, img.gray, img.alpha, img.w, img.h, { limiar: v.limiar, inverter: v.inverter, largura: v.largura });
    if (!r || !r.poligonos.length) throw new Error("Não achei o desenho na imagem: mexa no limiar ou marque “inverter”.");
    if (modelo.logo === "silhueta") p.silhueta = r.poligonos.map(([pts, paths]) => { const anel = paths[0].map((i) => pts[i]); return [anel, [anel.map((_, i) => i)]]; });
    else p.logo = r.poligonos;
    p.lw = r.largura; p.lh = +r.altura.toFixed(2);
    delete p.limiar; delete p.inverter; delete p.largura;
  }
  if (modelo.wifi) {
    if (!v.rede) throw new Error("Digite o nome da rede.");
    if (v.seguranca !== "nopass" && !v.senha) throw new Error("Digite a senha (ou escolha “Sem senha”).");
    const esc = (x) => x.replace(/([\\;,:"])/g, "\\$1");
    const payload = v.seguranca === "nopass" ? `WIFI:T:nopass;S:${esc(v.rede)};;` : `WIFI:T:${v.seguranca};S:${esc(v.rede)};P:${esc(v.senha)};;`;
    const q = window.qrcode(0, "M"); q.addData(payload); q.make(); const n = q.getModuleCount();
    p.qr = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => (q.isDark(y, x) ? "1" : "0")).join(""));
    if (p.altura < p.largura + 40) p.altura = p.largura + 50;
    if (v.seguranca === "nopass") p.mostrar_senha = false;
    delete p.seguranca;
  }
  const precisaTexto = { letreiro_led: "texto", chaveiro: "texto", porta_copos: "texto", topo_bolo: "texto", tag_pet: "nome", placa_porta: "texto", medalha: "texto", trofeu: "texto", cracha: "nome" }[modelo.id];
  if (precisaTexto && !p[precisaTexto]) throw new Error("Digite um texto.");
  const temFonte = modelo.campos.some((c) => c.tipo === "fonte");
  return { params: p, fontes: [...(temFonte ? [f.arquivo] : []), ...(modelo.fontesExtras || [])].filter((x, i, a) => a.indexOf(x) === i) };
}

function gerar() {
  let prep;
  aviso = "";
  try { prep = prepararParametros(lerValores()); } catch (e) { status(e.message, true); return; }
  paramsAtual = prep.params;
  const id = ++pedido; $("gerar").disabled = true; status("Gerando… (a primeira vez demora um pouco mais)");
  if (modelo.motor === "js") {                       // litofanias: a foto vira peça aqui mesmo
    const img = imagens.foto; if (!img) { $("gerar").disabled = false; status("Envie uma foto.", true); return; }
    setTimeout(() => {
      const pr = prep.params, formato = pr.formato, t = performance.now();
      const chaveiro = modelo.id === "chaveiro_litofania", emForma = chaveiro || ["coracao", "circulo", "quadrado"].includes(formato);
      const comBase = partesAtivas(pr).some((x) => x.id === "base");
      let L;
      if (emForma) { const q = fotoQuadrada(img); L = gerarLitofaniaForma(q.gray, q.lado, { forma: formato, tam: pr.largura, moldura: pr.moldura, tmin: pr.tmin, tmax: pr.tmax, gama: pr.gama, res: chaveiro ? 0.2 : 0.3 }); }
      else if (formato === "cilindro") L = gerarCilindro(img.gray, img.w, img.h, { ...pr, extra: comBase ? 6 : 0 });
      else L = gerarLitofania(img.gray, img.w, img.h, { ...pr, extra: comBase ? 6 : 0 });
      const buf = paraSTL(L);
      const foto = { parte: "litofania", stl: buf, ms: Math.round(performance.now() - t), raio: L.raio, formato: emForma ? "plana" : formato, tmin: pr.tmin };
      if (chaveiro) {                                  // argola: o motor OpenSCAD junta a argola na moldura
        const [px, py] = posArgola(L.contorno, formato, pr.furo);
        litoParcial = { id, foto, substituir: true };
        worker.postMessage({ id, modelo: "litofania_forma", partes: ["litofania"], fontes: [], arquivos: [{ nome: "lito.stl", dados: buf.slice(0) }],
          params: { furo: pr.furo, px: +px.toFixed(3), py: +py.toFixed(3), tmax: pr.tmax } });
        return;
      }
      if (!comBase) { receber({ id, ok: true, partes: [foto] }); return; }
      litoParcial = { id, foto };
      worker.postMessage({ id, modelo: "litofania_base", partes: ["base"], fontes: [],
        params: { formato, tipo: pr.base, largura: +L.largura.toFixed(3), esp: pr.tmax, raio: +L.raio.toFixed(4) } });
    }, 30);
    return;
  }
  worker.postMessage({ id, modelo: modelo.id, params: prep.params, partes: partesAtivas(prep.params).map((p) => p.id), fontes: prep.fontes });
}

let litoParcial = null;   // a foto da litofania esperando a base ficar pronta
worker.onmessage = ({ data }) => {
  if (litoParcial && data.id === litoParcial.id && data.ok) {
    const f = litoParcial.foto;
    data = litoParcial.substituir   // chaveiro: a peça com argola substitui a foto pura (mantendo os dados da prévia)
      ? { ...data, partes: data.partes.map((x) => ({ ...x, raio: f.raio, formato: f.formato, tmin: f.tmin })) }
      : { ...data, partes: [f, ...data.partes] };
    litoParcial = null;
  }
  receber(data);
};
function receber(data) {
  if (data.id !== pedido) return;                       // resposta de um pedido antigo
  if (data.progresso) { status(`Gerando… parte "${data.progresso}" pronta`); return; }
  $("gerar").disabled = false;
  if (!data.ok) { status("Não deu pra gerar: " + data.erro, true); return; }
  // partes impressas separadas (ex.: tampa do letreiro, pé da placa) ficam logo abaixo, com 10 mm de espaço;
  // as outras ficam no lugar (são a mesma peça em outra cor)
  let minYAll = Infinity;
  resultado = data.partes.map((r, i) => {
    const def = modelo.partes.find((p) => p.id === r.parte); const tri = stlTriangles(r.stl);
    let mn = Infinity, mx = -Infinity; for (let k = 1; k < tri.length; k += 3) { mn = Math.min(mn, tri[k]); mx = Math.max(mx, tri[k]); }
    const solta = parteSolta(r.parte, i), off = solta ? minYAll - 10 - mx : 0;
    minYAll = Math.min(minYAll, mn + off);
    return { parte: r.parte, nome: def.nome, tri, dy: off, solta, stl: r.stl, ms: r.ms, raio: r.raio, formato: r.formato, tmin: r.tmin };
  });
  desenhar(); enquadrar(); montarBarra();
  if (rolarDepois) { rolarDepois = false; view.scrollIntoView({ behavior: "smooth", block: "start" }); }
  status(`Pronto em ${(data.partes.reduce((s, p) => s + p.ms, 0) / 1000).toFixed(1).replace(".", ",")} s · arraste pra girar${aviso}`, !!aviso);
  if (!aviso) statusTimer = setTimeout(() => status(""), 3500);      // aviso (ex.: QR pequeno) fica na tela
}
worker.onerror = (e) => { $("gerar").disabled = false; status("Erro no motor 3D: " + (e.message || "seu navegador pode não ser compatível"), true); };

function desenhar() {
  grupo.clear();
  for (const r of resultado) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(r.tri, 3)); g.computeVertexNormals();
    let mat = new THREE.MeshStandardMaterial({ color: cores[modelo.id + r.parte], roughness: 0.55, metalness: 0.05 });
    if (r.parte === "litofania" && document.querySelector('[data-campo="previa_luz"]')?.checked) {
      const pos = r.tri, col = new Float32Array(pos.length);
      for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i], y = pos[i + 1], z = pos[i + 2];
        const esp = r.formato === "curva" ? Math.hypot(x, y - r.raio) - r.raio : r.formato === "cilindro" ? Math.hypot(x, y) - r.raio : z;
        const luz = Math.max(0.05, Math.min(1, Math.exp(-1.3 * (esp - (r.tmin || 0.8)))));
        col[i] = luz; col[i + 1] = luz * 0.9; col[i + 2] = luz * 0.68;      // tom quente de luminária
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3)); mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    }
    const m = new THREE.Mesh(g, mat);
    m.position.y = r.dy; m.userData.parte = r.parte; grupo.add(m);
  }
}

// ---------- barra de cores e downloads ----------
const baixar = (blob, nome) => { const a = el("a", { href: URL.createObjectURL(blob), download: nome }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
const nomeArquivo = () => { const v = lerValores(); return `${modelo.id}-${(v.texto || v.nome || v.rede || v.marca || v.titulo || "modelo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "modelo"}`; };

function montarBarra() {
  const itens = resultado.map((r) => {
    const cor = el("input", { type: "color", value: cores[modelo.id + r.parte], title: "Cor de " + r.nome });
    cor.oninput = () => { cores[modelo.id + r.parte] = cor.value; grupo.children.find((m) => m.userData.parte === r.parte)?.material.color.set(cor.value); };
    const stl = el("button", { type: "button", textContent: "STL", title: "Baixar só esta parte em STL" });
    stl.onclick = () => baixar(new Blob([r.stl], { type: "model/stl" }), `${nomeArquivo()}-${r.parte}.stl`);
    return el("span", { className: "parte" }, cor, r.nome, stl);
  });
  const b3 = el("button", { type: "button", className: "btn", textContent: "Baixar 3MF (multicor)", style: "width:auto;padding:10px 18px" });
  b3.onclick = () => baixar(make3mf(resultado.map((r, i) => ({ nome: r.nome, cor: cores[modelo.id + r.parte], tri: r.tri, dy: r.dy, solta: r.solta || (i === 0 && !!modelo.separadas && !modelo.separaPartes) }))), `${nomeArquivo()}.3mf`);
  $("barra").replaceChildren(...itens, el("span", { className: "esp" }), b3);
}

let rolarDepois = false;   // no celular, depois de clicar em Gerar, mostra o modelo
$("gerar").onclick = () => { rolarDepois = innerWidth < 860; gerar(); };
montarModelos(); montarForm(); gerar();
