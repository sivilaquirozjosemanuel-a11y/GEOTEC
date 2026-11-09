/* =========================================================================
   lab.js — utilidades comunes de las páginas de laboratorio
   - formato numérico (coma/punto), lectura de campos, pegado desde Excel
   - datos generales del ensayo (se recuerdan en el navegador)
   - gráficos SVG: curva granulométrica, curva de flujo, carta de plasticidad
   - bloques de reporte (encabezado, tablas, pie) e impresión a PDF
   Depende de suelos.js
   ========================================================================= */
(function (root) {
  "use strict";
  const S = root.Suelos;

  /* ---------------------------- formato ---------------------------- */
  let DEC = ",";
  try { DEC = localStorage.getItem("geotec:decimal") || ","; } catch (e) {}

  function fmt(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return "—";
    let s = Number(x).toFixed(d === undefined ? 2 : d);
    if (s === "-0" || /^-0\.?0*$/.test(s)) s = s.slice(1);
    return DEC === "," ? s.replace(".", ",") : s;
  }
  S.config.fmt = function (x, d) { return fmt(x, d === undefined ? 1 : d); };

  // Número con cifras significativas razonables para diámetros (mm)
  function fmtD(x) {
    if (!isFinite(x)) return "—";
    const d = x >= 10 ? 1 : x >= 1 ? 2 : x >= 0.1 ? 3 : 4;
    const s = String(Number(x.toFixed(d)));           // sin ceros finales: 0,075 · 12,5 · 0,0365
    return DEC === "," ? s.replace(".", ",") : s;
  }

  function parse(v) {
    if (v === null || v === undefined) return NaN;
    const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
    if (s === "") return NaN;
    return Number(s);
  }

  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function hoy() {
    const d = new Date();
    const p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function fechaES(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
    const a = iso.split("-");
    return a[2] + "/" + a[1] + "/" + a[0];
  }

  /* ---------------------------- almacenamiento ---------------------------- */
  function save(key, obj) {
    try { localStorage.setItem("geotec:" + key, JSON.stringify(obj)); } catch (e) {}
  }
  function load(key) {
    try { const v = localStorage.getItem("geotec:" + key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }

  /* ---------------------------- datos generales ---------------------------- */
  const CAMPOS = [
    ["proyecto", "Proyecto", "text"], ["ubicacion", "Ubicación", "text"],
    ["punto", "Calicata / sondeo", "text"], ["muestra", "Muestra N°", "text"],
    ["profundidad", "Profundidad (m)", "text"], ["fecha", "Fecha del ensayo", "date"],
    ["operador", "Ensayado por", "text"], ["revisor", "Revisado por", "text"],
  ];

  function initGeneral(cont, onChange) {
    const g = load("general") || {};
    if (!g.fecha) g.fecha = hoy();
    cont.innerHTML = CAMPOS.map(function (c) {
      return '<div class="field"><label for="g_' + c[0] + '">' + c[1] + '</label><input id="g_' + c[0] +
        '" type="' + c[2] + '" value="' + esc(g[c[0]] || "") + '"></div>';
    }).join("");
    $$("input", cont).forEach(function (el) {
      el.addEventListener("input", function () { save("general", getGeneral()); if (onChange) onChange(); });
    });
  }
  function getGeneral() {
    const g = {};
    CAMPOS.forEach(function (c) {
      const el = document.getElementById("g_" + c[0]);
      g[c[0]] = el ? el.value : "";
    });
    return g;
  }

  function initDecimal(sel, onChange) {
    sel.value = DEC;
    sel.addEventListener("change", function () {
      DEC = sel.value;
      try { localStorage.setItem("geotec:decimal", DEC); } catch (e) {}
      if (onChange) onChange();
    });
  }

  /* ---------------------------- pegado desde Excel ---------------------------- */
  function enablePaste(table, onChange) {
    table.addEventListener("paste", function (ev) {
      const t = ev.target;
      if (!t || t.tagName !== "INPUT") return;
      const txt = (ev.clipboardData || root.clipboardData).getData("text");
      if (!/[\t\n]/.test(txt.replace(/[\r\n]+$/, ""))) return; // pegado simple
      ev.preventDefault();
      const filas = txt.replace(/\r/g, "").replace(/\n+$/, "").split("\n").map(function (l) { return l.split("\t"); });
      const tr0 = t.closest("tr");
      const cols0 = $$("input", tr0);
      let c0 = cols0.indexOf(t);
      let tr = tr0;
      filas.forEach(function (f) {
        if (!tr) return;
        const inputs = $$("input", tr);
        f.forEach(function (v, j) {
          const el = inputs[c0 + j];
          if (el && !el.readOnly) { el.value = v.trim(); }
        });
        tr = tr.nextElementSibling;
      });
      if (onChange) onChange();
    });
  }

  /* ---------------------------- CSV e impresión ---------------------------- */
  function downloadCSV(nombre, filas) {
    const csv = "﻿" + filas.map(function (r) {
      return r.map(function (c) {
        c = String(c === null || c === undefined ? "" : c);
        return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(";");
    }).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function imprimir(titulo) {
    const old = document.title;
    document.title = titulo || old;
    const restore = function () { document.title = old; root.removeEventListener("afterprint", restore); };
    root.addEventListener("afterprint", restore);
    root.print();
  }

  function segmented(cont, opciones, actual, onChange) {
    cont.classList.add("seg");
    function pintar() {
      cont.innerHTML = "";
      opciones.forEach(function (o) {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = o[1];
        b.setAttribute("aria-pressed", String(o[0] === actual));
        b.addEventListener("click", function () { actual = o[0]; pintar(); onChange(actual); });
        cont.appendChild(b);
      });
    }
    pintar();
  }

  /* ---------------------------- bloques de reporte ---------------------------- */
  function sitio() { return (root.SITE && root.SITE.titulo) || "Geotec-Estructural"; }
  function autor() { return (root.SITE && root.SITE.autor) || ""; }

  function reportHead(titulo, normas) {
    const g = getGeneral();
    const celda = function (k, v) { return '<td class="k">' + k + "</td><td>" + (esc(v) || "&nbsp;") + "</td>"; };
    return (
      '<div class="rp-head"><div><div class="site">' + esc(sitio()) + " · Laboratorio de suelos</div><h1>" + esc(titulo) +
      '</h1></div><div class="norm"><b>Normas de referencia</b><br>' + normas.map(esc).join("<br>") + "</div></div>" +
      '<table class="rp-meta"><tr>' + celda("Proyecto", g.proyecto) + celda("Ubicación", g.ubicacion) + "</tr><tr>" +
      celda("Calicata / sondeo", g.punto) + celda("Muestra N°", g.muestra) + "</tr><tr>" +
      celda("Profundidad (m)", g.profundidad) + celda("Fecha del ensayo", fechaES(g.fecha)) + "</tr></table>"
    );
  }

  function reportFoot() {
    const g = getGeneral();
    return (
      '<div class="rp-sign"><div>' + (esc(g.operador) || "&nbsp;") + "<br>Ensayado por</div><div>" + (esc(g.revisor) || "&nbsp;") +
      "<br>Revisado por</div></div>"
    );
  }

  // Inserta el reporte en su contenedor con un pie que se repite en cada hoja impresa (tfoot).
  function setReport(el, html) {
    el.innerHTML =
      '<table class="rp-wrap"><tbody><tr><td>' + html + "</td></tr></tbody><tfoot><tr><td>" +
      '<div class="rp-foot"><span>' + esc(autor()) + " · " + esc(sitio()) + "</span><span>Reporte generado el " +
      fechaES(hoy()) + "</span></div></td></tr></tfoot></table>";
  }

  // tabla de reporte: head = [..], rows = [[..]], izq = índices de columnas alineadas a la izquierda
  function tabla(head, rows, izq, clsFilas) {
    izq = izq || [0];
    let h = '<table class="rt"><thead><tr>' + head.map(function (x) { return "<th>" + x + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r, i) {
      h += "<tr" + (clsFilas && clsFilas[i] ? ' class="' + clsFilas[i] + '"' : "") + ">" +
        r.map(function (c, j) { return "<td" + (izq.indexOf(j) >= 0 ? ' class="l"' : "") + ">" + c + "</td>"; }).join("") + "</tr>";
    });
    return h + "</tbody></table>";
  }

  function formula(expr, nota) {
    return '<div class="formula">' + expr + (nota ? "<small>" + nota + "</small>" : "") + "</div>";
  }

  function alertas(lista, clase) {
    return lista.map(function (a) { return '<div class="alert ' + (clase || "warn") + '">' + esc(a) + "</div>"; }).join("");
  }
  function alertasReporte(lista) {
    return lista.map(function (a) { return '<div class="rp-warn">' + esc(a) + "</div>"; }).join("");
  }

  /* ---------------------------- utilidades de gráficos ---------------------------- */
  const r1 = function (v) { return Math.round(v * 10) / 10; };

  function vacio(msg) {
    return '<svg class="chart" viewBox="0 0 900 180" xmlns="http://www.w3.org/2000/svg" role="img"><text x="450" y="95" text-anchor="middle" class="tick" style="font-size:15px">' +
      esc(msg || "Ingrese datos para ver el gráfico") + "</text></svg>";
  }

  // Spline cúbico monótono (Fritsch–Carlson). P: [[x,y]] con x creciente.
  function monotonePath(P) {
    const pts = [];
    P.forEach(function (p) { if (!pts.length || p[0] > pts[pts.length - 1][0] + 1e-6) pts.push(p); });
    const n = pts.length;
    if (n === 0) return "";
    if (n === 1) return "M" + r1(pts[0][0]) + "," + r1(pts[0][1]);
    const dx = [], m = [], t = new Array(n);
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    let d = "M" + r1(pts[0][0]) + "," + r1(pts[0][1]);
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i];
      d += " C" + r1(pts[i][0] + h / 3) + "," + r1(pts[i][1] + (t[i] * h) / 3) + " " +
        r1(pts[i + 1][0] - h / 3) + "," + r1(pts[i + 1][1] - (t[i + 1] * h) / 3) + " " +
        r1(pts[i + 1][0]) + "," + r1(pts[i + 1][1]);
    }
    return d;
  }

  function niceStep(rango, n) {
    const raw = rango / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }

  function txt(x, y, s, cls, extra) {
    return '<text x="' + r1(x) + '" y="' + r1(y) + '" class="' + (cls || "") + '" ' + (extra || "") + ">" + s + "</text>";
  }

  /* ---------------------------- curva granulométrica ---------------------------- */
  // o: {pts (d asc, {d,p,tipo}), escala: 'SUCS'|'AASHTO'|'MIT', D:{D10,D30,D60}, tamices:[{d,name}]}
  function chartGranulometria(o) {
    if (!o.pts || o.pts.length < 2) return vacio("Ingrese las masas retenidas para ver la curva granulométrica");
    const W = 900, H = 570, ml = 64, mr = 26, mt = 98, mb = 64, pw = W - ml - mr, ph = H - mt - mb;
    const X = function (d) { return ml + ((2 - Math.log10(d)) / 5) * pw; };
    const Y = function (p) { return mt + (1 - p / 100) * ph; };
    const esc_ = S.ESCALAS[o.escala || "SUCS"];
    const bandCol = ["--band-a", "--band-b", "--band-c", "--band-d"];
    let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Curva granulométrica">';
    // bandas de fracciones
    esc_.limites.forEach(function (b, i) {
      const hi = Math.min(b.hi, 100), lo = Math.max(b.lo, 0.001);
      const x1 = X(hi), x2 = X(lo), w = x2 - x1;
      s += '<rect x="' + r1(x1) + '" y="' + mt + '" width="' + r1(w) + '" height="' + ph + '" style="fill:var(' + bandCol[i % 4] + ')"/>';
      s += '<rect x="' + r1(x1) + '" y="' + (mt - 24) + '" width="' + r1(w) + '" height="22" style="fill:var(' + bandCol[i % 4] + ');stroke:var(--c-grid)"/>';
      const nm = b.n;
      let lab = null;
      if (w >= nm.length * 6.6 + 10) lab = nm; else if (w >= 30) lab = nm.slice(0, 4) + ".";
      if (lab) s += txt(x1 + w / 2, mt - 9, esc(lab), "", 'text-anchor="middle" style="font-size:13.5px;font-weight:700"');
    });
    // cuadrícula horizontal
    for (let p = 0; p <= 100; p += 10) {
      s += '<line x1="' + ml + '" x2="' + (ml + pw) + '" y1="' + r1(Y(p)) + '" y2="' + r1(Y(p)) + '" class="' + (p % 20 === 0 ? "gm" : "gn") + '"/>';
      s += txt(ml - 8, Y(p) + 4, p, "tick", 'text-anchor="end"');
    }
    // cuadrícula vertical (décadas y subdivisiones)
    for (let e = 2; e >= -3; e--) {
      for (let k = 1; k <= 9; k++) {
        const d = k * Math.pow(10, e);
        if (d > 100.0001 || d < 0.00099) continue;
        s += '<line x1="' + r1(X(d)) + '" x2="' + r1(X(d)) + '" y1="' + mt + '" y2="' + (mt + ph) + '" class="' + (k === 1 ? "gm" : "gn") + '"/>';
      }
      const dd = Math.pow(10, e);
      s += txt(X(dd), mt + ph + 18, fmt(dd, e >= 0 ? 0 : -e), "tick", 'text-anchor="middle"');
    }
    // tamices (guías y nombres arriba)
    (o.tamices || []).forEach(function (t) {
      if (t.d > 100 || t.d < 0.001) return;
      const x = X(t.d);
      s += '<line x1="' + r1(x) + '" x2="' + r1(x) + '" y1="' + (mt - 30) + '" y2="' + (mt - 24) + '" class="gm" style="stroke:var(--c-ax)"/>';
      s += '<text x="' + r1(x + 3.5) + '" y="' + (mt - 33) + '" class="tick" transform="rotate(-90 ' + r1(x + 3.5) + " " + (mt - 33) + ')" style="font-size:10.5px">' + esc(t.name) + "</text>";
    });
    // ejes
    s += '<rect x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '" class="axl"/>';
    s += txt(ml + pw / 2, H - 18, "Diámetro de partícula, D (mm) — escala logarítmica", "atitle", 'text-anchor="middle"');
    s += '<text x="18" y="' + (mt + ph / 2) + '" class="atitle" text-anchor="middle" transform="rotate(-90 18 ' + (mt + ph / 2) + ')">% que pasa (en masa)</text>';
    // líneas D10, D30, D60
    const Dm = o.D || {};
    [["D10", 10], ["D30", 30], ["D60", 60]].forEach(function (k) {
      const v = Dm[k[0]];
      if (!v || v > 100 || v < 0.001) return;
      const x = X(v), y = Y(k[1]);
      s += '<path d="M' + ml + "," + r1(y) + " H" + r1(x) + " V" + (mt + ph) + '" fill="none" style="stroke:var(--c-ax)" stroke-width="1.3" stroke-dasharray="5 4"/>';
      s += txt(ml + 8, y - 6, k[0] + " = " + fmtD(v) + " mm", "halo", 'style="font-size:13.5px;font-weight:700"');
      s += txt(ml + 8, y - 6, k[0] + " = " + fmtD(v) + " mm", "", 'style="font-size:13.5px;font-weight:700"');
    });
    // curva
    const curva = o.pts.filter(function (p) { return p.d >= 0.00099 && p.d <= 100.5; })
      .slice().reverse().map(function (p) { return [X(Math.min(100, p.d)), Y(Math.max(0, Math.min(100, p.p)))]; });
    s += '<path d="' + monotonePath(curva) + '" fill="none" style="stroke:var(--c-curve)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>';
    // marcadores
    o.pts.forEach(function (p) {
      if (p.d < 0.00099 || p.d > 100.5) return;
      const x = X(Math.min(100, p.d)), y = Y(Math.max(0, Math.min(100, p.p)));
      if (p.tipo === "hidrometro")
        s += '<path d="M' + r1(x) + "," + r1(y - 5.6) + " l5.6,5.6 l-5.6,5.6 l-5.6,-5.6 z" + '" style="fill:var(--c-curve2);stroke:var(--halo)" stroke-width="1.2"/>';
      else s += '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="4.4" style="fill:var(--c-curve);stroke:var(--halo)" stroke-width="1.4"/>';
    });
    // leyenda
    const hay = o.pts.some(function (p) { return p.tipo === "hidrometro"; });
    const lx = ml + pw - 178, ly = mt + 16;
    s += '<rect x="' + (lx - 8) + '" y="' + (ly - 14) + '" width="176" height="' + (hay ? 44 : 24) + '" rx="6" style="fill:var(--halo);stroke:var(--c-grid)" opacity=".92"/>';
    s += '<circle cx="' + (lx + 4) + '" cy="' + ly + '" r="4.4" style="fill:var(--c-curve)"/>' + txt(lx + 16, ly + 4, "Tamizado", "", 'style="font-size:13px"');
    if (hay) s += '<path d="M' + (lx + 4) + "," + (ly + 14) + " l5,5 l-5,5 l-5,-5 z" + '" style="fill:var(--c-curve2)"/>' + txt(lx + 16, ly + 24, "Hidrómetro", "", 'style="font-size:13px"');
    return s + "</svg>";
  }

  /* ---------------------------- curva de flujo ---------------------------- */
  // o: {pts:[{N,w}], m, b, LL}
  function chartFlujo(o) {
    if (!o.pts || !o.pts.length) return vacio("Ingrese golpes y humedades para ver la curva de flujo");
    const allp = o.pts.concat(o.excl || []);
    const W = 760, H = 470, ml = 62, mr = 26, mt = 22, mb = 60, pw = W - ml - mr, ph = H - mt - mb;
    const ws = allp.map(function (p) { return p.w; });
    if (isFinite(o.LL)) ws.push(o.LL);
    const lo = Math.min.apply(null, ws), hi = Math.max.apply(null, ws);
    const pad = Math.max(2, (hi - lo) * 0.3);
    const step = niceStep(hi - lo + 2 * pad, 6);
    const y0 = Math.floor((lo - pad) / step) * step, y1 = Math.ceil((hi + pad) / step) * step;
    const X = function (N) { return ml + ((Math.log10(N) - 1) / 1) * pw; };
    const Y = function (w) { return mt + (1 - (w - y0) / (y1 - y0)) * ph; };
    let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Curva de flujo">';
    for (let w = y0; w <= y1 + 1e-9; w += step) {
      s += '<line x1="' + ml + '" x2="' + (ml + pw) + '" y1="' + r1(Y(w)) + '" y2="' + r1(Y(w)) + '" class="gm"/>';
      s += txt(ml - 8, Y(w) + 4, fmt(w, step < 1 ? 1 : 0), "tick", 'text-anchor="end"');
    }
    [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100].forEach(function (N) {
      s += '<line x1="' + r1(X(N)) + '" x2="' + r1(X(N)) + '" y1="' + mt + '" y2="' + (mt + ph) + '" class="' + (N === 10 || N === 100 || N === 25 ? "gm" : "gn") + '"/>';
      s += txt(X(N), mt + ph + 18, N, "tick", 'text-anchor="middle"');
    });
    s += '<rect x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '" class="axl"/>';
    s += txt(ml + pw / 2, H - 14, "Número de golpes, N — escala logarítmica", "atitle", 'text-anchor="middle"');
    s += '<text x="16" y="' + (mt + ph / 2) + '" class="atitle" text-anchor="middle" transform="rotate(-90 16 ' + (mt + ph / 2) + ')">Contenido de humedad, w (%)</text>';
    // recta de ajuste
    if (isFinite(o.m) && isFinite(o.b) && o.pts.length >= 2) {
      const Ns = o.pts.map(function (p) { return p.N; });
      const a = Math.max(10, Math.min(Math.min.apply(null, Ns), 25) * 0.8), z = Math.min(100, Math.max(Math.max.apply(null, Ns), 25) * 1.25);
      s += '<line x1="' + r1(X(a)) + '" y1="' + r1(Y(o.b + o.m * Math.log10(a))) + '" x2="' + r1(X(z)) + '" y2="' + r1(Y(o.b + o.m * Math.log10(z))) +
        '" style="stroke:var(--c-curve)" stroke-width="2.6" stroke-linecap="round"/>';
    }
    // 25 golpes y LL
    if (isFinite(o.LL)) {
      const xl = X(25), yl = Y(o.LL);
      s += '<path d="M' + r1(xl) + "," + (mt + ph) + " V" + r1(yl) + " H" + ml + '" fill="none" style="stroke:var(--c-curve2)" stroke-width="1.6" stroke-dasharray="6 4"/>';
      s += '<circle cx="' + r1(xl) + '" cy="' + r1(yl) + '" r="5.5" style="fill:var(--c-curve2);stroke:var(--halo)" stroke-width="1.5"/>';
      s += txt(xl + 10, yl - 10, "LL = " + fmt(o.LL, 1) + " % (25 golpes)", "halo", 'style="font-size:13px;font-weight:700"');
      s += txt(xl + 10, yl - 10, "LL = " + fmt(o.LL, 1) + " % (25 golpes)", "", 'style="font-size:13px;font-weight:700"');
    }
    o.pts.forEach(function (p) {
      s += '<circle cx="' + r1(X(Math.min(100, Math.max(10, p.N)))) + '" cy="' + r1(Y(p.w)) + '" r="5" style="fill:var(--c-curve);stroke:var(--halo)" stroke-width="1.5"/>';
    });
    (o.excl || []).forEach(function (p) {
      s += '<circle cx="' + r1(X(Math.min(100, Math.max(10, p.N)))) + '" cy="' + r1(Y(p.w)) + '" r="5.5" fill="none" style="stroke:var(--c-ax)" stroke-width="2"/>';
    });
    if (o.excl && o.excl.length) s += '<circle cx="' + (ml + 14) + '" cy="' + (mt + ph - 14) + '" r="5.5" fill="none" style="stroke:var(--c-ax)" stroke-width="2"/>' + txt(ml + 26, mt + ph - 9, "punto descartado", "tick", "");
    return s + "</svg>";
  }

  /* ---------------------------- carta de plasticidad ---------------------------- */
  // o: {puntos:[{LL, PI, label}], uid}
  function chartPlasticidad(o) {
    const pts = (o.puntos || []).filter(function (p) { return isFinite(p.LL) && isFinite(p.PI); });
    const maxLL = Math.max(100, Math.ceil((Math.max.apply(null, [0].concat(pts.map(function (p) { return p.LL; }))) + 5) / 10) * 10);
    const maxPI = Math.max(60, Math.ceil((Math.max.apply(null, [0].concat(pts.map(function (p) { return p.PI; }))) + 5) / 10) * 10);
    const W = 760, H = 560, ml = 62, mr = 22, mt = 20, mb = 58, pw = W - ml - mr, ph = H - mt - mb;
    const X = function (v) { return ml + (v / maxLL) * pw; };
    const Y = function (v) { return mt + (1 - v / maxPI) * ph; };
    const uid = o.uid || "a";
    let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Carta de plasticidad de Casagrande">';
    s += '<defs><pattern id="hch' + uid + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" style="stroke:var(--c-ax)" stroke-width="1"/></pattern>' +
      '<clipPath id="clp' + uid + '"><rect x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '"/></clipPath></defs>';
    for (let v = 0; v <= maxLL; v += 10) {
      s += '<line x1="' + r1(X(v)) + '" x2="' + r1(X(v)) + '" y1="' + mt + '" y2="' + (mt + ph) + '" class="' + (v % 50 === 0 ? "gm" : "gn") + '"/>';
      s += txt(X(v), mt + ph + 18, v, "tick", 'text-anchor="middle"');
    }
    for (let v = 0; v <= maxPI; v += 10) {
      s += '<line x1="' + ml + '" x2="' + (ml + pw) + '" y1="' + r1(Y(v)) + '" y2="' + r1(Y(v)) + '" class="gn"/>';
      s += txt(ml - 8, Y(v) + 4, v, "tick", 'text-anchor="end"');
    }
    s += '<g clip-path="url(#clp' + uid + ')">';
    // zona CL-ML (rayada)
    s += '<polygon points="' + [[10, 4], [25.48, 4], [29.59, 7], [10, 7]].map(function (p) { return r1(X(p[0])) + "," + r1(Y(p[1])); }).join(" ") +
      '" style="fill:url(#hch' + uid + ');stroke:var(--c-ax)" stroke-width="1"/>';
    // línea A y piso PI = 4
    s += '<path d="M' + r1(X(0)) + "," + r1(Y(4)) + " H" + r1(X(25.48)) + " L" + r1(X(maxLL)) + "," + r1(Y(S.lineaA(maxLL))) + '" fill="none" style="stroke:var(--c-txt)" stroke-width="2"/>';
    // línea U
    s += '<path d="M' + r1(X(16)) + "," + r1(Y(0)) + " V" + r1(Y(7.2)) + " L" + r1(X(maxLL)) + "," + r1(Y(S.lineaU(maxLL))) + '" fill="none" style="stroke:var(--c-ax)" stroke-width="1.5" stroke-dasharray="7 4"/>';
    // LL = 50
    s += '<line x1="' + r1(X(50)) + '" x2="' + r1(X(50)) + '" y1="' + mt + '" y2="' + (mt + ph) + '" style="stroke:var(--c-txt)" stroke-width="1.6"/>';
    s += "</g>";
    s += '<rect x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '" class="axl"/>';
    // etiquetas de zonas
    const zl = function (x, y, t, sz) { return txt(X(x), Y(y), t, "", 'text-anchor="middle" style="font-size:' + (sz || 16) + 'px;font-weight:800;opacity:.55"'); };
    s += zl(37, 24, "CL") + zl(75, 52, "CH", 18) + zl(38, 6.6, "ML u OL", 13) + zl(76, 16, "MH u OH", 16) + zl(18, 8.7, "CL-ML", 10.5) + zl(9, 1.8, "ML", 11);
    s += '<text x="' + r1(X(Math.min(maxLL - 14, 84))) + '" y="' + r1(Y(S.lineaA(Math.min(maxLL - 14, 84))) - 8) + '" class="tick" style="font-size:13.5px;font-weight:700" transform="rotate(-' + r1((Math.atan((0.73 * (maxLL / pw)) / (maxPI / ph)) * 180) / Math.PI * 1) + " " +
      r1(X(Math.min(maxLL - 14, 84))) + " " + r1(Y(S.lineaA(Math.min(maxLL - 14, 84))) - 8) + ')">Línea A</text>';
    s += txt(X(50) + 5, Y(maxPI) + 14, "LL = 50", "tick", 'style="font-size:11px"');
    s += txt(ml + pw / 2, H - 14, "Límite líquido, LL (%)", "atitle", 'text-anchor="middle"');
    s += '<text x="16" y="' + (mt + ph / 2) + '" class="atitle" text-anchor="middle" transform="rotate(-90 16 ' + (mt + ph / 2) + ')">Índice de plasticidad, IP (%)</text>';
    // puntos de la muestra
    pts.forEach(function (p) {
      const x = X(p.LL), y = Y(p.PI);
      s += '<path d="M' + ml + "," + r1(y) + " H" + r1(x) + " V" + (mt + ph) + '" fill="none" style="stroke:var(--c-curve2)" stroke-width="1.2" stroke-dasharray="4 4"/>';
      s += '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="6.5" style="fill:var(--c-curve2);stroke:var(--halo)" stroke-width="1.8"/>';
      const lab = (p.label ? p.label + ": " : "") + "LL = " + fmt(p.LL, 0) + ", IP = " + fmt(p.PI, 0);
      const tx = x > ml + pw * 0.6 ? x - 12 : x + 12, an = x > ml + pw * 0.6 ? "end" : "start";
      s += txt(tx, y - 11, esc(lab), "halo", 'text-anchor="' + an + '" style="font-size:13px;font-weight:700"');
      s += txt(tx, y - 11, esc(lab), "", 'text-anchor="' + an + '" style="font-size:13px;font-weight:700"');
    });
    return s + "</svg>";
  }

  root.Lab = {
    fmt: fmt, fmtD: fmtD, parse: parse, $: $, $$: $$, esc: esc, hoy: hoy, fechaES: fechaES,
    save: save, load: load, initGeneral: initGeneral, getGeneral: getGeneral, initDecimal: initDecimal,
    enablePaste: enablePaste, downloadCSV: downloadCSV, imprimir: imprimir, segmented: segmented,
    reportHead: reportHead, reportFoot: reportFoot, setReport: setReport, tabla: tabla, formula: formula,
    alertas: alertas, alertasReporte: alertasReporte,
    chartGranulometria: chartGranulometria, chartFlujo: chartFlujo, chartPlasticidad: chartPlasticidad,
    dec: function () { return DEC; },
  };
})(typeof window !== "undefined" ? window : this);
