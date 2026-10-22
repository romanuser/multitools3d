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
