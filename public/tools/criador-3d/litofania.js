// Litofania: foto -> espessura (escuro = grosso). Gera uma peça FECHADA (estanque).
// gray: Float32Array 0..1 (w*h). Retorna Float32Array de triângulos [x,y,z × 3].
// extra: moldura a mais só embaixo (a parte que entra no encaixe da base não esconde a foto)
export function gerarLitofania(gray, w, h, { largura = 100, tmin = 0.8, tmax = 3.0, moldura = 3, formato = "plana", angulo = 120, res = 0.3, gama = 1.0, extra = 0 } = {}) {
  const altura = largura * h / w;
  const W = largura + 2 * moldura, H = altura + 2 * moldura + extra;
  const nx = Math.min(520, Math.round(W / res) + 1), ny = Math.min(520, Math.round(H / res) + 1);
  const amostra = (u, v) => {           // bilinear na foto (u,v em 0..1)
    const fx = u * (w - 1), fy = v * (h - 1), x = Math.floor(fx), y = Math.floor(fy), ax = fx - x, ay = fy - y;
    const g = (xx, yy) => gray[Math.min(h - 1, yy) * w + Math.min(w - 1, xx)];
    return (g(x, y) * (1 - ax) + g(x + 1, y) * ax) * (1 - ay) + (g(x, y + 1) * (1 - ax) + g(x + 1, y + 1) * ax) * ay;
  };
  // espessura de cada ponto da grade
  const t = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const X = (i / (nx - 1)) * W, Y = (j / (ny - 1)) * H;
    const u = (X - moldura) / largura, v = (Y - moldura) / altura;   // Y cresce pra baixo: a moldura extra fica no fim (embaixo)
    t[j * nx + i] = u < 0 || u > 1 || v < 0 || v > 1 ? tmax : tmin + Math.pow(1 - amostra(u, v), gama) * (tmax - tmin);
  }
  const R = largura / ((angulo * Math.PI) / 180);
  // ponto da peça: (i, j, z) -> 3D. Plana: deitada. Curva: em pé, dobrada num arco.
  const P = (i, j, z) => {
    const X = (i / (nx - 1)) * W, Yimg = H - (j / (ny - 1)) * H;      // linha 0 da foto fica em cima
    if (formato === "curva") { const th = (X - W / 2) / R; return [(R + z) * Math.sin(th), -((R + z) * Math.cos(th) - R), Yimg]; }
    return [X - W / 2, Yimg - H / 2, z];
  };
  const tris = []; const push = (a, b, c) => tris.push(...a, ...b, ...c);
  const top = (i, j) => P(i, j, t[j * nx + i]), bot = (i, j) => P(i, j, 0);
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = top(i, j), b = top(i + 1, j), c = top(i + 1, j + 1), d = top(i, j + 1);
    push(a, c, b); push(a, d, c);                                       // face da foto
  }
  // borda (ordem horária vista de cima, lida como um anel)
  const anel = [];
  for (let i = 0; i < nx; i++) anel.push([i, 0]);
  for (let j = 1; j < ny; j++) anel.push([nx - 1, j]);
  for (let i = nx - 2; i >= 0; i--) anel.push([i, ny - 1]);
  for (let j = ny - 2; j > 0; j--) anel.push([0, j]);
  for (let k = 0; k < anel.length; k++) {                               // paredes laterais
    const [i0, j0] = anel[k], [i1, j1] = anel[(k + 1) % anel.length];
    const a = top(i0, j0), b = top(i1, j1), c = bot(i1, j1), d = bot(i0, j0);
    push(a, b, c); push(a, c, d);
  }
  if (formato === "curva") {                                            // fundo curvo: grade cheia
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = bot(i, j), b = bot(i + 1, j), c = bot(i + 1, j + 1), d = bot(i, j + 1);
      push(a, b, c); push(a, c, d);
    }
  } else {                                                              // fundo plano: leque a partir do centro
    const ctr = [0, 0, 0];
    // mesmo sentido de giro da grade do fundo curvo (faces viradas pra fora, pro fatiador)
    for (let k = 0; k < anel.length; k++) { const [i0, j0] = anel[k], [i1, j1] = anel[(k + 1) % anel.length]; push(ctr, bot(i0, j0), bot(i1, j1)); }
  }
  return { tri: new Float32Array(tris), largura: W, altura: H, raio: R, triangulos: tris.length / 9 };
}

// Cilindro 360° (luminária): a foto dá a volta inteira e a última coluna se "costura" na primeira.
// Parede de dentro lisa (raio R), de fora com o relevo (R + espessura). Bordas lisas em cima e embaixo.
export function gerarCilindro(gray, w, h, { largura = 220, tmin = 0.8, tmax = 3.0, moldura = 3, gama = 1.0, extra = 0 } = {}) {
  const res = 0.6;   // detalhe de 0,6 mm: na luminária a luz difunde, e o arquivo fica leve
  const altura = largura * h / w;                       // largura = circunferência da foto
  const H = altura + 2 * moldura + extra, R = largura / (2 * Math.PI);
  const nx = Math.min(480, Math.max(48, Math.round(largura / res))), ny = Math.min(300, Math.round(H / res) + 1);
  const amostra = (u, v) => { const fx = u * (w - 1), fy = v * (h - 1), x = Math.floor(fx), y = Math.floor(fy), ax = fx - x, ay = fy - y;
    const g = (xx, yy) => gray[Math.min(h - 1, yy) * w + Math.min(w - 1, xx)];
    return (g(x, y) * (1 - ax) + g(x + 1, y) * ax) * (1 - ay) + (g(x, y + 1) * (1 - ax) + g(x + 1, y + 1) * ax) * ay; };
  const t = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = ((j / (ny - 1)) * H - moldura) / altura, u = i / nx;
    t[j * nx + i] = v < 0 || v > 1 ? tmax : tmin + Math.pow(1 - amostra(u, v), gama) * (tmax - tmin);
  }
  // ângulo cresce no sentido horário visto de cima -> a foto fica certa vista de FORA
  const P = (i, j, r) => { const th = -(i % nx) / nx * 2 * Math.PI; const z = H - (j / (ny - 1)) * H; return [r * Math.cos(th), r * Math.sin(th), z]; };
  const fora = (i, j) => P(i, j, R + t[j * nx + (i % nx)]), dentro = (i, j) => P(i, j, R);
  const tris = []; const push = (a, b, c) => tris.push(...a, ...b, ...c);
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) {
    const a = fora(i, j), b = fora(i + 1, j), c = fora(i + 1, j + 1), d = fora(i, j + 1);
    push(a, b, c); push(a, c, d);                                   // superfície de fora (foto)
    const e = dentro(i, j), f = dentro(i + 1, j), g = dentro(i + 1, j + 1), k = dentro(i, j + 1);
    push(e, g, f); push(e, k, g);                                   // superfície de dentro
  }
  for (let i = 0; i < nx; i++) {                                    // aro de cima (j = 0) e de baixo (j = ny-1)
    const a = fora(i, 0), b = fora(i + 1, 0), c = dentro(i + 1, 0), d = dentro(i, 0); push(a, c, b); push(a, d, c);
    const J = ny - 1, e = fora(i, J), f = fora(i + 1, J), g = dentro(i + 1, J), k = dentro(i, J); push(e, f, g); push(e, g, k);
  }
  return { tri: new Float32Array(tris), largura: 2 * (R + tmax), altura: H, raio: R, triangulos: tris.length / 9 };
}

// Litofania em FORMATO (coração, círculo, quadrado) gerada já no formato — sem recorte.
// A malha sai em anéis do centro até a borda; a moldura são os últimos milímetros de cada raio.
// A foto deve vir QUADRADA (recorte no centro). Peça deitada, centralizada na origem.
export function contornoForma(forma, tam) {
  const pts = [];
  if (forma === "coracao") {
    for (let k = 0; k < 720; k++) { const t = (k / 720) * 2 * Math.PI;
      pts.push([16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]); }
  } else if (forma === "quadrado") {
    const r = 0.16, L = 1;                                  // quadrado de cantos arredondados
    for (const [cx, cy, a0] of [[L - r, L - r, 0], [-L + r, L - r, 90], [-L + r, -L + r, 180], [L - r, -L + r, 270]])
      for (let k = 0; k <= 45; k++) { const a = ((a0 + k * 2) * Math.PI) / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  } else for (let k = 0; k < 720; k++) { const a = (k / 720) * 2 * Math.PI; pts.push([Math.cos(a), Math.sin(a)]); }
  // escala pra largura "tam" e centraliza a caixa na origem
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const k = tam / (x1 - x0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return { pts: pts.map(([x, y]) => [(x - cx) * k, (y - cy) * k]), altura: (y1 - y0) * k };
}

export function gerarLitofaniaForma(gray, lado, { forma = "coracao", tam = 80, moldura = 3, tmin = 0.8, tmax = 3, gama = 1, res = 0.3 } = {}) {
  const { pts, altura } = contornoForma(forma, tam);
  const c = forma === "coracao" ? [0, -altura * 0.06] : [0, 0];          // centro de onde saem os raios
  const na = 720, nr = Math.max(40, Math.min(220, Math.round(tam / 2 / res)));
  // distância do centro até a borda, em cada direção (raio x contorno)
  const borda = new Float64Array(na);
  for (let a = 0; a < na; a++) {
    const th = (a / na) * 2 * Math.PI, dx = Math.cos(th), dy = Math.sin(th); let best = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; const ex = bx - ax, ey = by - ay;
      const den = dx * ey - dy * ex; if (Math.abs(den) < 1e-12) continue;
      const t = ((ax - c[0]) * ey - (ay - c[1]) * ex) / den, u = ((ax - c[0]) * dy - (ay - c[1]) * dx) / den;
      if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) best = t;   // tolerância: raio caindo bem no canto do contorno
    }
    borda[a] = best;
  }
  const amostra = (x, y) => {                    // foto quadrada cobrindo [-tam/2, tam/2]²
    const u = Math.min(1, Math.max(0, x / tam + 0.5)), v = Math.min(1, Math.max(0, 0.5 - y / tam));
    const fx = u * (lado - 1), fy = v * (lado - 1), x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
    const g = (xx, yy) => gray[Math.min(lado - 1, yy) * lado + Math.min(lado - 1, xx)];
    return (g(x0, y0) * (1 - ax) + g(x0 + 1, y0) * ax) * (1 - ay) + (g(x0, y0 + 1) * (1 - ax) + g(x0 + 1, y0 + 1) * ax) * ay;
  };
  const alt = (x, y, dentroFoto) => dentroFoto ? tmin + Math.pow(1 - amostra(x, y), gama) * (tmax - tmin) : tmax;
  const ponto = (k, a) => { const A = a % na, R = borda[A], s = k / nr, th = (A / na) * 2 * Math.PI;
    const x = c[0] + s * R * Math.cos(th), y = c[1] + s * R * Math.sin(th); return [x, y, alt(x, y, s * R < R - moldura)]; };
  const tris = []; const push = (p, q, r) => tris.push(...p, ...q, ...r);
  const centroTopo = [c[0], c[1], alt(c[0], c[1], true)], centroBase = [c[0], c[1], 0];
  for (let a = 0; a < na; a++) {
    push(centroTopo, ponto(1, a), ponto(1, a + 1));                       // miolo
    for (let k = 1; k < nr; k++) { const p = ponto(k, a), q = ponto(k, a + 1), r = ponto(k + 1, a + 1), s = ponto(k + 1, a); push(p, r, q); push(p, s, r); }
    const p = ponto(nr, a), q = ponto(nr, a + 1); const pb = [p[0], p[1], 0], qb = [q[0], q[1], 0];
    push(p, qb, q); push(p, pb, qb);                                       // parede da borda (virada pra fora)
    push(centroBase, qb, pb);                                              // fundo plano
  }
  return { tri: new Float32Array(tris), largura: tam, altura, triangulos: tris.length / 9, contorno: pts };
}
