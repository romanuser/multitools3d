// Litofania: foto -> espessura (escuro = grosso). Gera uma peça FECHADA (estanque).
// gray: Float32Array 0..1 (w*h). Retorna Float32Array de triângulos [x,y,z × 3].
export function gerarLitofania(gray, w, h, { largura = 100, tmin = 0.8, tmax = 3.0, moldura = 3, formato = "plana", angulo = 120, res = 0.3, gama = 1.0 } = {}) {
  const altura = largura * h / w;
  const W = largura + 2 * moldura, H = altura + 2 * moldura;
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
    const u = (X - moldura) / largura, v = (Y - moldura) / altura;
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
    for (let k = 0; k < anel.length; k++) { const [i0, j0] = anel[k], [i1, j1] = anel[(k + 1) % anel.length]; push(ctr, bot(i1, j1), bot(i0, j0)); }
  }
  return { tri: new Float32Array(tris), largura: W, altura: H, triangulos: tris.length / 9 };
}
