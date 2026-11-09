/* Pruebas numéricas del motor de cálculo. Ejecutar: node dev/test_suelos.js */
const S = require("../assets/suelos.js");
let ok = 0, fail = 0;
function eq(nombre, real, esperado, tol) {
  tol = tol === undefined ? 1e-6 : tol;
  const pasa = typeof esperado === "number" ? Math.abs(real - esperado) <= tol : real === esperado;
  if (pasa) ok++; else { fail++; console.log("FALLA:", nombre, "→ obtenido", real, "esperado", esperado); }
}

/* ---- 1. Tamizado ---- */
const masas = { '3"': 0, '2"': 0, '1½"': 45, '1"': 110, "¾\"": 90, "½\"": 95, "⅜\"": 70, "Nº4": 130, "Nº10": 130, "Nº20": 90, "Nº40": 70, "Nº60": 45, "Nº100": 35, "Nº200": 30 };
const filas = S.TAMICES.map(t => ({ name: t.name, d: t.d, ret: masas[t.name] }));
const tam = S.tamizado(filas, 60, 1000);
const pasa = n => tam.filas.find(r => r.name === n).pasa;
eq("pasa 1½\"", pasa('1½"'), 95.5);
eq("pasa Nº4", pasa("Nº4"), 46.0);
eq("pasa Nº10", pasa("Nº10"), 33.0);
eq("pasa Nº40", pasa("Nº40"), 17.0);
eq("pasa Nº200", pasa("Nº200"), 6.0);
eq("pérdida", tam.perdida.pct, 0);

const pts = tam.puntos;
const par = S.parametros(pts);
// D60: 60 % entre ½" (66,0) y ⅜" (59,0) → 10^(log 9,5 + (1/7)·log(12,5/9,5)) ≈ 9,87 mm
eq("D60 ≈ 9,9", Math.round(par.D60 * 10) / 10, 9.9);
eq("D10 ≈ 0,17", Math.round(par.D10 * 100) / 100, 0.17);
eq("D30 ≈ 1,50", Math.round(par.D30 * 100) / 100, 1.5);
eq("Cu ≈ 56,9", Math.round(par.Cu * 10) / 10, 56.9);
eq("Cc ≈ 1,32", Math.round(par.Cc * 100) / 100, 1.32);
eq("pasaEn exacto 4.75", S.pasaEn(pts, 4.75).v, 46.0);
eq("pasaEn 0.01 (sin datos)", S.pasaEn(pts, 0.01), null);
// grava / arena / finos
const G = 100 - S.pasaEn(pts, 4.75).v, F200 = S.pasaEn(pts, 0.075).v;
eq("grava", G, 54);
eq("arena", 100 - G - F200, 40);

/* ---- 2. Hidrometría ---- */
eq("factor a (Gs 2.65)", S.factorA(2.65), 1.0, 1e-9);
eq("factor a (Gs 2.50) ≈ 1.04", Math.round(S.factorA(2.5) * 100) / 100, 1.04);
eq("factor a (Gs 2.85) ≈ 0.96", Math.round(S.factorA(2.85) * 100) / 100, 0.96);
eq("Ct 20 °C", S.ctTemp(20), 0);
eq("Ct 22 °C", S.ctTemp(22), 0.4);
eq("Ct 20.5 °C", S.ctTemp(20.5), 0.1, 1e-9);
// K comparado con la tabla D422 (20 °C, Gs 2.65 → 0.01365; 25 °C → 0.01286; 16 °C → 0.01435)
function K(T, Gs) {
  const G1 = S.densidadAgua(T) / 0.999972;
  return Math.sqrt((30 * S.viscosidadAgua(T)) / (980 * (Gs - G1)));
}
eq("K 20 °C", K(20, 2.65), 0.01365, 0.00005);
eq("K 25 °C", K(25, 2.65), 0.01286, 0.00005);
eq("K 16 °C", K(16, 2.65), 0.01435, 0.00007);
eq("viscosidad 20 °C (poise)", S.viscosidadAgua(20), 0.01002, 0.00005);
eq("densidad 4 °C", S.densidadAgua(4), 0.999972, 0.00001);
// L = 16.29 − 0.164 R  (tabla: R=50 → 8.1; R=0 → 16.3)
const hid = S.hidrometria({ Gs: 2.65, Ws: 50, Fz: 2, Cm: 1, Pref: 35.5 }, [
  { t: 2, T: 21, R: 8.5 }, { t: 1440, T: 19.5, R: 3.5 },
]);
eq("L(R=9.5)", hid.filas[0].L, 16.29 - 0.164 * 9.5, 1e-9);
eq("Rc", hid.filas[0].Rc, 8.5 - 2 + 0.2, 1e-9);
eq("P", hid.filas[0].P, (6.7 / 50) * 100, 1e-9);
eq("Ptot", hid.filas[0].Ptot, (6.7 / 50) * 100 * 0.355, 1e-9);
eq("D(2 min) ≈ 0,037", Math.round(hid.filas[0].D * 1000) / 1000, 0.037);
eq("D baja con t", hid.filas[1].D < hid.filas[0].D, true);
const comb = S.curvaCombinada(tam, hid);
eq("curva combinada ordenada", comb[0].d < comb[1].d, true);
eq("combinada incluye hidrómetro", comb.filter(p => p.tipo === "hidrometro").length, 2);
const frMIT = S.fracciones(comb, "MIT");
eq("MIT arcilla disponible", frMIT[3].nd, false);

/* ---- 3. Límites ---- */
eq("humedad", S.humedad(15, 42.36, 35), (7.36 / 20) * 100, 1e-9);
// recta exacta: w = 40 − 8·log10(N) → LL = 40 − 8·log10(25) = 28.816
const trials = [17, 22, 28, 33].map(N => ({ N, w: 40 - 8 * Math.log10(N) }));
const ll = S.limiteLiquidoMulti(trials);
eq("LL regresión", ll.LLraw, 40 - 8 * Math.log10(25), 1e-9);
eq("LL redondeado", ll.LL, 29);
eq("índice de flujo", ll.Fi, 8, 1e-9);
eq("R² = 1", ll.r2, 1, 1e-9);
eq("sin advertencias de rango", ll.adv.length, 0);
eq("rangos D4318 mal", S.cumpleRangosD4318([30, 32, 34]), false);
eq("rangos D4318 bien", S.cumpleRangosD4318([17, 22, 28]), true);
const ll1 = S.limiteLiquidoUnPunto(22, 30);
eq("un punto", ll1.LLraw, 30 * Math.pow(22 / 25, 0.121), 1e-9);
eq("un punto fuera de rango avisa", S.limiteLiquidoUnPunto(35, 30).adv.length, 1);
const pl = S.limitePlastico([22.8, 23.4]);
eq("PL media", pl.media, 23.1, 1e-9);
const ind = S.indicesPlasticidad({ LL: 32.4, PL: 23.1, wn: 27 });
eq("PI", ind.PI, 32 - 23);
eq("IL", ind.IL, (27 - 23) / 9, 1e-9);
eq("PL ≥ LL → NP", S.indicesPlasticidad({ LL: 20, PL: 21 }).NP, true);

/* ---- 4. SUCS ---- */
function suc(o) { return S.clasificarSUCS(o); }
eq("GW", suc({ finos: 3, grava: 70, arena: 27, Cu: 8, Cc: 1.5 }).sim, "GW");
eq("GW nombre (arena 27%)", suc({ finos: 3, grava: 70, arena: 27, Cu: 8, Cc: 1.5 }).nombre, "Grava bien graduada con arena");
eq("GP (Cc fuera)", suc({ finos: 3, grava: 70, arena: 27, Cu: 8, Cc: 3.5 }).sim, "GP");
eq("SW (Cu 6)", suc({ finos: 2, grava: 8, arena: 90, Cu: 6, Cc: 2 }).sim, "SW");
eq("SP (Cu 5)", suc({ finos: 2, grava: 8, arena: 90, Cu: 5, Cc: 2 }).sim, "SP");
eq("GW-GM", suc({ finos: 6, grava: 54, arena: 40, Cu: 64, Cc: 1.1, LL: 32, PI: 5 }).sim, "GW-GM"); // PI=5 sobre A (0.73·12=8.8)? no: bajo A → M
eq("GW-GC", suc({ finos: 6, grava: 54, arena: 40, Cu: 64, Cc: 1.1, LL: 32, PI: 12 }).sim, "GW-GC");
eq("GM", suc({ finos: 20, grava: 60, arena: 20, LL: 30, PI: 4 }).sim, "GM");
eq("GC", suc({ finos: 20, grava: 60, arena: 20, LL: 35, PI: 18 }).sim, "GC");
eq("SC-SM", suc({ finos: 20, grava: 10, arena: 70, LL: 25, PI: 6 }).sim, "SC-SM");
eq("SM nombre", suc({ finos: 25, grava: 5, arena: 70, LL: 30, PI: 3 }).nombre, "Arena limosa");
eq("SC con grava", suc({ finos: 25, grava: 20, arena: 55, LL: 35, PI: 18 }).nombre, "Arena arcillosa con grava");
eq("CL", suc({ finos: 75, grava: 5, arena: 20, LL: 45, PI: 22 }).sim, "CL");
eq("CL nombre (25% gruesa → con arena)", suc({ finos: 75, grava: 5, arena: 20, LL: 45, PI: 22 }).nombre, "Arcilla magra con arena");
eq("CH", suc({ finos: 90, grava: 0, arena: 10, LL: 60, PI: 35 }).sim, "CH");
eq("MH", suc({ finos: 90, grava: 0, arena: 10, LL: 60, PI: 15 }).sim, "MH");
eq("ML (PI<4)", suc({ finos: 90, grava: 0, arena: 10, LL: 30, PI: 3 }).sim, "ML");
eq("CL-ML", suc({ finos: 90, grava: 0, arena: 10, LL: 25, PI: 6 }).sim, "CL-ML");
eq("ML bajo línea A", suc({ finos: 90, grava: 0, arena: 10, LL: 40, PI: 8 }).sim, "ML");
eq("OL", suc({ finos: 90, grava: 0, arena: 10, LL: 35, PI: 9, organico: true }).sim, "OL");
eq("OH", suc({ finos: 90, grava: 0, arena: 10, LL: 60, PI: 35, organico: true }).sim, "OH");
eq("NP → ML", suc({ finos: 60, grava: 0, arena: 40, NP: true }).sim, "ML");
eq("arcilla arenosa (≥30% gruesa)", suc({ finos: 60, grava: 5, arena: 35, LL: 45, PI: 22 }).nombre, "Arcilla magra arenosa");
eq("incompleto sin Cu/Cc", suc({ finos: 3, grava: 70, arena: 27 }).completo, false);

/* ---- 5. AASHTO ---- */
function aa(o) { return S.clasificarAASHTO(o); }
const a1 = aa({ P10: 35.5, P40: 18.5, P200: 6, LL: 32, PI: 5 });
eq("A-1-a", a1.grupo, "A-1-a");
eq("A-1-a GI 0", a1.GI, 0);
eq("A-2-4 (PI 9)", aa({ P10: 35.5, P40: 18.5, P200: 6, LL: 32, PI: 9 }).grupo, "A-2-4");
eq("A-1-b", aa({ P10: 80, P40: 45, P200: 20, LL: 25, PI: 4 }).grupo, "A-1-b");
eq("A-3", aa({ P10: 100, P40: 80, P200: 5, NP: true }).grupo, "A-3");
eq("A-2-6", aa({ P10: 90, P40: 70, P200: 30, LL: 35, PI: 15 }).grupo, "A-2-6");
eq("A-2-6 GI = 0.01·15·5 = 0.75 → 1", aa({ P10: 90, P40: 70, P200: 30, LL: 35, PI: 15 }).GI, 1);
eq("A-2-7", aa({ P10: 90, P40: 70, P200: 30, LL: 50, PI: 20 }).grupo, "A-2-7");
eq("A-4", aa({ P200: 60, LL: 30, PI: 6 }).grupo, "A-4");
eq("A-5", aa({ P200: 60, LL: 50, PI: 8 }).grupo, "A-5");
eq("A-6", aa({ P200: 60, LL: 35, PI: 15 }).grupo, "A-6");
const a76 = aa({ P200: 75, LL: 45, PI: 22 });
eq("A-7-6", a76.grupo, "A-7-6");
eq("A-7-6 GI (16)", a76.GI, 16);
eq("A-7-5", aa({ P200: 70, LL: 60, PI: 25 }).grupo, "A-7-5");
eq("GI nunca negativo", aa({ P200: 40, LL: 30, PI: 8 }).GI, 0);

console.log(fail === 0 ? "TODAS LAS PRUEBAS PASARON (" + ok + ")" : fail + " fallas de " + (ok + fail));
process.exit(fail === 0 ? 0 : 1);
