/*
 * =========================================================================
 * DIVERSIDAD DEL MENÚ (PNCM) — desde el 04/11/2026
 * =========================================================================
 * El mismo bloque va en Motor.gs (publicador, Apps Script) y en diversidad.js
 * (página): si se cambia uno, se copia igual en el otro.
 *
 * Base: diversidad alimentaria mínima OMS/UNICEF (2021), adaptada al menú del
 * servicio (sin leche materna): 7 grupos de alimentos.
 *   0 Cereales, raíces y tubérculos      4 Huevos
 *   1 Menestras, nueces y semillas       5 Frutas y verduras fuente de vitamina A
 *   2 Lácteos                            6 Otras frutas y verduras
 *   3 Carnes, vísceras y pescados
 * Grasas, azúcares, condimentos, hierbas, sal y agua no cuentan.
 *
 * Menú diario: un servicio, un día y un grupo de edad con niñas y niños
 * (media mañana + almuerzo de su edad + fruta + media tarde, como el aporte).
 * Puntaje diario: grupos presentes (0 a 7). Un grupo está presente si sus
 * alimentos suman, en parte comestible, más de 0 g, 10 g o más, o 15 g o más
 * (los tres umbrales se pueden elegir en la página).
 * Variedad semanal: alimentos distintos (sin contar la variedad entre
 * paréntesis) que llegan al umbral algún día de la semana; solo semanas con
 * 4 o más días de atención.
 *
 * Forma compacta por servicio (sa[].dv):
 *   f: fechas del menú, 6 cifras cada una (AAMMDD) · s: semana de cada fecha (base 36)
 *   e: [[edad 0-3, códigos]]: 7 cifras por fecha (una por grupo):
 *      0 nada · 1 menos de 10 g · 2 de 10 a menos de 15 g · 3 15 g o más;
 *      "-------" si ese día no hay menú para esa edad. Si los códigos son
 *      iguales a los de otra edad, va [edad, la otra edad].
 *   v: registros de 24 caracteres: edad, semana y días (base 36) y los
 *      alimentos distintos por grupo (base 36), 7 por umbral, en el orden de UMBRAL
 * Resumen del mes por UT/OCT (meta.dvr), para comparar meses.
 * =========================================================================
 */
var Diversidad = (function () {
  const VERSION = 'd1-2026-11-04';
  const GRUPOS = ['Cereales, raíces y tubérculos', 'Menestras, nueces y semillas', 'Lácteos', 'Carnes, vísceras y pescados', 'Huevos',
    'Frutas y verduras fuente de vitamina A', 'Otras frutas y verduras'];
  const CORTO = ['Cereales y tubérculos', 'Menestras y semillas', 'Lácteos', 'Carnes y pescados', 'Huevos', 'Frutas y verduras con vitamina A', 'Otras frutas y verduras'];
  const UMBRAL = [0, 10, 15];
  const UMBRAL_TXT = ['más de 0 g', '10 g o más', '15 g o más'];
  const EDADES = ['6 a 8 meses', '9 a 11 meses', '12 a 23 meses', '24 a 36 meses'];
  const MIN_DIAS_SEMANA = 4;
  const LET = { 0: 'R', 1: 'A', 2: 'A', 3: 'R', 4: 'F' };
  const sinT = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

  /* grupo de COMP_ALIMENTOS -> grupo del indicador (los demás no cuentan) */
  const POR_GRUPO = {
    'CEREALES Y DERIVADOS': 0, 'GALLETAS': 0, 'RAICES Y TUBERCULOS': 0, 'TUBERCULOS (DERIVADOS)': 0,
    'LEGUMINOSAS Y DERIVADOS': 1, 'GRANOS': 1,
    'LACTEOS': 2, 'PRODUCTOS LACTEOS': 2, 'ALIMENTO INFANTIL': 2,
    'PRODUCTOS DE ORIGEN ANIMAL PERECIBLES': 3, 'PRODUCTOS DE ORIGEN ANIMAL NO PERECIBLES': 3, 'PRODUCTOS PESQUEROS': 3,
    'OVOPRODUCTO': 4,
    'FRUTAS': 6, 'FRUTAS (DERIVADOS)': 6, 'VERDURAS Y HORTALIZAS': 6
  };
  /* reglas por nombre (sin tildes, en mayúsculas); la primera que coincide manda */
  const REGLAS = [
    [/^(SAL|AGUA|VINAGRE|LIMON)\b/, -1, 'sal, agua, vinagre o limón'],
    [/^(AJO|AJI|PAPRIKA|AZAFRAN|CULANTRO|SACHA CULANTRO|HIERBA ?BUENA|HIERBABUENA|HIERBA LUISA|HUACATAY|KION|JENGIBRE|OREGANO|PEREJIL|ALBAHACA|TOMILLO|ROMERO|MANZANILLA|CURCUMA|LAUREL|CANELA|CLAVO|ANIS|HONGO|COMINO|PIMIENTA|MOSTAZA|AJINOMOTO)\b/, -1, 'condimento, hierba o especia'],
    [/^MAIZ MORADO/, -1, 'se hierve para dar color y sabor; no se come'],
    [/^(MANTEQUILLA|MARGARINA|MANTECA|ACEITE)\b/, -1, 'grasa'],
    [/^ACEITUNA/, -1, 'se usa como condimento'],
    [/^(AZUCAR|PANELA|CHANCACA|ALGARROBINA|MIEL|MERMELADA)\b/, -1, 'azúcar'],
    [/^(HUEVO|YEMA|CLARA DE HUEVO)\b/, 4, ''],
    [/^(CHOCLO|MAIZ MOTE|HARINA DE PLATANO|PLATANO \(BELLACO\)|PLATANO VERDE)/, 0, 'cereal o plátano para cocinar'],
    [/^TARWI/, 1, 'menestra'],
    [/^(MANI|AJONJOLI|LINAZA|CHIA|SACHA INCHI|CASTANA|NUEZ|NUECES|PECANA|ALMENDRA|COCO)\b/, 1, 'nuez o semilla'],
    [/^(BETARRAGA|BETERRAGA)\b/, 6, 'raíz que se come como verdura'],
    [/^(CAMOTE \((AMARILLO|ANARANJADO)\)|ZAPALLO( \((MACRE|LOCHE)\))?$|ZANAHORIA|CALABAZA|PIMIENTO|ESPINACA|ACELGA|KALE|MANGO|PAPAYA|MELON|LUCUMA|AGUAYMANTO|MARACUYA|NISPERO|CAQUI|AGUAJE|PIJUAYO|DAMASCO)(?![A-Z])/, 5, 'fuente de vitamina A']
  ];
  const memo = {};
  /** Grupo del indicador de un alimento: [grupo 0-6 o -1, motivo]. */
  function clasificar(nombre, grupoComp) {
    const k = nombre + '\u0001' + grupoComp;
    if (memo[k]) return memo[k];
    const n = sinT(nombre);
    let r = null;
    for (let i = 0; i < REGLAS.length && !r; i++) if (REGLAS[i][0].test(n)) r = [REGLAS[i][1], REGLAS[i][2]];
    if (!r) {
      const g = POR_GRUPO[sinT(grupoComp)];
      r = g === undefined ? [-1, grupoComp && sinT(grupoComp) !== 'OTROS' ? 'grasa, azúcar o condimento' : 'sin grupo en COMP_ALIMENTOS'] : [g, ''];
    }
    return (memo[k] = r);
  }
  /** Nombre para contar alimentos distintos: sin la variedad entre paréntesis ("MANGO (KENT)" -> "MANGO"). */
  const nombreBase = n => sinT(n).replace(/\s*\(.*\)\s*$/, '');

  /**
   * Gramos de parte comestible de cada alimento en el menú de un día para un grupo de edad.
   * cells: {tiempo (0-4): código de preparación}; rc: recetario {ID_PREP: [nombre, [[alimento, g 6-8, g 9-11, g 12-23, g 24-36, g AC]]]};
   * ig: alimentos [[nombre, kcal, prot, hierro, zinc, calcio, parte comestible, grasa, cho, grupo]]; gi: edad 0-3.
   * Devuelve {índice del alimento: gramos} y, si se pide, el detalle por tiempo de comida.
   */
  function gramosDia(cells, rc, ig, gi, conTiempo) {
    const out = {}, det = [];
    [0, gi === 0 ? 1 : 2, 4, 3].forEach(k => {
      if (!cells || cells[k] === null || cells[k] === undefined) return;
      const rec = rc[LET[k] + cells[k]]; if (!rec) return;
      rec[1].forEach(row => {
        const g = row[1 + gi] || 0; if (!(g > 0)) return;
        const m = ig[row[0]]; const x = g * ((m && m[6]) || 1);
        out[row[0]] = (out[row[0]] || 0) + x;
        if (conTiempo) det.push([k, row[0], x, rec[0]]);
      });
    });
    return conTiempo ? { g: out, det } : out;
  }
  const cifra = x => (!(x > 0) ? 0 : x < 10 ? 1 : x < 15 ? 2 : 3);

  /** Forma compacta de un envío. det: {mw, rc, ig} (como el detalle publicado); u: niñas y niños por edad. */
  function calcular(det, u) {
    const mw = (det && det.mw) || [], rc = (det && det.rc) || {}, ig = (det && det.ig) || [];
    if (!mw.length) return null;
    const cls = ig.map(m => clasificar(m[0], m[9])[0]);
    const nom = ig.map(m => nombreBase(m[0]));
    const celdas = {}, sem = {};
    mw.forEach(r => { (celdas[r[0]] || (celdas[r[0]] = {}))[r[2]] = r[3]; sem[r[0]] = r[1]; });
    const fechas = Object.keys(celdas).sort();
    const e = []; let v = '';
    for (let gi = 0; gi < 4; gi++) {
      if (!(u && u[gi] > 0)) continue;
      let cod = '';
      const ps = {};
      fechas.forEach(f => {
        const g = gramosDia(celdas[f], rc, ig, gi);
        const tot = [0, 0, 0, 0, 0, 0, 0];
        let hay = false;
        const w = ps[sem[f]] || (ps[sem[f]] = { n: 0, al: [{}, {}, {}, {}, {}, {}, {}] });
        Object.keys(g).forEach(i => {
          const x = g[i]; if (!(x > 0)) return;
          hay = true;
          const c = cls[i]; if (c < 0) return;
          tot[c] += x;
          const o = w.al[c]; o[nom[i]] = Math.max(o[nom[i]] || 0, x);
        });
        if (!hay) { cod += '-------'; return; }
        w.n++;
        cod += tot.map(cifra).join('');
      });
      const igual = e.find(x => x[1] === cod);
      e.push(igual ? [gi, igual[0]] : [gi, cod]);
      Object.keys(ps).sort((a, b) => a - b).forEach(s => {
        const w = ps[s]; if (!w.n) return;
        const cad = UMBRAL.map(t => w.al.map(o => b36(Object.keys(o).filter(a => (t === 0 ? o[a] > 0 : o[a] >= t)).length)).join('')).join('');
        v += gi + b36(Number(s)) + b36(w.n) + cad;
      });
    }
    return { f: fechas.map(f => f.slice(2, 4) + f.slice(5, 7) + f.slice(8, 10)).join(''), s: fechas.map(f => b36(Number(sem[f]) || 0)).join(''), e, v };
  }
  const b36 = n => Math.max(0, Math.min(35, n)).toString(36);
  /** Fechas ('AAAA-MM-DD') y semanas de la forma compacta. */
  function fechas(dv) { const L = []; for (let i = 0; i + 6 <= ((dv && dv.f) || '').length; i += 6) L.push('20' + dv.f.substr(i, 2) + '-' + dv.f.substr(i + 2, 2) + '-' + dv.f.substr(i + 4, 2)); return L; }
  function semanas(dv) { return (((dv && dv.s) || '').split('')).map(c => parseInt(c, 36)); }
  /** Códigos de una edad (sigue la referencia a otra edad si la hay); '' si no está. */
  function codigos(dv, gi) {
    const x = ((dv && dv.e) || []).find(r => r[0] === gi); if (!x) return '';
    if (typeof x[1] === 'number') { const y = dv.e.find(r => r[0] === x[1]); return y && typeof y[1] === 'string' ? y[1] : ''; }
    return x[1];
  }
  /** Registros de variedad: [[edad, semana, días, cifras]]. */
  function variedades(dv) { const L = [], t = (dv && dv.v) || ''; for (let i = 0; i + 24 <= t.length; i += 24) L.push([+t[i], parseInt(t[i + 1], 36), parseInt(t[i + 2], 36), t.substr(i + 3, 21)]); return L; }

  /** Puntaje de un menú diario (7 cifras) con el umbral t (0, 1 o 2). */
  function puntaje(c, t) { let n = 0; for (let j = 0; j < 7; j++) if (+c[j] > t) n++; return n; }

  /**
   * Resultado de un servicio: dv (forma compacta), u (niñas y niños por edad), t (umbral 0-2), edad (null = todas).
   * Promedios ponderados por las niñas y niños de cada edad. null si no hay menús.
   */
  function servicio(dv, u, t, edad) {
    if (!dv || !dv.e) return null;
    let peso = 0, sp = 0, s5 = 0, mn = 99, mx = -1, nd = 0;
    const dist = [0, 0, 0, 0, 0, 0, 0, 0], pres = [0, 0, 0, 0, 0, 0, 0];
    dv.e.forEach(([gi]) => {
      if (edad != null && gi !== edad) return;
      const w = (u && u[gi]) || 0; if (!w) return;
      const cod = codigos(dv, gi);
      let n = 0, s = 0, c5 = 0; const pr = [0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i + 7 <= cod.length; i += 7) {
        const c = cod.substr(i, 7); if (c[0] === '-') continue;
        const p = puntaje(c, t);
        n++; s += p; if (p >= 5) c5++; dist[p]++;
        if (p < mn) mn = p; if (p > mx) mx = p;
        for (let j = 0; j < 7; j++) if (+c[j] > t) pr[j]++;
      }
      if (!n) return;
      peso += w; sp += w * s / n; s5 += w * c5 / n; nd += n;
      for (let j = 0; j < 7; j++) pres[j] += w * pr[j] / n;
    });
    if (!peso) return null;
    const pe = {};
    variedades(dv).forEach(([gi, sem, n, cad]) => {
      if (edad != null && gi !== edad) return;
      const w = (u && u[gi]) || 0; if (!w || n < MIN_DIAS_SEMANA) return;
      const x = cad.substr(t * 7, 7).split('').map(ch => parseInt(ch, 36));
      const tot = x.reduce((a, b) => a + b, 0);
      const o = pe[gi] || (pe[gi] = { w, n: 0, s: 0, mn: 1e9, mx: -1, g: [0, 0, 0, 0, 0, 0, 0] });
      o.n++; o.s += tot; o.mn = Math.min(o.mn, tot); o.mx = Math.max(o.mx, tot);
      x.forEach((k, j) => { o.g[j] += k; });
    });
    let pv = 0, sv = 0, vmn = 1e9, vmx = -1; const vg = [0, 0, 0, 0, 0, 0, 0];
    Object.keys(pe).forEach(k => { const o = pe[k]; pv += o.w; sv += o.w * o.s / o.n; vmn = Math.min(vmn, o.mn); vmx = Math.max(vmx, o.mx); o.g.forEach((x, j) => { vg[j] += o.w * x / o.n; }); });
    return {
      prom: sp / peso, min: mn, max: mx, p5: s5 / peso, nd, dist, pres: pres.map(x => x / peso),
      vprom: pv ? sv / pv : null, vmin: pv ? vmn : null, vmax: pv ? vmx : null, vg: pv ? vg.map(x => x / pv) : null
    };
  }

  /** Une los resultados de varios servicios: cada servicio pesa igual. null si la lista está vacía. */
  function agregar(L) {
    L = L.filter(Boolean);
    const n = L.length; if (!n) return null;
    const media = f => L.reduce((a, x) => a + f(x), 0) / n;
    const Lv = L.filter(x => x.vprom != null), nv = Lv.length;
    const dist = [0, 0, 0, 0, 0, 0, 0, 0]; L.forEach(x => x.dist.forEach((k, i) => { dist[i] += k; }));
    return {
      n, prom: media(x => x.prom), min: Math.min.apply(null, L.map(x => x.min)), max: Math.max.apply(null, L.map(x => x.max)),
      p5: media(x => x.p5), nd: L.reduce((a, x) => a + x.nd, 0), dist,
      pres: [0, 1, 2, 3, 4, 5, 6].map(j => media(x => x.pres[j])),
      nv, vprom: nv ? Lv.reduce((a, x) => a + x.vprom, 0) / nv : null,
      vmin: nv ? Math.min.apply(null, Lv.map(x => x.vmin)) : null, vmax: nv ? Math.max.apply(null, Lv.map(x => x.vmax)) : null,
      vg: nv ? [0, 1, 2, 3, 4, 5, 6].map(j => Lv.reduce((a, x) => a + x.vg[j], 0) / nv) : null
    };
  }

  /**
   * Resumen del mes por UT/OCT para comparar meses (meta.dvr): {v, ut: {UT: celdas}}, con una celda por umbral (3) y
   * edad (todas, 6-8, 9-11, 12-23, 24-36) en ese orden: [servicios, suma de puntajes promedio, suma de % con 5 o más grupos,
   * servicios con variedad, suma de variedades]. Las sumas permiten unir UT/OCT (cada servicio pesa igual).
   */
  function resumen(sa) {
    const R = {};
    const r3 = x => Math.round(x * 1000) / 1000;
    (sa || []).forEach(s => {
      if (!s || !s.dv) return;
      const o = R[s.ut] || (R[s.ut] = []);
      for (let t = 0; t < UMBRAL.length; t++) [null, 0, 1, 2, 3].forEach((ed, j) => {
        const k = t * 5 + j, c = o[k] || (o[k] = [0, 0, 0, 0, 0]);
        const x = servicio(s.dv, s.u, t, ed); if (!x) return;
        c[0]++; c[1] += x.prom; c[2] += x.p5;
        if (x.vprom != null) { c[3]++; c[4] += x.vprom; }
      });
    });
    Object.keys(R).forEach(k => { R[k] = R[k].map(c => [c[0], r3(c[1]), r3(c[2]), c[3], r3(c[4])]); });
    return { v: VERSION, ut: R };
  }

  return { VERSION, GRUPOS, CORTO, UMBRAL, UMBRAL_TXT, EDADES, MIN_DIAS_SEMANA, clasificar, nombreBase, gramosDia, calcular, fechas, semanas, codigos, variedades, puntaje, servicio, agregar, resumen };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Diversidad;
