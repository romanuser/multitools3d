// Contorno automático de logo: imagem -> polígonos (com furos) em milímetros, prontos pro OpenSCAD.
// `contours` vem do d3-contour (no navegador: window.d3.contours; nos testes: import).
export function vetorizarLogo(contours, gray, alpha, w, h, { limiar = 0.5, inverter = false, largura = 40, detalhe = 0.6 } = {}) {
  // 1 = desenho, 0 = fundo; borda de 2 px de fundo pra fechar contornos que tocam a borda
  const W = w + 4, H = h + 4, v = new Float64Array(W * H);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; const escuro = alpha[i] < 0.5 ? 0 : (inverter ? gray[i] : 1 - gray[i]);
    v[(y + 2) * W + (x + 2)] = escuro;
  }
  const [mp] = contours().size([W, H]).smooth(true).thresholds([limiar])(v);
  let polys = mp ? mp.coordinates : [];
  if (!polys.length) return null;
  // limites em pixels -> escala pra largura pedida (mm), centraliza e vira o eixo Y
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const s = largura / Math.max(1e-6, x1 - x0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const [ax, ay] = r[i], [bx, by] = r[(i + 1) % r.length]; a += ax * by - bx * ay; } return a / 2; };
  const rdp = (pts, eps) => {           // simplificação (Ramer–Douglas–Peucker)
    if (pts.length < 4) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
    while (st.length) {
      const [a, b] = st.pop(); const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
      let md = -1, mi = -1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
      if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  const minArea = 0.4;                   // mm²: ignora sujeirinhas
  const out = [];
  for (const p of polys) {
    const rings = p.map((r) => rdp(r.slice(0, -1), detalhe).map(([x, y]) => [(x - cx) * s, -(y - cy) * s]))
                   .filter((r) => r.length >= 3 && Math.abs(area(r)) >= minArea);
    if (!rings.length || Math.abs(area(p[0])) * s * s < minArea) continue;
    const pts = [], paths = [];
    for (const r of rings) { paths.push(r.map((_, i) => pts.length + i)); pts.push(...r.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)])); }
    out.push([pts, paths]);
  }
  const altura = (y1 - y0) * s;
  return { poligonos: out, largura, altura, pontos: out.reduce((n, p) => n + p[0].length, 0) };
}

// Emblema: desenho escuro (2ª cor) + SILHUETA (contorno externo do escudo), na MESMA escala.
// Silhueta: PNG transparente → onde não é transparente; senão → onde a cor difere do fundo (cor da borda da imagem).
export function vetorizarEmblema(contours, gray, alpha, w, h, { limiar = 0.5, inverter = false, largura = 60, detalhe = 0.6 } = {}) {
  const W = w + 4, H = h + 4;
  const borda = [];
  for (let x = 0; x < w; x++) borda.push(y0i(x, 0), y0i(x, h - 1));
  for (let y = 0; y < h; y++) borda.push(y0i(0, y), y0i(w - 1, y));
  function y0i(x, y) { return y * w + x; }
  const transparente = borda.some((i) => alpha[i] < 0.5);
  const cinzas = borda.map((i) => gray[i]).sort((a, b) => a - b), fundo = cinzas[cinzas.length >> 1];
  const vD = new Float64Array(W * H), vS = new Float64Array(W * H);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, k = (y + 2) * W + (x + 2), opaco = alpha[i] >= 0.5;
    vD[k] = !opaco ? 0 : (inverter ? gray[i] : 1 - gray[i]);
    vS[k] = transparente ? (opaco ? 1 : 0) : (opaco && Math.abs(gray[i] - fundo) > 0.15 ? 1 : 0);
  }
  const [mD] = contours().size([W, H]).smooth(true).thresholds([limiar])(vD);
  const [mS] = contours().size([W, H]).smooth(true).thresholds([0.5])(vS);
  const pD = mD ? mD.coordinates : [], pS = mS ? mS.coordinates.map((p) => [p[0]]) : [];   // silhueta: só o contorno de fora (sem furos)
  if (!pD.length && !pS.length) return null;
  // escala e centro pela silhueta (que contém o desenho)
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of (pS.length ? pS : pD)) for (const [x, y] of p[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const s = largura / Math.max(1e-6, x1 - x0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const [ax, ay] = r[i], [bx, by] = r[(i + 1) % r.length]; a += ax * by - bx * ay; } return a / 2; };
  const rdp = (pts, eps) => {
    if (pts.length < 4) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
    while (st.length) {
      const [a, b] = st.pop(); const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
      let md = -1, mi = -1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
      if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  const converter = (polys, minArea) => {
    const out = [];
    for (const p of polys) {
      const rings = p.map((r) => rdp(r.slice(0, -1), detalhe).map(([x, y]) => [(x - cx) * s, -(y - cy) * s])).filter((r) => r.length >= 3 && Math.abs(area(r)) >= minArea);
      if (!rings.length || Math.abs(area(p[0])) * s * s < minArea) continue;
      const pts = [], paths = [];
      for (const r of rings) { paths.push(r.map((_, i) => pts.length + i)); pts.push(...r.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)])); }
      out.push([pts, paths]);
    }
    return out;
  };
  return { poligonos: converter(pD, 0.4), silhueta: converter(pS, 4), largura, altura: (y1 - y0) * s, transparente };
}

// Letreiro: separa o LOGO do FUNDO (qualquer cor de fundo, ou PNG transparente) e as CORES do logo (até 3).
// Cada cor vira uma região (polígonos com furos), todas na mesma escala; "silhueta" = contorno de fora do logo inteiro.
export function vetorizarCores(contours, rgb, alpha, w, h, { cores = 2, tolerancia = 0.2, largura = 60, detalhe = 0.45, unir = 4 } = {}) {
  const N = w * h, borda = [];
  for (let x = 0; x < w; x++) borda.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) borda.push(y * w, y * w + w - 1);
  const transparente = borda.filter((i) => alpha[i] < 0.5).length > borda.length * 0.3;
  const med = (c) => { const v = borda.map((i) => rgb[i * 4 + c]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const dist = (i, c) => Math.hypot(rgb[i * 4] - c[0], rgb[i * 4 + 1] - c[1], rgb[i * 4 + 2] - c[2]) / 441.7;
  const logo = new Uint8Array(N); let nLogo = 0;
  for (let i = 0; i < N; i++) if (alpha[i] >= 0.5 && (transparente || dist(i, bg) > tolerancia)) { logo[i] = 1; nLogo++; }
  if (nLogo < 20) return null;
  // k-means nas cores do logo (amostra), início pelos pontos mais distantes entre si
  const idx = []; for (let i = 0; i < N; i++) if (logo[i]) idx.push(i);
  const amostra = idx.filter((_, k) => k % Math.max(1, Math.floor(idx.length / 6000)) === 0);
  const K = Math.max(1, Math.min(3, cores));
  const cent = [[rgb[amostra[0] * 4], rgb[amostra[0] * 4 + 1], rgb[amostra[0] * 4 + 2]]];
  while (cent.length < K) {
    let melhor = amostra[0], md = -1;
    for (const i of amostra) { const d = Math.min(...cent.map((c) => dist(i, c))); if (d > md) { md = d; melhor = i; } }
    cent.push([rgb[melhor * 4], rgb[melhor * 4 + 1], rgb[melhor * 4 + 2]]);
  }
  const perto = (i) => { let b = 0, bd = Infinity; cent.forEach((c, k) => { const d = dist(i, c); if (d < bd) { bd = d; b = k; } }); return b; };
  for (let it = 0; it < 12; it++) {
    const s = cent.map(() => [0, 0, 0, 0]);
    for (const i of amostra) { const k = perto(i); s[k][0] += rgb[i * 4]; s[k][1] += rgb[i * 4 + 1]; s[k][2] += rgb[i * 4 + 2]; s[k][3]++; }
    s.forEach((t, k) => { if (t[3]) cent[k] = [t[0] / t[3], t[1] / t[3], t[2] / t[3]]; });
  }
  // cada pixel vai pra cor MAIS PARECIDA, com o fundo concorrendo também: a borda suavizada (cinza entre a letra
  // e o fundo) se divide no meio, em vez de virar uma "cor" própria em volta das letras
  const rot = new Int8Array(N).fill(-1); const cont = cent.map(() => 0);
  for (const i of idx) { const k = perto(i); if (!transparente && dist(i, bg) < dist(i, cent[k])) { logo[i] = 0; continue; } rot[i] = k; cont[k]++; }
  // campos com borda de 2 px pra fechar contornos que tocam a borda da imagem
  const W = w + 4, H = h + 4;
  const campo = (f) => { const v = new Float64Array(W * H); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) v[(y + 2) * W + x + 2] = f(y * w + x) ? 1 : 0; return v; };
  const contornar = (v) => { const [m] = contours().size([W, H]).smooth(true).thresholds([0.5])(v); return m ? m.coordinates : []; };
  const mascara = contornar(campo((i) => logo[i]));
  // contorno da caixa (nos pixels): fecha vãos entre as partes ("unir", % da largura do logo) e preenche toda área fechada
  let bx0 = w, bx1 = 0; for (let i = 0; i < N; i++) if (logo[i]) { const x = i % w; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; }
  const raio = Math.max(0, (unir / 100) * (bx1 - bx0));
  const PW = w + 2 * Math.ceil(raio) + 4, PH = h + 2 * Math.ceil(raio) + 4, OX = Math.ceil(raio) + 2;   // margem pra dilatar
  const dt = (alvo) => {     // distância (chanfro 3-4) até o pixel "alvo" mais próximo
    const d = new Float32Array(PW * PH).fill(1e9);
    for (let i = 0; i < PW * PH; i++) if (alvo[i]) d[i] = 0;
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x; let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3); if (y > 0) { v = Math.min(v, d[i - PW] + 3); if (x > 0) v = Math.min(v, d[i - PW - 1] + 4); if (x < PW - 1) v = Math.min(v, d[i - PW + 1] + 4); } d[i] = v; }
    for (let y = PH - 1; y >= 0; y--) for (let x = PW - 1; x >= 0; x--) { const i = y * PW + x; let v = d[i];
      if (x < PW - 1) v = Math.min(v, d[i + 1] + 3); if (y < PH - 1) { v = Math.min(v, d[i + PW] + 3); if (x < PW - 1) v = Math.min(v, d[i + PW + 1] + 4); if (x > 0) v = Math.min(v, d[i + PW - 1] + 4); } d[i] = v; }
    return d;
  };
  const base = new Uint8Array(PW * PH); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) base[(y + OX) * PW + x + OX] = logo[y * w + x];
  let caixa = base;
  if (raio > 0) {
    const d1 = dt(base); const dil = new Uint8Array(PW * PH); for (let i = 0; i < PW * PH; i++) dil[i] = d1[i] <= raio * 3 ? 1 : 0;
    const fora = new Uint8Array(PW * PH); for (let i = 0; i < PW * PH; i++) fora[i] = dil[i] ? 0 : 1;
    const d2 = dt(fora); caixa = new Uint8Array(PW * PH); for (let i = 0; i < PW * PH; i++) caixa[i] = d2[i] > raio * 3 ? 1 : 0;
    for (let i = 0; i < PW * PH; i++) if (base[i]) caixa[i] = 1;
  }
  // preenche áreas fechadas: tudo que não é alcançável a partir da borda vira caixa
  const vis = new Uint8Array(PW * PH); const fila = [];
  for (let x = 0; x < PW; x++) fila.push(x, (PH - 1) * PW + x); for (let y = 0; y < PH; y++) fila.push(y * PW, y * PW + PW - 1);
  while (fila.length) { const i = fila.pop(); if (vis[i] || caixa[i]) continue; vis[i] = 1; const x = i % PW;
    if (x > 0) fila.push(i - 1); if (x < PW - 1) fila.push(i + 1); if (i >= PW) fila.push(i - PW); if (i < PW * (PH - 1)) fila.push(i + PW); }
  const vc = new Float64Array(PW * PH); for (let i = 0; i < PW * PH; i++) vc[i] = vis[i] ? 0 : 1;
  const [mc] = contours().size([PW, PH]).smooth(true).thresholds([0.5])(vc);
  const caixaPolys = (mc ? mc.coordinates : []).map((p) => p.map((r) => r.map(([x, y]) => [x - OX + 2, y - OX + 2])));   // volta pro sistema dos outros campos
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of mascara) for (const [x, y] of p[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const s = largura / Math.max(1e-6, x1 - x0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const [ax, ay] = r[i], [bx, by] = r[(i + 1) % r.length]; a += ax * by - bx * ay; } return a / 2; };
  const rdp = (pts, eps) => {
    if (pts.length < 4) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
    while (st.length) {
      const [a, b] = st.pop(); const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
      let md = -1, mi = -1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
      if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  const converter = (polys, minArea, soFora = false) => {
    const out = [];
    for (const p of polys) {
      if (Math.abs(area(p[0])) * s * s < minArea) continue;
      const rings = (soFora ? [p[0]] : p).map((r) => rdp(r.slice(0, -1), detalhe).map(([x, y]) => [(x - cx) * s, -(y - cy) * s])).filter((r) => r.length >= 3 && Math.abs(area(r)) >= minArea * 0.2);
      if (!rings.length) continue;
      const pts = [], paths = [];
      for (const r of rings) { paths.push(r.map((_, i) => pts.length + i)); pts.push(...r.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)])); }
      out.push([pts, paths]);
    }
    return out;
  };
  const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const ordem = cent.map((_, k) => k).sort((a, b) => cont[b] - cont[a]);           // maior região primeiro
  // área mínima bem pequena (na escala de 60 de largura): traços finos como um "I" de letra pequena não podem sumir
  const minPx = 8 * s * s;                                                         // 8 pixels: abaixo disso é sujeira
  const regioes = ordem.map((k) => ({ cor: hex(cent[k]), poligonos: converter(contornar(campo((i) => rot[i] === k)), minPx) })).filter((r) => r.poligonos.length);
  return { regioes, silhueta: converter(caixaPolys, 1, true), largura, altura: (y1 - y0) * s, fundo: transparente ? null : hex(bg), transparente };
}
