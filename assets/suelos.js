/* =========================================================================
   suelos.js — Motor de cálculo de ensayos de clasificación de suelos
   Funciones puras (sin DOM). Se usa en el navegador (window.Suelos) y en
   Node para las pruebas (module.exports).

   Normas de referencia
   - ASTM D6913   Análisis granulométrico por tamizado
   - ASTM D7928   Análisis granulométrico por sedimentación (hidrómetro)
                  (reemplazan a ASTM D422, retirada en 2016)
   - ASTM D4318   Límites líquido, plástico e índice de plasticidad
   - ASTM D2487   Sistema Unificado de Clasificación de Suelos (SUCS)
   - AASHTO M 145 / ASTM D3282  Clasificación AASHTO y Índice de Grupo
   - Escala granulométrica MIT
   ========================================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Suelos = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Formateador configurable (la interfaz lo reemplaza por coma decimal)
  const cfg = {
    fmt: function (x, d) {
      return isFinite(x) ? Number(x).toFixed(d === undefined ? 1 : d) : "—";
    },
  };
  const F = function (x, d) { return cfg.fmt(x, d); };
  const log10 = Math.log10;
  const isNum = function (x) { return typeof x === "number" && isFinite(x); };

  /* ---------------------------------------------------------------------
     1. TAMICES ASTM E11 (serie usual en geotecnia)
     --------------------------------------------------------------------- */
  const TAMICES = [
    { name: '3"', d: 75 },
    { name: '2"', d: 50 },
    { name: '1½"', d: 37.5 },
    { name: '1"', d: 25 },
    { name: '¾"', d: 19 },
    { name: '½"', d: 12.5 },
    { name: '⅜"', d: 9.5 },
    { name: "Nº4", d: 4.75 },
    { name: "Nº10", d: 2.0 },
    { name: "Nº20", d: 0.85 },
    { name: "Nº40", d: 0.425 },
    { name: "Nº60", d: 0.25 },
    { name: "Nº100", d: 0.15 },
    { name: "Nº200", d: 0.075 },
  ];

  /* ---------------------------------------------------------------------
     2. TAMIZADO
     filas: [{name, d (mm), ret (g)}], pan (g), Mini (g, opcional)
     Los porcentajes se calculan sobre la suma de masas recuperadas
     (retenidos + fondo); la pérdida respecto a la masa inicial se informa.
     --------------------------------------------------------------------- */
  function tamizado(filas, pan, Mini) {
    const f = filas
      .filter(function (r) { return isNum(r.d) && r.d > 0; })
      .slice()
      .sort(function (a, b) { return b.d - a.d; });
    const ret = f.map(function (r) { return isNum(r.ret) && r.ret > 0 ? r.ret : 0; });
    const panM = isNum(pan) && pan > 0 ? pan : 0;
    const suma = ret.reduce(function (s, x) { return s + x; }, 0) + panM;
    const out = {
      filas: [], suma: suma, panM: panM, panPct: 0,
      Mini: isNum(Mini) && Mini > 0 ? Mini : null,
      perdida: null, puntos: [], adv: [],
    };
    if (suma <= 0) { out.adv.push("Ingrese las masas retenidas en cada tamiz."); return out; }
    let acum = 0;
    f.forEach(function (r, i) {
      acum += ret[i];
      const cum = (acum / suma) * 100;
      out.filas.push({
        id: r.id, name: r.name, d: r.d, ret: ret[i],
        pctRet: (ret[i] / suma) * 100, cum: cum, pasa: Math.max(0, 100 - cum),
      });
    });
    out.panPct = (panM / suma) * 100;
    if (out.Mini) {
      const g = out.Mini - suma;
      out.perdida = { g: g, pct: (g / out.Mini) * 100 };
      if (Math.abs(out.perdida.pct) > 1) {
        out.adv.push(
          "La suma de masas difiere " + F(Math.abs(out.perdida.pct), 2) +
          " % de la masa inicial (tolerancia indicativa 1 %). Revise pesadas, pérdidas de material o el tamizado."
        );
      }
    }
    out.puntos = out.filas
      .map(function (r) { return { d: r.d, p: r.pasa, name: r.name }; })
      .sort(function (a, b) { return a.d - b.d; });
    return out;
  }

  /* % que pasa a un diámetro d (mm), interpolación lineal en log(d).
     pts ordenados por d ascendente. Devuelve {v, aprox} o null. */
  function pasaEn(pts, d) {
    if (!pts || !pts.length || !(d > 0)) return null;
    const n = pts.length;
    const eps = 1e-9;
    if (d >= pts[n - 1].d) return { v: pts[n - 1].p, aprox: d > pts[n - 1].d * (1 + eps) };
    if (d < pts[0].d * (1 - eps)) return null;
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (d >= a.d * (1 - eps) && d <= b.d * (1 + eps)) {
        if (Math.abs(d - a.d) < eps * a.d) return { v: a.p, aprox: false };
        if (Math.abs(d - b.d) < eps * b.d) return { v: b.p, aprox: false };
        const t = (log10(d) - log10(a.d)) / (log10(b.d) - log10(a.d));
        return { v: a.p + t * (b.p - a.p), aprox: true };
      }
    }
    return null;
  }

  /* Diámetro (mm) correspondiente a un % que pasa P (D10, D30, D60...). */
  function dEnP(pts, P) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (P >= a.p && P <= b.p && b.p > a.p) {
        const t = (P - a.p) / (b.p - a.p);
        return Math.pow(10, log10(a.d) + t * (log10(b.d) - log10(a.d)));
      }
    }
    return null;
  }

  function parametros(pts) {
    const D10 = dEnP(pts, 10), D30 = dEnP(pts, 30), D60 = dEnP(pts, 60);
    const Cu = D10 && D60 ? D60 / D10 : null;
    const Cc = D10 && D30 && D60 ? (D30 * D30) / (D10 * D60) : null;
    return { D10: D10, D30: D30, D60: D60, Cu: Cu, Cc: Cc };
  }

  /* ---------------------------------------------------------------------
     3. HIDROMETRÍA (hidrómetro 152H, ASTM D7928 / D422)
     --------------------------------------------------------------------- */
  // Corrección por temperatura Ct (hidrómetro 152H calibrado a 20 °C)
  const CT_TABLA = [
    [15, -1.1], [16, -0.9], [17, -0.7], [18, -0.5], [19, -0.3], [20, 0.0],
    [21, 0.2], [22, 0.4], [23, 0.7], [24, 1.0], [25, 1.3], [26, 1.65],
    [27, 2.0], [28, 2.5], [29, 3.05], [30, 3.8],
  ];

  function ctTemp(T) {
    const t = CT_TABLA;
    const n = t.length;
    if (T <= t[0][0]) {
      const s = (t[1][1] - t[0][1]) / (t[1][0] - t[0][0]);
      return t[0][1] + s * (T - t[0][0]);
    }
    if (T >= t[n - 1][0]) {
      const s = (t[n - 1][1] - t[n - 2][1]) / (t[n - 1][0] - t[n - 2][0]);
      return t[n - 1][1] + s * (T - t[n - 1][0]);
    }
    for (let i = 0; i < n - 1; i++) {
      if (T >= t[i][0] && T <= t[i + 1][0]) {
        const u = (T - t[i][0]) / (t[i + 1][0] - t[i][0]);
        return t[i][1] + u * (t[i + 1][1] - t[i][1]);
      }
    }
    return 0;
  }

  // Viscosidad dinámica del agua en poise (g/cm·s). Ecuación tipo Vogel.
  function viscosidadAgua(T) {
    const TK = T + 273.15;
    return 10 * 2.414e-5 * Math.pow(10, 247.8 / (TK - 140));
  }

  // Densidad del agua (g/cm³) en función de la temperatura (°C).
  function densidadAgua(T) {
    const rho =
      999.842594 + 6.793952e-2 * T - 9.09529e-3 * T * T +
      1.001685e-4 * Math.pow(T, 3) - 1.120083e-6 * Math.pow(T, 4) +
      6.536332e-9 * Math.pow(T, 5);
    return rho / 1000;
  }

  // Factor de corrección por gravedad específica (a)
  function factorA(Gs) { return (1.65 * Gs) / ((Gs - 1) * 2.65); }

  /* p: {Gs, Ws (g), Fz (corrección cero), Cm (menisco), Pref (% pasa tamiz de la muestra de hidrómetro)}
     lecturas: [{t (min), T (°C), R (lectura en el borde superior del menisco)}] */
  function hidrometria(p, lecturas) {
    const adv = [];
    const Gs = p.Gs, Ws = p.Ws;
    const Fz = isNum(p.Fz) ? p.Fz : 0;
    const Cm = isNum(p.Cm) ? p.Cm : 1;
    const Pref = isNum(p.Pref) ? p.Pref : 100;
    if (!(Gs > 1)) { adv.push("Ingrese la gravedad específica Gs (> 1)."); return { a: NaN, Pref: Pref, filas: [], adv: adv }; }
    if (!(Ws > 0)) { adv.push("Ingrese la masa seca de la muestra del hidrómetro (g)."); return { a: NaN, Pref: Pref, filas: [], adv: adv }; }
    const a = factorA(Gs);
    const filas = [];
    lecturas.forEach(function (l) {
      if (!isNum(l.t) || !isNum(l.R) || !isNum(l.T) || l.t <= 0) return;
      const Ct = ctTemp(l.T);
      const Rc = l.R - Fz + Ct;
      const P = ((a * Rc) / Ws) * 100;
      const RL = l.R + Cm;
      const L = 16.29 - 0.164 * RL;
      const eta = viscosidadAgua(l.T);
      const G1 = densidadAgua(l.T) / 0.999972;
      const K = Math.sqrt((30 * eta) / (980 * (Gs - G1)));
      const D = K * Math.sqrt(L / l.t);
      filas.push({
        id: l.id, t: l.t, T: l.T, R: l.R, Ct: Ct, Rc: Rc, P: P, Ptot: (P * Pref) / 100,
        RL: RL, L: L, eta: eta, G1: G1, K: K, D: D,
      });
      if (l.T < 15 || l.T > 30) adv.push("T = " + F(l.T, 1) + " °C está fuera de la tabla de Ct (15–30 °C); se extrapoló.");
    });
    filas.forEach(function (r, i) {
      if (r.P > 100.5) adv.push("La lectura t = " + F(r.t, 0) + " min da P > 100 %: revise Ws, Fz o la lectura.");
      if (r.P < -0.5) adv.push("La lectura t = " + F(r.t, 0) + " min da P < 0 %: revise Fz o la lectura.");
      if (i > 0 && r.P > filas[i - 1].P + 0.3)
        adv.push("El % de finos aumenta entre t = " + F(filas[i - 1].t, 0) + " y " + F(r.t, 0) + " min: revise las lecturas.");
    });
    return { a: a, Pref: Pref, filas: filas, adv: adv };
  }

  /* Curva combinada: tamices + puntos del hidrómetro con D menor que el
     tamiz más fino. Devuelve puntos ordenados por d ascendente. */
  function curvaCombinada(tam, hid) {
    const pts = (tam.puntos || []).map(function (p) { return { d: p.d, p: p.p, tipo: "tamiz", name: p.name }; });
    const dmin = pts.length ? pts[0].d : 0.075;
    if (hid && hid.filas && hid.filas.length) {
      hid.filas.forEach(function (r) {
        if (r.D < dmin * (1 - 1e-9) && isNum(r.Ptot)) pts.push({ d: r.D, p: Math.max(0, Math.min(100, r.Ptot)), tipo: "hidrometro" });
      });
    }
    pts.sort(function (a, b) { return a.d - b.d; });
    return pts;
  }

  function verificarMonotonia(pts) {
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].p < pts[i - 1].p - 0.3) return false;
    }
    return true;
  }

  /* ---------------------------------------------------------------------
     4. FRACCIONES GRANULOMÉTRICAS POR SISTEMA
     --------------------------------------------------------------------- */
  const ESCALAS = {
    SUCS: {
      nombre: "SUCS (ASTM D2487)",
      limites: [
        { n: "Grava", hi: 75, lo: 4.75 },
        { n: "Arena", hi: 4.75, lo: 0.075 },
        { n: "Finos (limo y arcilla)", hi: 0.075, lo: 0 },
      ],
    },
    AASHTO: {
      nombre: "AASHTO (M 145)",
      limites: [
        { n: "Grava", hi: 75, lo: 2.0 },
        { n: "Arena gruesa", hi: 2.0, lo: 0.425 },
        { n: "Arena fina", hi: 0.425, lo: 0.075 },
        { n: "Limo-arcilla", hi: 0.075, lo: 0 },
      ],
    },
    MIT: {
      nombre: "MIT",
      limites: [
        { n: "Grava", hi: 60, lo: 2 },
        { n: "Arena", hi: 2, lo: 0.06 },
        { n: "Limo", hi: 0.06, lo: 0.002 },
        { n: "Arcilla", hi: 0.002, lo: 0 },
      ],
    },
  };

  function fracciones(pts, clave) {
    const esc = ESCALAS[clave];
    const val = function (d) {
      if (d === 0) return { v: 0, aprox: false };
      return pasaEn(pts, d);
    };
    return esc.limites.map(function (b) {
      const h = val(b.hi), l = val(b.lo);
      if (!h || !l) return { n: b.n, hi: b.hi, lo: b.lo, pct: null, nd: true, aprox: false };
      return {
        n: b.n, hi: b.hi, lo: b.lo, pct: Math.max(0, h.v - l.v), nd: false,
        aprox: !!(h.aprox || l.aprox),
      };
    });
  }

  /* ---------------------------------------------------------------------
     5. LÍMITES DE CONSISTENCIA (ASTM D4318)
     --------------------------------------------------------------------- */
  function humedad(tara, humTara, secTara) {
    const ms = secTara - tara, mw = humTara - secTara;
    if (!(ms > 0)) return NaN;
    return (mw / ms) * 100;
  }

  function regresion(xs, ys) {
    const n = xs.length;
    const mx = xs.reduce(function (s, x) { return s + x; }, 0) / n;
    const my = ys.reduce(function (s, y) { return s + y; }, 0) / n;
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sxx += (xs[i] - mx) * (xs[i] - mx);
      sxy += (xs[i] - mx) * (ys[i] - my);
      syy += (ys[i] - my) * (ys[i] - my);
    }
    const m = sxx > 0 ? sxy / sxx : 0;
    const b = my - m * mx;
    let sse = 0;
    for (let i = 0; i < n; i++) { const e = ys[i] - (b + m * xs[i]); sse += e * e; }
    const r2 = syy > 0 ? 1 - sse / syy : 1;
    return { m: m, b: b, r2: r2 };
  }

  // ¿Hay un ensayo en cada intervalo 25–35, 20–30 y 15–25 golpes? (Método A)
  function cumpleRangosD4318(Ns) {
    const R = [[25, 35], [20, 30], [15, 25]];
    function rec(k, usados) {
      if (k === 3) return true;
      for (let i = 0; i < Ns.length; i++) {
        if (usados.indexOf(i) >= 0) continue;
        if (Ns[i] >= R[k][0] && Ns[i] <= R[k][1] && rec(k + 1, usados.concat(i))) return true;
      }
      return false;
    }
    return rec(0, []);
  }

  // Método A (multipunto): trials [{N, w}]
  function limiteLiquidoMulti(trials) {
    const pts = trials.filter(function (t) { return isNum(t.N) && t.N > 0 && isNum(t.w); });
    const adv = [];
    if (pts.length < 2) {
      return { ok: false, pts: pts, adv: ["Se requieren al menos 2 puntos (la norma exige 3 ensayos)."] };
    }
    const Ns = pts.map(function (t) { return t.N; });
    const r = regresion(pts.map(function (t) { return log10(t.N); }), pts.map(function (t) { return t.w; }));
    const LLraw = r.b + r.m * log10(25);
    if (pts.length < 3) adv.push("D4318 (Método A) exige tres ensayos como mínimo.");
    else if (!cumpleRangosD4318(Ns))
      adv.push("Los golpes no cubren los intervalos que pide D4318: un ensayo en 25–35, uno en 20–30 y uno en 15–25.");
    if (Math.min.apply(null, Ns) > 25 || Math.max.apply(null, Ns) < 25)
      adv.push("25 golpes queda fuera del rango ensayado: el LL sería una extrapolación.");
    if (r.m >= 0) adv.push("La humedad no disminuye al aumentar los golpes: datos inconsistentes.");
    if (pts.length >= 3 && r.r2 < 0.95) adv.push("Ajuste lineal débil (R² = " + F(r.r2, 3) + "). Repita algún punto.");
    return {
      ok: true, pts: pts, m: r.m, b: r.b, r2: pts.length >= 3 ? r.r2 : null,
      LLraw: LLraw, LL: Math.round(LLraw), Fi: -r.m, adv: adv,
    };
  }

  // Método B (un punto): LL = w · (N/25)^0.121, válido entre 20 y 30 golpes
  function limiteLiquidoUnPunto(N, w) {
    const adv = [];
    if (!isNum(N) || !isNum(w) || N <= 0) return { ok: false, adv: ["Ingrese golpes y humedad."] };
    if (N < 20 || N > 30) adv.push("El Método B de D4318 es válido para 20–30 golpes. Repita el ensayo.");
    const LLraw = w * Math.pow(N / 25, 0.121);
    return { ok: true, LLraw: LLraw, LL: Math.round(LLraw), k: Math.pow(N / 25, 0.121), adv: adv };
  }

  // Límite plástico: lista de humedades de las determinaciones
  function limitePlastico(ws) {
    const v = ws.filter(isNum);
    const adv = [];
    if (!v.length) return { ok: false, adv: ["Ingrese al menos una determinación del límite plástico."] };
    const media = v.reduce(function (s, x) { return s + x; }, 0) / v.length;
    const dif = Math.max.apply(null, v) - Math.min.apply(null, v);
    if (v.length < 2) adv.push("D4318 pide dos determinaciones; se promedian.");
    return { ok: true, media: media, PLraw: media, PL: Math.round(media), dif: dif, n: v.length, adv: adv };
  }

  function descPlasticidad(PI) {
    if (!(PI > 0)) return "No plástico";
    if (PI <= 5) return "Ligeramente plástico";
    if (PI <= 10) return "Plasticidad baja";
    if (PI <= 20) return "Plasticidad media";
    if (PI <= 40) return "Plasticidad alta";
    return "Plasticidad muy alta";
  }

  function indicesPlasticidad(o) {
    // o: {LL, PL, wn (opcional), Fi (opcional), NP}
    const r = { adv: [] };
    if (o.NP || !isNum(o.LL) || !isNum(o.PL)) {
      r.NP = true; r.PI = 0; r.texto = "NP (no plástico)";
      return r;
    }
    const LL = Math.round(o.LL), PL = Math.round(o.PL);
    if (PL >= LL) {
      r.NP = true; r.PI = 0; r.LL = LL; r.PL = PL;
      r.texto = "NP (PL ≥ LL)";
      r.adv.push("PL ≥ LL: según D4318 el suelo se informa como no plástico (NP).");
      return r;
    }
    r.NP = false; r.LL = LL; r.PL = PL; r.PI = LL - PL;
    r.desc = descPlasticidad(r.PI);
    if (isNum(o.wn)) {
      r.IL = (o.wn - PL) / r.PI;
      r.IC = (LL - o.wn) / r.PI;
    }
    if (isNum(o.Fi) && o.Fi > 0) r.Tw = r.PI / o.Fi;
    if (r.PI > 0.9 * (LL - 8) + 0.5) r.adv.push("El punto (LL, PI) queda sobre la línea U: combinación poco probable, revise los datos.");
    return r;
  }

  /* ---------------------------------------------------------------------
     6. CLASIFICACIÓN SUCS (ASTM D2487)
     --------------------------------------------------------------------- */
  function lineaA(LL) { return 0.73 * (LL - 20); }
  function lineaU(LL) { return 0.9 * (LL - 8); }

  // Clasificación de la fracción fina según plasticidad
  function clasFinos(LL, PI, NP, org) {
    const ll = isNum(LL) ? LL : 0;
    const pi = NP ? 0 : PI;
    const aLine = lineaA(ll);
    const sobreA = pi >= aLine - 1e-9;
    let sim, arcilla;
    if (ll >= 50) {
      arcilla = !NP && sobreA;
      sim = org ? "OH" : arcilla ? "CH" : "MH";
    } else if (!NP && pi >= 4 && sobreA) {
      arcilla = true;
      sim = org ? "OL" : pi <= 7 ? "CL-ML" : "CL";
    } else {
      arcilla = false;
      sim = org ? "OL" : "ML";
    }
    return { sim: sim, arcilla: arcilla, aLine: aLine, sobreA: sobreA, pi: pi, ll: ll };
  }

  const NOM_G = {
    GW: "Grava bien graduada", GP: "Grava mal graduada", GM: "Grava limosa",
    GC: "Grava arcillosa", "GC-GM": "Grava limo-arcillosa",
  };
  const NOM_S = {
    SW: "Arena bien graduada", SP: "Arena mal graduada", SM: "Arena limosa",
    SC: "Arena arcillosa", "SC-SM": "Arena limo-arcillosa",
  };
  const NOM_F = {
    CL: ["Arcilla magra", true], CH: ["Arcilla grasa", true], ML: ["Limo", false],
    MH: ["Limo elástico", false], "CL-ML": ["Arcilla limosa", true],
  };

  function clasificarSUCS(i) {
    const pasos = [], adv = [];
    const Fn = Number(i.finos), G = Number(i.grava), S = Number(i.arena);
    if (![Fn, G, S].every(isNum))
      return { completo: false, msg: "Faltan los porcentajes de grava, arena y finos.", pasos: pasos, adv: adv };
    const NP = !!i.NP;
    const LL = isNum(i.LL) ? Math.round(i.LL) : null;
    const PI = NP ? 0 : isNum(i.PI) ? Math.round(i.PI) : null;
    const org = !!i.organico;
    const suma = Fn + G + S;
    if (Math.abs(suma - 100) > 1)
      adv.push("Grava + arena + finos suman " + F(suma, 1) + " % (deberían sumar 100 %).");
    const plastOk = NP || (LL !== null && PI !== null);

    /* ---------- Suelos de grano fino ---------- */
    if (Fn >= 50) {
      pasos.push("Finos (pasa 0,075 mm) = " + F(Fn, 1) + " % ≥ 50 % → suelo de grano fino.");
      if (!plastOk)
        return { completo: false, msg: "Faltan LL y PI (o marque «No plástico») para clasificar el suelo fino.", pasos: pasos, adv: adv };
      const c = clasFinos(LL, PI, NP, org);
      pasos.push(
        "LL = " + (NP && LL === null ? "NP" : F(LL, 0) + " %") + " → " +
        (c.ll >= 50 ? "LL ≥ 50: plasticidad alta." : "LL < 50: plasticidad baja a media.")
      );
      if (NP) pasos.push("Suelo no plástico (NP): PI < 4 → limo (M).");
      else {
        pasos.push(
          "Línea A en LL = " + F(LL, 0) + ": IP_A = 0,73·(LL − 20) = " + F(c.aLine, 1) +
          "; IP = " + F(PI, 0) + " → " + (c.sobreA ? "el punto cae sobre (o encima de) la línea A." : "el punto cae bajo la línea A.")
        );
        if (c.ll < 50 && c.sobreA && PI >= 4 && PI <= 7 && !org)
          pasos.push("4 ≤ IP ≤ 7 sobre la línea A → zona rayada de la carta: CL-ML.");
        else if (PI < 4) pasos.push("IP < 4 → se clasifica como limo (M).");
      }
      if (org) pasos.push("Suelo orgánico (LL secado al horno < 75 % del LL natural) → símbolo O.");
      let base, fem;
      if (org) { base = c.arcilla ? "Arcilla orgánica" : "Limo orgánico"; fem = c.arcilla; }
      else { base = NOM_F[c.sim][0]; fem = NOM_F[c.sim][1]; }
      const R = G + S;
      let nombre = base;
      if (R >= 30) {
        if (S >= G) { nombre += fem ? " arenosa" : " arenoso"; if (G >= 15) nombre += " con grava"; }
        else { nombre += fem ? " gravosa" : " gravoso"; if (S >= 15) nombre += " con arena"; }
        pasos.push("Fracción gruesa = " + F(R, 1) + " % ≥ 30 %: se agrega «arenoso/gravoso» según la fracción predominante.");
      } else if (R >= 15) {
        nombre += S >= G ? " con arena" : " con grava";
        pasos.push("Fracción gruesa = " + F(R, 1) + " % (15–29 %): se agrega «con arena» o «con grava».");
      }
      return { completo: true, tipo: "fino", sim: c.sim, nombre: nombre, pasos: pasos, adv: adv, fines: c };
    }

    /* ---------- Suelos de grano grueso ---------- */
    pasos.push("Finos (pasa 0,075 mm) = " + F(Fn, 1) + " % < 50 % → suelo de grano grueso.");
    const gruesa = G + S;
    const pctGrava = gruesa > 0 ? (G / gruesa) * 100 : 0;
    const esGrava = pctGrava > 50;
    pasos.push(
      "Grava = " + F(G, 1) + " %, arena = " + F(S, 1) + " %. Grava / fracción gruesa = " + F(pctGrava, 1) +
      " % → " + (esGrava ? "más de 50 % retenido en el Nº4: GRAVAS (G)." : "50 % o más pasa el Nº4: ARENAS (S).")
    );
    const L = esGrava ? "G" : "S";
    const nombres = esGrava ? NOM_G : NOM_S;
    const Cu = isNum(i.Cu) ? i.Cu : null, Cc = isNum(i.Cc) ? i.Cc : null;
    const cuMin = esGrava ? 4 : 6;
    let sim, nombre;

    const graduacion = function () {
      if (Cu === null || Cc === null) return null;
      const bien = Cu >= cuMin && Cc >= 1 && Cc <= 3;
      pasos.push(
        "Cu = " + F(Cu, 1) + " (≥ " + cuMin + "?) y Cc = " + F(Cc, 2) + " (entre 1 y 3?) → " +
        (bien ? "bien graduado (W)." : "mal graduado (P).")
      );
      return bien ? "W" : "P";
    };

    if (Fn < 5) {
      pasos.push("Finos < 5 % → suelo limpio: se evalúa solo la graduación.");
      const g = graduacion();
      if (g === null)
        return { completo: false, msg: "Faltan Cu y Cc (D10, D30 y D60 no determinables con los datos). Ingréselos o complete la hidrometría.", pasos: pasos, adv: adv };
      sim = L + g;
      nombre = nombres[sim];
    } else if (Fn <= 12) {
      pasos.push("Finos entre 5 y 12 % → símbolo doble (graduación + plasticidad de los finos).");
      const g = graduacion();
      if (g === null)
        return { completo: false, msg: "Faltan Cu y Cc para el símbolo doble (finos 5–12 %).", pasos: pasos, adv: adv };
      if (!plastOk)
        return { completo: false, msg: "Faltan LL y PI (o «No plástico») para clasificar los finos.", pasos: pasos, adv: adv };
      const c = clasFinos(LL, PI, NP, false);
      const esC = c.sim === "CL" || c.sim === "CH";
      pasos.push(
        "Finos del suelo: LL = " + (NP && LL === null ? "NP" : F(LL, 0)) + ", IP = " + F(PI, 0) + " → " + c.sim +
        (c.sim === "CL-ML" ? " (se asigna sufijo M, finos limosos)." : ".")
      );
      sim = L + g + "-" + L + (esC ? "C" : "M");
      nombre = nombres[L + g] + (esC ? " con arcilla" : " con limo");
    } else {
      pasos.push("Finos > 12 % → se clasifica según la plasticidad de los finos.");
      if (!plastOk)
        return { completo: false, msg: "Faltan LL y PI (o «No plástico») para clasificar los finos.", pasos: pasos, adv: adv };
      const c = clasFinos(LL, PI, NP, false);
      pasos.push(
        "Finos del suelo: LL = " + (NP && LL === null ? "NP" : F(LL, 0)) + ", IP = " + F(PI, 0) +
        (NP ? "" : " (IP_A = " + F(c.aLine, 1) + ")") + " → " + c.sim + "."
      );
      if (c.sim === "CL-ML") { sim = L + "C-" + L + "M"; nombre = nombres[sim]; }
      else if (c.sim === "CL" || c.sim === "CH") { sim = L + "C"; nombre = nombres[sim]; }
      else { sim = L + "M"; nombre = nombres[sim]; }
    }
    // Complementos de nombre (D2487): ≥ 15 % del otro componente grueso
    const otro = esGrava ? S : G;
    const palabra = esGrava ? "arena" : "grava";
    if (otro >= 15) {
      nombre += (nombre.indexOf(" con ") >= 0 ? " y " : " con ") + palabra;
      pasos.push(palabra.charAt(0).toUpperCase() + palabra.slice(1) + " = " + F(otro, 1) + " % ≥ 15 % → se agrega «" + palabra + "» al nombre.");
    }
    if (i.organico) nombre += (nombre.indexOf(" con ") >= 0 ? " y " : " con ") + "finos orgánicos";
    return { completo: true, tipo: "grueso", sim: sim, nombre: nombre, pasos: pasos, adv: adv };
  }

  /* ---------------------------------------------------------------------
     7. CLASIFICACIÓN AASHTO (M 145 / ASTM D3282)
     --------------------------------------------------------------------- */
  const DESC_AASHTO = {
    "A-1-a": "Fragmentos de roca, grava y arena",
    "A-1-b": "Grava y arena gruesa",
    "A-3": "Arena fina",
    "A-2-4": "Grava y arena limosa",
    "A-2-5": "Grava y arena limosa",
    "A-2-6": "Grava y arena arcillosa",
    "A-2-7": "Grava y arena arcillosa",
    "A-4": "Suelo limoso",
    "A-5": "Suelo limoso",
    "A-6": "Suelo arcilloso",
    "A-7-5": "Suelo arcilloso",
    "A-7-6": "Suelo arcilloso",
  };

  function clasificarAASHTO(i) {
    const pasos = [], adv = [];
    const P10 = isNum(i.P10) ? i.P10 : null;
    const P40 = isNum(i.P40) ? i.P40 : null;
    const P200 = isNum(i.P200) ? i.P200 : null;
    if (P200 === null) return { completo: false, msg: "Falta el % que pasa el tamiz Nº200.", pasos: pasos, adv: adv };
    const NP = !!i.NP;
    const LL = NP ? 0 : isNum(i.LL) ? Math.round(i.LL) : null;
    const PI = NP ? 0 : isNum(i.PI) ? Math.round(i.PI) : null;
    if (LL === null || PI === null)
      return { completo: false, msg: "Faltan LL y PI (o marque «No plástico»).", pasos: pasos, adv: adv };
    let g;
    if (P200 <= 35) {
      pasos.push("Pasa Nº200 = " + F(P200, 1) + " % ≤ 35 % → material granular (grupos A-1 a A-3).");
      if (P10 === null || P40 === null)
        return { completo: false, msg: "Faltan los % que pasan los tamices Nº10 y Nº40.", pasos: pasos, adv: adv };
      pasos.push("Pasa Nº10 = " + F(P10, 1) + " %, Nº40 = " + F(P40, 1) + " %, Nº200 = " + F(P200, 1) + " %, LL = " + (NP ? "NP" : F(LL, 0)) + ", IP = " + (NP ? "NP" : F(PI, 0)) + ".");
      if (P10 <= 50 && P40 <= 30 && P200 <= 15 && PI <= 6) {
        g = "A-1-a";
        pasos.push("Cumple Nº10 ≤ 50, Nº40 ≤ 30, Nº200 ≤ 15 e IP ≤ 6 → A-1-a.");
      } else if (P40 <= 50 && P200 <= 25 && PI <= 6) {
        g = "A-1-b";
        pasos.push("Cumple Nº40 ≤ 50, Nº200 ≤ 25 e IP ≤ 6 → A-1-b.");
      } else if (P40 >= 51 && P200 <= 10 && NP) {
        g = "A-3";
        pasos.push("Nº40 ≥ 51, Nº200 ≤ 10 y no plástico → A-3.");
      } else {
        const ll41 = LL >= 41, pi11 = PI >= 11;
        g = "A-2-" + (ll41 ? (pi11 ? "7" : "5") : pi11 ? "6" : "4");
        pasos.push(
          "No cumple A-1 ni A-3 → grupo A-2. LL " + (ll41 ? "≥ 41" : "≤ 40") + " e IP " + (pi11 ? "≥ 11" : "≤ 10") + " → " + g + "."
        );
      }
    } else {
      pasos.push("Pasa Nº200 = " + F(P200, 1) + " % > 35 % → suelo limo-arcilloso (grupos A-4 a A-7).");
      pasos.push("LL = " + (NP ? "NP" : F(LL, 0)) + ", IP = " + (NP ? "NP" : F(PI, 0)) + ".");
      const ll41 = LL >= 41, pi11 = PI >= 11;
      if (!ll41 && !pi11) g = "A-4";
      else if (ll41 && !pi11) g = "A-5";
      else if (!ll41 && pi11) g = "A-6";
      else {
        g = PI <= LL - 30 ? "A-7-5" : "A-7-6";
        pasos.push("A-7: IP " + (PI <= LL - 30 ? "≤" : ">") + " LL − 30 = " + F(LL - 30, 0) + " → " + g + ".");
      }
      pasos.push("Con LL " + (ll41 ? "≥ 41" : "≤ 40") + " e IP " + (pi11 ? "≥ 11" : "≤ 10") + " → " + g + ".");
    }
    // Índice de grupo
    let gi = 0, formula = "GI = 0 (grupo " + g + ")";
    if (g === "A-2-6" || g === "A-2-7") {
      gi = 0.01 * (P200 - 15) * (PI - 10);
      formula = "GI = 0,01·(F − 15)·(IP − 10) = 0,01·(" + F(P200, 1) + " − 15)·(" + F(PI, 0) + " − 10) = " + F(gi, 2);
    } else if (g.indexOf("A-4") === 0 || g.indexOf("A-5") === 0 || g.indexOf("A-6") === 0 || g.indexOf("A-7") === 0) {
      gi = (P200 - 35) * (0.2 + 0.005 * (LL - 40)) + 0.01 * (P200 - 15) * (PI - 10);
      formula =
        "GI = (F − 35)·[0,2 + 0,005·(LL − 40)] + 0,01·(F − 15)·(IP − 10) = (" + F(P200, 1) + " − 35)·[0,2 + 0,005·(" + F(LL, 0) +
        " − 40)] + 0,01·(" + F(P200, 1) + " − 15)·(" + F(PI, 0) + " − 10) = " + F(gi, 2);
    }
    const GI = Math.max(0, Math.round(gi));
    pasos.push(formula + (gi !== 0 ? " → GI = " + GI + " (redondeado, mínimo 0)." : "."));
    const calif = P200 <= 35 ? "Excelente a bueno" : "Regular a malo";
    return {
      completo: true, grupo: g, GI: GI, giCalculado: gi, formula: formula,
      sim: g + " (" + GI + ")", descripcion: DESC_AASHTO[g], subrasante: calif, pasos: pasos, adv: adv,
    };
  }

  return {
    config: cfg,
    TAMICES: TAMICES, CT_TABLA: CT_TABLA, ESCALAS: ESCALAS,
    tamizado: tamizado, pasaEn: pasaEn, dEnP: dEnP, parametros: parametros,
    ctTemp: ctTemp, viscosidadAgua: viscosidadAgua, densidadAgua: densidadAgua, factorA: factorA,
    hidrometria: hidrometria, curvaCombinada: curvaCombinada, verificarMonotonia: verificarMonotonia,
    fracciones: fracciones,
    humedad: humedad, regresion: regresion, cumpleRangosD4318: cumpleRangosD4318,
    limiteLiquidoMulti: limiteLiquidoMulti, limiteLiquidoUnPunto: limiteLiquidoUnPunto,
    limitePlastico: limitePlastico, indicesPlasticidad: indicesPlasticidad, descPlasticidad: descPlasticidad,
    lineaA: lineaA, lineaU: lineaU, clasFinos: clasFinos,
    clasificarSUCS: clasificarSUCS, clasificarAASHTO: clasificarAASHTO,
  };
});
