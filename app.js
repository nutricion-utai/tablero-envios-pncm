function APP(D, AC){
const on = (t,f,o) => document.addEventListener(t,f,Object.assign({signal:AC.signal},o||{}));
const $ = s => document.querySelector(s);
const nf0 = new Intl.NumberFormat('es-PE',{maximumFractionDigits:0});
const nf1 = new Intl.NumberFormat('es-PE',{maximumFractionDigits:1,minimumFractionDigits:1});
const nf2 = new Intl.NumberFormat('es-PE',{maximumFractionDigits:2,minimumFractionDigits:2});
const S0 = v => 'S/ ' + nf0.format(v);
const S2 = v => 'S/ ' + nf2.format(v);
const P1 = v => nf1.format(v*100) + ' %';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sum = a => a.reduce((x,y)=>x+y,0);
const median = a => { if(!a.length) return 0; const b=[...a].sort((x,y)=>x-y); const m=b.length>>1; return b.length%2?b[m]:(b[m-1]+b[m])/2; };
const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
const mesTxt = p => MESES_L[+p.slice(5,7)-1]+' '+p.slice(0,4);

// derivados por servicio
// Costo por día del Anexo A de la Directiva "Modelo de cogestión comunal" v9 (RDE 002100-2025): [usuario, actor comunal]
// U: comité urbano · R: comité rural · S: comité urbano ubicado en selva (se le aplica la columna rural/selva)
const TARIFA = {U:[4.40,3.45], R:[4.70,3.75], S:[4.70,3.75]};
const AMB = {U:'Urbano', R:'Rural', S:'Urbano en selva'};
D.sa.forEach(s => {
  s.ninos = sum(s.u); s.acs = sum(s.ac); s.costT = s.cost[0]+s.cost[1];
  s.presReg = s.pres[0]+s.pres[1];
  // ámbito según el tipo del comité de gestión en el listado de CG; si el CG no figura, se deduce del presupuesto registrado
  if (!s.amb){
    const ru = (s.ninos&&s.dias) ? s.pres[0]/(s.ninos*s.dias) : 0, ra = (s.acs&&s.dias) ? s.pres[1]/(s.acs*s.dias) : 0;
    s.amb = ((ru-4.40)**2+(ra-3.45)**2) < ((ru-4.70)**2+(ra-3.75)**2) ? 'U' : 'R'; s.ambDed = true;
  }
  const t = TARIFA[s.amb];
  s.presCalc = [s.ninos*s.dias*t[0], s.acs*s.dias*t[1]];
  s.presT = s.presCalc[0]+s.presCalc[1];
  s.ejec = s.presT ? s.costT/s.presT : 0;
  // costo de los alimentos que consume el menú: lo que se pide (costo del envío) más el valor de los saldos de no perecibles que se usan
  s.saldo = s.saldo || [0,0];
  s.costCons = [s.cost[0]+s.saldo[0], s.cost[1]+s.saldo[1]];
  s.ninoDia = (s.ninos && s.dias) ? s.costCons[0]/s.ninos/s.dias : 0;
  s.acDia = (s.acs && s.dias) ? s.costCons[1]/s.acs/s.dias : 0;
});
const saA = s => '<a href="#detalle" class="salink" data-go="'+s.cui+'">'+esc(s.sa)+'</a>';
const byCui = Object.fromEntries(D.sa.map(s=>[s.cui,s]));

// filtros: UT/OCT, comité de gestión (CG) y servicio alimentario (SAF), en cascada: elegir un comité o un servicio fija su UT/OCT
let UT = 'TODAS', CG = '', SAF = '';
try { let k = localStorage.getItem('envios_ut'); if (k==='LIMA PROVINCIA') k='LIMA PROVINCIAS'; if (k) UT = k; CG = localStorage.getItem('envios_cg')||''; SAF = localStorage.getItem('envios_saf')||''; } catch(e) {}
const uts = [...new Set(D.sa.map(s=>s.ut))].sort();
if (UT!=='TODAS' && !uts.includes(UT)) UT='TODAS';
$('#fUT').innerHTML = '<option value="TODAS">Todas las UT (' + D.sa.length + ')</option>' +
  uts.map(u => '<option value="'+esc(u)+'">'+esc(u)+' ('+D.sa.filter(s=>s.ut===u).length+')</option>').join('');
$('#fUT').value = UT;
const nCG = s => String(s||'').replace(/\s+/g,' ').trim();
const PADF = () => D.pad || window.__PAD || [];   // padrón del periodo: [UT, CUI, servicio, comité, distrito]
// comités de la UT/OCT (o de todas): los de los servicios con envío vigente y los del padrón del periodo
function comites(){
  const m = {};
  D.sa.forEach(s=>{ const c=nCG(s.cg), k=s.ut+'||'+c; (m[k]||(m[k]={ut:s.ut, cg:c, n:0})).n++; });
  PADF().forEach(p=>{ const c=nCG(p[3]), k=p[0]+'||'+c; if(!m[k]) m[k]={ut:p[0], cg:c, n:0}; });
  return Object.values(m).filter(o=>o.cg && uts.includes(o.ut) && (UT==='TODAS' || o.ut===UT));
}
function llenarFiltros(){
  const L = comites().sort((a,b)=>a.cg.localeCompare(b.cg,'es') || a.ut.localeCompare(b.ut,'es'));
  if (CG && (UT==='TODAS' || !L.some(o=>o.cg===CG))) CG = '';
  $('#fCG').innerHTML = '<option value="">Todos los comités ('+L.length+')</option>'+L.map(o=>'<option value="'+esc(o.ut+'||'+o.cg)+'">'+esc(o.cg)+(UT==='TODAS'?' · '+esc(o.ut):'')+' ('+o.n+')</option>').join('');
  $('#fCG').value = CG ? UT+'||'+CG : '';
  const S = D.sa.filter(s=>(UT==='TODAS' || s.ut===UT) && (!CG || nCG(s.cg)===CG)).sort((a,b)=>a.sa.localeCompare(b.sa,'es'));
  if (SAF && !S.some(s=>s.cui===SAF)) SAF = '';
  $('#fSAF').innerHTML = '<option value="">Todos los servicios ('+S.length+')</option>'+S.map(s=>'<option value="'+s.cui+'">'+esc(s.sa)+(CG?'':' · CG '+esc(s.cg))+(UT==='TODAS'?' · '+esc(s.ut):'')+'</option>').join('');
  $('#fSAF').value = SAF;
  try{ localStorage.setItem('envios_ut',UT); localStorage.setItem('envios_cg',CG); localStorage.setItem('envios_saf',SAF); }catch(_){}
}
llenarFiltros();
// fija los tres filtros y vuelve a dibujar; con un solo servicio, su ficha queda abierta en el detalle
function fijarFiltro(ut, cg, saf){ UT = ut; CG = cg||''; SAF = saf||''; $('#fUT').value = UT; llenarFiltros(); openCui = SAF || null; render(); }
$('#fUT').addEventListener('change', e => fijarFiltro(e.target.value, '', ''));
$('#fCG').addEventListener('change', e => { const v = e.target.value; if (!v) return fijarFiltro(UT, '', ''); const i = v.indexOf('||'); fijarFiltro(v.slice(0,i), v.slice(i+2), ''); });
$('#fSAF').addEventListener('change', e => { const s = byCui[e.target.value]; if (!s) return fijarFiltro(UT, CG, ''); fijarFiltro(s.ut, CG, s.cui); });
const sel = () => D.sa.filter(s=>(UT==='TODAS' || s.ut===UT) && (!CG || nCG(s.cg)===CG) && (!SAF || s.cui===SAF));
// nombre de la selección para los títulos y textos
const filtroTxt = () => SAF ? (byCui[SAF]||{}).sa : CG ? 'el comité de gestión '+CG : UT;
const deSel = () => SAF ? 'de '+(byCui[SAF]||{}).sa : CG ? 'del comité de gestión '+CG : 'de '+UT;
// envíos (D.envs) de la selección; r[2] es el CUI del padrón
function envFiltro(){
  if (!CG && !SAF) return r => UT==='TODAS' || r[4]===UT;
  const set = new Set(sel().map(s=>s.cui));
  if (!SAF) PADF().forEach(p=>{ if (p[0]===UT && nCG(p[3])===CG) set.add(String(p[1])); });
  return r => r[4]===UT && set.has(String(r[2]));
}

// tooltip
const tip = $('#tip');
on('mouseover', e => { const t = e.target.closest('[data-tip]'); if(!t){tip.classList.remove('on');return;} tip.innerHTML = t.getAttribute('data-tip'); tip.classList.add('on'); });
on('mousemove', e => { if(!tip.classList.contains('on')) return; const w=tip.offsetWidth,h=tip.offsetHeight; let x=e.clientX+14,y=e.clientY+14; if(x+w>innerWidth-8) x=e.clientX-w-14; if(y+h>innerHeight-8) y=e.clientY-h-14; tip.style.left=x+'px'; tip.style.top=y+'px'; });
on('scroll', ()=>tip.classList.remove('on'), {passive:true});

// encabezado y mes
$('#hPer').textContent = mesTxt(D.periodo);
document.title = 'Envíos del menú · ' + mesTxt(D.periodo);
$('#fMes').innerHTML = window.__MESES.map(p=>'<option value="'+p+'">'+mesTxt(p).replace(/^./,c=>c.toUpperCase())+' ('+(window.__ENVVIG[p]||0)+')</option>').join('');
$('#fMes').value = D.periodo;
$('#fMes').addEventListener('change', e => window.__cambiarMes(e.target.value));
$('#hMeta').innerHTML = 'Datos al ' +
  (/^\d{4}-\d{2}-\d{2}/.test(String(D.corte)) ? D.corte.slice(8,10)+'/'+D.corte.slice(5,7)+'/'+D.corte.slice(0,4)+', '+D.corte.slice(11)+' h. ' : '— (sin fecha de corte). ') +
  D.envTotal + (D.envTotal===1?' envío recibido':' envíos recibidos') + ' para ' + mesTxt(D.periodo) + (D.envTotal===1 ? (D.envVig?', vigente.':'.') : ', de los cuales ' + D.envVig + (D.envVig===1?' está vigente.':' están vigentes.'));

// -------- helpers de gráficos
function hbars(el, rows, opt){
  // rows: {name, value, color, label, tip, mark}
  const max = opt.max || Math.max(...rows.map(r=>r.value), 1e-9);
  el.classList.add('hb');
  el.innerHTML = rows.map(r => {
    const w = Math.max(0, Math.min(100, r.value/max*100));
    const nm = r.go ? '<a href="#" class="salink" data-saf="'+r.go+'" title="Ver solo este servicio alimentario">'+esc(r.name)+'</a>' : r.goUT ? '<a href="#" class="salink" data-ut="'+esc(r.goUT)+'">'+esc(r.name)+'</a>' : esc(r.name);
    return '<div class="hbar" data-tip="'+esc(r.tip||'')+'"><div class="nm" title="'+esc(r.name)+'">'+nm+'</div>'+
      '<div class="track">'+(opt.ref!=null?'<i class="ref" style="left:'+(opt.ref/max*100)+'%"'+(opt.refTip?' title="'+esc(opt.refTip)+'"':'')+'></i>':'')+
      '<div class="fill" style="width:'+w+'%;background:'+(r.color||'var(--azul)')+'"></div></div>'+
      '<div class="v">'+r.label+'</div></div>';
  }).join('') || '<p class="note">Sin datos para esta selección.</p>';
}

// -------- KPIs
// íconos de las tarjetas (trazo, 24×24), a la izquierda del título
const ICO = {
 sa:'<path d="M3 10l9-6 9 6"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
 ut:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
 send:'<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
 nino:'<circle cx="12" cy="6" r="3"/><path d="M8 21v-6l-2-3 3-2h6l3 2-2 3v6"/><path d="M10 21v-4h4v4"/>',
 ac:'<circle cx="9" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M3 20v-2a5 5 0 0 1 10 0v2"/><path d="M14 20v-1.5a4 4 0 0 1 7-2.6"/>',
 costo:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.3"/>',
 dia:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2.4"/>',
 kcal:'<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-1 3-3 4-4 6-1-1-1-3-1-4-2 2-5 5-5 8 0 4 3 7 7 7z"/>',
 prot:'<path d="M2.5 12c3-5 9.5-6 13.5-2l4.5-3.5v11L16 14c-4 4-10.5 3-13.5-2z"/><circle cx="7.5" cy="11" r=".9" fill="currentColor"/>',
 pct:'<path d="M12 3v9h9"/><path d="M21 12a9 9 0 1 1-9-9"/>',
 fe:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
 zn:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
 ca:'<path d="M17 3a2.5 2.5 0 0 1 2.4 3.2A2.5 2.5 0 1 1 17.8 10L10 17.8a2.5 2.5 0 1 1-3.8 1.6A2.5 2.5 0 1 1 6.2 14.2L14 6.2A2.5 2.5 0 0 1 17 3z"/>'
};
const ICO_TARJ = {'servicios con envío vigente':'sa','unidades territoriales':'ut','envíos vigentes':'send','niñas y niños':'nino','actores comunales':'ac','costo del menú':'costo',
  'costo por niño y día':'dia','costo por actor comunal y día':'dia','calorías':'kcal','proteínas':'prot','% kcal de proteínas':'pct','hierro':'fe','zinc':'zn','calcio':'ca'};
const labI = t => { const k = ICO_TARJ[String(t).toLowerCase()];
  return '<span class="labw">'+(k?'<span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24">'+ICO[k]+'</svg></span>':'')+'<span class="lab">'+t+'</span></span>'; };
function kpis(){
  const L = sel();
  // los CUI que no están en el padrón también cuentan: se suman a los que enviaron y a los esperados
  const enPad = new Set(L.map(s=>s.cuiPad||s.cui));   // CUI del padrón (corregido si el envío trae otro) o el del envío si no está en el padrón
  const nFuera = L.filter(s=>!s.padron).length;
  const sPad = SAF ? (byCui[SAF].cuiPad||SAF) : null;
  const padTot = (UT==='TODAS' ? D.padTotal : (CG||SAF) ? PADF().filter(p=>p[0]===UT && (!CG || nCG(p[3])===CG) && (!SAF || String(p[1])===String(sPad))).length : (D.padUT[UT]||0)) + nFuera;
  const utsCon = new Set(D.sa.map(s=>s.ut)).size, utsTot = new Set(Object.keys(D.padUT).concat(D.sa.map(s=>s.ut))).size;
  const nin = sum(L.map(s=>s.ninos)), ac = sum(L.map(s=>s.acs));
  const pres = sum(L.map(s=>s.presT)), cost = sum(L.map(s=>s.costT));
  // costo promedio por día: costo total entre niño-días (o AC-días) del conjunto, según ámbito del Anexo A
  const prom = (ss,i) => { const c = sum(ss.map(s=>s.costCons[i])), d = sum(ss.map(s=>(i?s.acs:s.ninos)*s.dias)); return d ? c/d : null; };
  const U = L.filter(s=>s.amb==='U'), R = L.filter(s=>s.amb==='R'||s.amb==='S');
  // debajo del promedio: promedio por ámbito y, al lado, el costo por día que fija el Anexo A de la Directiva del modelo de cogestión comunal
  const subAmb = i => '<span class="amb">'+[['Urbano',U,TARIFA.U[i]],['Rural o selva',R,TARIFA.R[i]]].map(([n,ss,t])=>{ const p=prom(ss,i);
      return '<span>'+n+' <b>'+(p!=null?S2(p):'—')+'</b> <span class="dir">de S/ '+nf2.format(t)+'</span></span>'; }).join('')+'</span>';
  const tiles = [
    ['Servicios con envío vigente', nf0.format(enPad.size), 'de '+nf0.format(padTot)+(nFuera?', con '+nFuera+' fuera del padrón':' del padrón')+' ('+P1(padTot?enPad.size/padTot:0)+')'],
    UT==='TODAS' ? ['Unidades territoriales', nf0.format(utsCon), 'de '+utsTot+' tienen al menos un envío'] : ['Envíos vigentes', nf0.format(L.length), 'incluye los CUI que no están en el padrón'],
    ['Niñas y niños', nf0.format(nin), 'de 6 a 36 meses, según el pedido no perecible'],
    ['Actores comunales', nf0.format(ac), 'madres cuidadoras, madres guía y socias de cocina'],
    ['Costo del menú', S0(cost), P1(pres?cost/pres:0)+' del presupuesto calculado ('+S0(pres)+')'],
    ['Costo por niño y día', prom(L,0)!=null?S2(prom(L,0)):'—', subAmb(0), 'Promedio ponderado: costo de los usuarios (pedido más el valor de los saldos de no perecibles que usa el menú) entre niño-días con menú. Al lado de cada ámbito, el costo por día del Anexo A de la Directiva del modelo de cogestión comunal (v9, RDE 002100-2025)'],
    ['Costo por actor comunal y día', prom(L,1)!=null?S2(prom(L,1)):'—', subAmb(1), 'Promedio ponderado: costo de los actores comunales (pedido más el valor de los saldos de no perecibles que usa el menú) entre AC-días con menú. Al lado de cada ámbito, el costo por día del Anexo A de la Directiva del modelo de cogestión comunal (v9, RDE 002100-2025)']
  ];
  $('#kpis').innerHTML = tiles.map(t=>'<div class="kpi"'+(t[3]?' data-tip="'+esc(t[3])+'"':'')+'>'+labI(t[0])+'<span class="val">'+t[1]+'</span><span class="sub">'+t[2]+'</span></div>').join('');
}

// -------- cobertura promedio del requerimiento (Directiva Prestación del SCD v5, num. 7.3, Cuadros N° 05 y 06)
// Promedio del % del requerimiento diario que cubre el menú (refrigerios, almuerzo y fruta) en los días con menú y los grupos de
// edad con usuarios. En calcio, la cifra grande es la de 12 a 36 meses: en 6 a 8 y 9 a 11 meses la Directiva lo fija como referencial.
const NUT_TARJ = ['Calorías','Proteínas','Hierro','Zinc','Calcio'];
function coberturaNut(){
  const L = sel(); const G = [0,1,2,3].map(()=>({n:0, suma:[0,0,0,0,0]}));
  const M = [0,1,2,3].map(()=>({n:0, suma:0}));   // % de las kcal que viene de proteínas (mismo cálculo de la tabla de distribución de calorías)
  L.forEach(s=>{ const r=evaluarAporte(s); r.cob.forEach((C,gi)=>{ G[gi].n+=C.n; for(let j=0;j<5;j++) G[gi].suma[j]+=C.suma[j]; });
    r.mac.forEach((X,gi)=>{ M[gi].n+=X.n; M[gi].suma+=X.suma[0]; }); });
  const pf = v => v==null ? '—' : nf0.format(v)+' %';
  const prom = (j,gs) => { const n=sum(gs.map(g=>G[g].n)); return n ? sum(gs.map(g=>G[g].suma[j]))/n : null; };
  const tip = 'Promedio del porcentaje del requerimiento diario que cubre el menú programado (refrigerios de media mañana y media tarde, almuerzo y fruta), en los días con menú y los grupos de edad con usuarios. Requerimiento y porcentaje mínimo: Directiva "Prestación del Servicio de Cuidado Diurno" v5 (RDE 002496-2025), numeral 7.3, Cuadros N° 05 y 06.';
  const el = $('#kpisNut'); if (!el) return;
  if (!sum(G.map(g=>g.n))){ el.innerHTML=''; $('#nutHead').hidden = true; return; }
  $('#nutHead').hidden = false;
  const tarj = NUT_TARJ.map((nom,j)=>{
    const meta = Math.round(D.metaPNCM[j]*100);
    const gsBig = j===4 ? [2,3] : [0,1,2,3];
    const v = prom(j,gsBig);
    const ok = v!=null && Math.round(v) >= meta;
    const grp = [0,1,2,3].filter(g=>G[g].n).map(g=>'<span>'+GRC[g]+' <b>'+pf(prom(j,[g]))+'</b>'+(j===4&&g<2?' <span class="dir">ref.</span>':'')+'</span>').join('');
    return '<div class="kpi" data-tip="'+esc(tip+(j===4?' En calcio, la cifra grande corresponde a 12 a 36 meses; en 6 a 8 y 9 a 11 meses el aporte es referencial.':''))+'">'+
      labI(nom)+'<span class="val">'+pf(v)+'</span>'+
      '<span class="sub"><span class="meta'+(v==null?'':ok?' ok':' bajo')+'">mínimo '+meta+' %'+(j===4?' (12-36 m)':'')+'</span></span>'+
      '<span class="sub"><span class="amb">'+grp+'</span></span></div>';
  });
  // la tarjeta de % kcal de proteínas va entre Proteínas y Hierro
  tarj.splice(2, 0, (()=>{
    // proteínas en % de las kcal: rango de referencia RIEN para 1 a 3 años (10 a 20 %); en 6 a 11 meses es referencial
    const pm = gs => { const n=sum(gs.map(g=>M[g].n)); return n ? sum(gs.map(g=>M[g].suma))/n : null; };
    const v = pm([2,3]), [lo,hi] = MAC_RANGO[0], fuera = v!=null && (Math.round(v)<lo || Math.round(v)>hi);
    const grp = [0,1,2,3].filter(g=>M[g].n).map(g=>'<span>'+GRC[g]+' <b>'+pf(pm([g]))+'</b>'+(g<2?' <span class="dir">ref.</span>':'')+'</span>').join('');
    const tipM = 'Promedio del porcentaje de las calorías del día que viene de las proteínas (factores 4-9-4), en los días con menú y los grupos de edad con usuarios. La cifra grande corresponde a 12 a 36 meses, frente al rango aceptable de distribución de macronutrientes para 1 a 3 años de las Recomendaciones de Ingesta de Energía y Nutrientes (RIEN) de Colombia (10 a 20 %). En 6 a 8 y 9 a 11 meses es referencial.';
    return '<div class="kpi" data-tip="'+esc(tipM)+'">'+labI('% kcal de proteínas')+'<span class="val">'+pf(v)+'</span>'+
      '<span class="sub"><span class="meta'+(fuera?' bajo':'')+'">rango '+lo+' a '+hi+' %</span></span><span class="sub"><span class="amb">'+grp+'</span></span></div>';
  })());
  el.innerHTML = tarj.join('');
}

// -------- avance (nacional)
function avance(){
  // los servicios con un CUI que no está en el padrón cuentan como enviados y se suman a los esperados de su UT/OCT
  const env = {}, fu = {}; D.sa.forEach(s=>{ (env[s.ut]=env[s.ut]||new Set()).add(s.cuiPad||s.cui); if(!s.padron) fu[s.ut]=(fu[s.ut]||0)+1; });
  const rows = Object.keys(env).map(u=>({u, n:env[u].size, f:fu[u]||0, e:(D.padUT[u]||0)+(fu[u]||0)})).sort((a,b)=>b.n/b.e-a.n/a.e);
  const tn = sum(rows.map(r=>r.n)), tf = sum(rows.map(r=>r.f));
  $('#avLede').textContent = 'Servicios alimentarios que ya tienen un envío vigente para '+mesTxt(D.periodo).replace(/ \d{4}$/,'')+'. Un envío vigente es el último que mandó cada servicio, identificado por su CUI del padrón; los anteriores quedan reemplazados. Los que enviaron con un CUI que no está en el padrón también se cuentan y se suman a los esperados de su UT/OCT.';
  $('#avNote').textContent = tn + ' servicios alimentarios con envío vigente'+(tf?' ('+tf+' con CUI fuera del padrón)':'')+', en ' + rows.length + ' unidades territoriales.';
  $('#tAv').innerHTML = '<thead><tr><th>UT/OCT</th><th class="n">Esperados</th><th class="n">Enviaron</th><th>Avance</th><th class="n">%</th></tr></thead><tbody>'+
    rows.map(r=>'<tr'+(UT===r.u?' style="background:var(--azul-soft)"':'')+'><td><a href="#" class="salink" data-ut="'+esc(UT===r.u?'TODAS':r.u)+'" title="'+(UT===r.u?'Quitar el filtro de UT':'Filtrar por '+esc(r.u))+'">'+esc(r.u)+'</a>'+(UT===r.u?' <span class="chip blue" style="margin-left:4px">filtro activo</span>':'')+'</td><td class="n">'+r.e+(r.f?'<span style="display:block;font-size:11.5px;color:var(--muted)">incluye '+r.f+' fuera del padrón</span>':'')+'</td><td class="n">'+r.n+'</td><td><div class="minibar"><span style="width:'+(r.e?r.n/r.e*100:0)+'%"></span></div></td><td class="n">'+nf0.format(r.e?r.n/r.e*100:0)+' %</td></tr>').join('')+'</tbody>';
  const sin = Object.keys(D.padUT).filter(u=>!env[u]).sort();
  $('#sinEnv').innerHTML = '<b>Todavía sin envíos ('+sin.length+'):</b> '+sin.map(esc).join(', ')+'.';
  faltan(env);
}
// con una UT/OCT filtrada: servicios de su padrón que todavía no tienen envío vigente en el mes
function faltan(env){
  const box = $('#faltan'); if (!box) return;
  const PADL = D.pad || window.__PAD;   // padrón del periodo; si no hay, el general
  if (UT==='TODAS' || SAF || !PADL){ box.hidden = true; return; }
  const ya = env[UT] || new Set();
  const pad = PADL.filter(p=>p[0]===UT && (!CG || nCG(p[3])===CG));
  const fl = pad.filter(p=>!ya.has(p[1])).sort((a,b)=>a[3].localeCompare(b[3],'es') || a[2].localeCompare(b[2],'es'));
  box.hidden = false;
  const mes = mesTxt(D.periodo).replace(/ \d{4}$/,'');
  if (!fl.length){
    $('#faltNote').textContent = 'Los '+pad.length+' servicios alimentarios del padrón de '+(CG?'este comité de gestión':'esta unidad territorial')+' ya tienen un envío vigente para '+mes+'.';
    $('#tFalt').innerHTML = ''; return;
  }
  $('#faltNote').textContent = fl.length+' de '+pad.length+' servicios alimentarios del padrón todavía no tienen un envío vigente para '+mes+'. Ordenados por comité de gestión.';
  $('#tFalt').innerHTML = '<thead><tr><th class="n">N°</th><th>Servicio alimentario</th><th class="n">CUI</th><th>Comité de gestión</th><th>Distrito</th></tr></thead><tbody>'+
    fl.map((p,i)=>'<tr><td class="n">'+(i+1)+'</td><td>'+esc(p[2])+'</td><td class="n">'+esc(p[1])+'</td><td>'+esc(p[3])+'</td><td>'+esc(p[4])+'</td></tr>').join('')+'</tbody>';
}
// D.envs: todos los envíos del mes, del más reciente al más antiguo:
// [recepción 'AAAA-MM-DD HH:MM', envío 'AAAA-MM-DD HH:MM', CUI del padrón, servicio, UT, vigente 1/0]
const envsSel = () => (D.envs||[]).filter(envFiltro());
function porDia(){
  let rows = D.porDia; // [dia, NO, SI]
  if (D.envs){ const m = {}; envsSel().forEach(r=>{ if(!/^\d{4}-\d{2}-\d{2}/.test(r[1])) return; const d=r[1].slice(0,10), o=m[d]||(m[d]=[0,0]); o[r[5]?1:0]++; });
    rows = Object.keys(m).sort().map(d=>[d, m[d][0], m[d][1]]); }
  if (!rows.length){ $('#cDia').innerHTML = '<p class="note">Sin envíos para esta selección.</p>'; return; }
  const W=520,H=210,L=34,B=34,T=14,R=8, n=rows.length;
  const max = Math.max(...rows.map(r=>r[1]+r[2]));
  const step = Math.ceil(max/4/5)*5 || 5, top = Math.ceil(max/step)*step;
  const y = v => T + (H-T-B)*(1-v/top);
  const bw = Math.min(46,(W-L-R)/n*0.6);
  let g = '';
  for(let t=0;t<=top;t+=step){ g+='<line class="ax" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(t)+'" y2="'+y(t)+'"/><text x="'+(L-6)+'" y="'+(y(t)+4)+'" text-anchor="end">'+t+'</text>'; }
  rows.forEach((r,i)=>{
    const cx = L + (W-L-R)*(i+0.5)/n, x = cx-bw/2;
    const dd = r[0].slice(8,10)+'/'+r[0].slice(5,7);
    const yv = y(r[2]), yn = y(r[2]+r[1]);
    const t = esc(dd+': '+(r[1]+r[2])+' envíos ('+r[2]+' vigentes, '+r[1]+' reemplazados)');
    g+='<g data-tip="'+t+'"><rect x="'+(x-6)+'" y="'+T+'" width="'+(bw+12)+'" height="'+(H-T-B)+'" fill="transparent"/>'+
       '<rect x="'+x+'" y="'+yv+'" width="'+bw+'" height="'+(y(0)-yv)+'" fill="var(--azul)"/>'+
       (r[1]?'<rect x="'+x+'" y="'+yn+'" width="'+bw+'" height="'+Math.max(0,yv-yn-2)+'" rx="3" fill="var(--magenta)"/>':'')+
       '<text x="'+cx+'" y="'+(yn-5)+'" text-anchor="middle" style="fill:var(--ink)">'+(r[1]+r[2])+'</text>'+
       '<text x="'+cx+'" y="'+(H-B+18)+'" text-anchor="middle">'+dd+'</text></g>';
  });
  $('#cDia').innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="Envíos por día">'+g+'</svg>';
}

// -------- últimos envíos recibidos (con una UT/OCT filtrada, solo los de esa UT/OCT)
function ultimos(){
  const box = $('#ultimos'); if (!box) return;
  if (!D.envs){ box.hidden = true; return; }
  box.hidden = false;
  const tot = UT==='TODAS', A = D.envs, re = new Array(A.length), visto = {};
  for (let i=A.length-1; i>=0; i--){ re[i] = !!visto[A[i][2]]; visto[A[i][2]] = 1; }   // reenvío: el mismo servicio ya había enviado
  const ok = envFiltro(), L = A.map((r,i)=>({r, re:re[i]})).filter(o=>ok(o.r)), top = L.slice(0,10);
  const fh = f => /^\d{4}-\d{2}-\d{2}/.test(f) ? f.slice(8,10)+'/'+f.slice(5,7)+' '+f.slice(11,16) : 'sin fecha';
  const mes = mesTxt(D.periodo).replace(/ \d{4}$/,'');
  $('#ultLede').textContent = (L.length>10 ? 'Los 10 envíos más recientes' : L.length===1 ? 'El único envío' : 'Los '+L.length+' envíos')+
    ' para '+mes+(tot ? ', de todas las UT/OCT' : ' '+deSel())+', del más reciente al más antiguo. Un reenvío reemplaza al envío anterior del mismo servicio alimentario.';
  if (!top.length){ $('#tUlt').innerHTML = ''; $('#ultLede').textContent = 'Todavía no hay envíos para '+mes+(tot?'':' '+deSel())+'.'; return; }
  $('#tUlt').innerHTML = '<thead><tr><th>Recibido</th>'+(tot?'<th>UT/OCT</th>':'')+'<th>Servicio alimentario</th><th class="n">CUI</th><th>Estado</th></tr></thead><tbody>'+
    top.map(({r,re})=>{ const s = r[5] && byCui[r[2]];
      return '<tr><td style="white-space:nowrap">'+fh(r[0])+'</td>'+(tot?'<td>'+utLink(r[4])+'</td>':'')+'<td>'+(s?saA(s):esc(r[3]))+'</td><td class="n">'+esc(r[2])+'</td><td style="white-space:nowrap">'+
        (r[5]?'<span class="chip blue">Vigente</span>':'<span class="chip mag" title="El mismo servicio volvió a enviar; cuenta el envío más reciente">Reemplazado</span>')+
        (re?' <span class="chip gris" title="El servicio ya había enviado antes en este mes">Reenvío</span>':'')+'</td></tr>'; }).join('')+'</tbody>';
}

// -------- presupuesto
const sal = v => v<0 ? '<span style="color:var(--warn)">+'+S0(-v)+'</span>' : S0(v);
function porUT(L){
  const m={}; L.forEach(s=>{ const o=m[s.ut]||(m[s.ut]={ut:s.ut,n:0,pres:0,cost:0,costU:0,nd:0}); o.n++; o.pres+=s.presT; o.cost+=s.costT; o.costU+=s.costCons[0]; o.salU=(o.salU||0)+s.saldo[0]; o.nd+=s.ninos*s.dias; });
  return Object.values(m);
}
function ejec(){
  const tot = UT==='TODAS';
  $('#hEjec').textContent = tot ? 'Uso del presupuesto por UT/OCT' : 'Uso del presupuesto por servicio alimentario';
  if (tot){
    const R = porUT(sel()).sort((a,b)=>b.cost/b.pres-a.cost/a.pres);
    hbars($('#cEjec'), R.map((o,i)=>({name:(i+1)+'. '+o.ut, goUT:o.ut, value:o.cost/o.pres, label:nf0.format(o.cost/o.pres*100)+' % · '+sal(o.pres-o.cost),
      tip:'<b>'+esc(o.ut)+'</b> · '+o.n+' servicios<br>Presupuesto calculado '+S2(o.pres)+'<br>Costo '+S2(o.cost)+'<br>Saldo '+S2(o.pres-o.cost)+'<br>Toque el nombre para ver sus servicios'})), {max:Math.max(1,...R.map(o=>o.cost/o.pres)), ref:1, refTip:'100 % del presupuesto calculado'});
    return;
  }
  const L = [...sel()].sort((a,b)=>b.ejec-a.ejec);
  hbars($('#cEjec'), L.map((s,i)=>({name:(i+1)+'. '+s.sa, go:s.cui, value:s.ejec, color: s.ejec>1?'var(--warn)':'var(--azul)',
    label: nf0.format(s.ejec*100)+' % · '+sal(s.presT-s.costT),
    tip: '<b>'+esc(s.sa)+'</b> (CUI '+s.cui+') · '+AMB[s.amb]+(s.rn?' ('+s.rn.toLowerCase()+')':'')+'<br>Presupuesto calculado '+S2(s.presT)+'<br>Costo '+S2(s.costT)+'<br>Saldo '+S2(s.presT-s.costT)+'<br>Presupuesto registrado en el envío '+S2(s.presReg)})), {max:Math.max(1,...L.map(s=>s.ejec)), ref:1, refTip:'100 % del presupuesto calculado'});
  if (L.some(s=>s.ejec>1)) $('#cEjec').insertAdjacentHTML('beforeend','<p class="note" style="margin-top:8px"><i class="sw" style="background:var(--warn)"></i>El costo supera el presupuesto calculado.</p>');
}
function nino(){
  const tot = UT==='TODAS';
  $('#hNino').textContent = tot ? 'Costo por niña o niño y día de atención, por UT/OCT' : 'Costo por niña o niño y día de atención';
  if (tot){
    const R = porUT(sel()).filter(o=>o.nd).map(o=>({...o,v:o.costU/o.nd})).sort((a,b)=>b.v-a.v);
    const md = median(R.map(o=>o.v));
    hbars($('#cNino'), R.map((o,i)=>({name:(i+1)+'. '+o.ut, goUT:o.ut, value:o.v, label:S2(o.v), tip:'<b>'+esc(o.ut)+'</b> · '+o.n+' servicios<br>'+S2(o.costU)+' (incluye '+S2(o.salU||0)+' de saldos) entre '+nf0.format(o.nd)+' niño-días'})), {ref:md});
    return;
  }
  const L = sel().filter(s=>s.ninoDia).sort((a,b)=>b.ninoDia-a.ninoDia);
  const md = median(L.map(s=>s.ninoDia));
  hbars($('#cNino'), L.map((s,i)=>({name:(i+1)+'. '+s.sa, go:s.cui, value:s.ninoDia, label:S2(s.ninoDia),
    tip:'<b>'+esc(s.sa)+'</b><br>'+S2(s.costCons[0])+' (pedido '+S2(s.cost[0])+' y saldos '+S2(s.saldo[0])+') para '+s.ninos+' niñas y niños en '+s.dias+' días · tarifa '+AMB[s.amb].toLowerCase()+' S/ '+nf2.format(TARIFA[s.amb][0])})), {ref:md});
}

// -------- alimentos
let metric = 's';
$('#mS').onclick = ()=>{metric='s'; $('#mS').setAttribute('aria-pressed','true'); $('#mK').setAttribute('aria-pressed','false'); foods();};
$('#mK').onclick = ()=>{metric='kg'; $('#mK').setAttribute('aria-pressed','true'); $('#mS').setAttribute('aria-pressed','false'); foods();};
function foodAgg(){
  const set = new Set(sel().map(s=>s.cui)); const agg = {};
  D.food.forEach(([c,a,t,kg,s])=>{ if(!set.has(c)) return; const k=a; const o = agg[k]||(agg[k]={a,t,kg:0,s:0,n:new Set()}); o.kg+=kg; o.s+=s; o.n.add(c); });
  return Object.values(agg);
}
function foods(){
  const A = foodAgg();
  const tot = sum(A.map(o=>o[metric]));
  const top = A.sort((x,y)=>y[metric]-x[metric]).slice(0,15);
  hbars($('#cFood'), top.map(o=>({name:D.alimentos[o.a][0], value:o[metric], color:o.t?'var(--magenta)':'var(--azul)',
    label: metric==='s'? S0(o.s) : nf0.format(o.kg),
    tip:'<b>'+esc(D.alimentos[o.a][0])+'</b><br>'+(o.t?'Perecible':'No perecible')+'<br>'+S0(o.s)+' · '+nf1.format(o.kg)+' kg o L<br>'+P1(tot?o[metric]/tot:0)+' del total · pedido por '+o.n.size+' servicios'})), {});
  // grupos
  const g = {}; let np=0, p=0;
  A.forEach(o=>{ const k=D.grupos[D.alimentos[o.a][1]]; g[k]=(g[k]||0)+o.s; if(o.t) p+=o.s; else np+=o.s; });
  const T = np+p;
  $('#npNote').textContent = 'Del costo total, '+P1(T?np/T:0)+' corresponde a no perecibles ('+S0(np)+') y '+P1(T?p/T:0)+' a perecibles ('+S0(p)+').';
  const gr = Object.entries(g).sort((a,b)=>b[1]-a[1]);
  hbars($('#cGrupo'), gr.map(([k,v])=>({name:k.charAt(0)+k.slice(1).toLowerCase(), value:v, label:P1(T?v/T:0), tip:'<b>'+esc(k)+'</b><br>'+S0(v)})), {});
}

// -------- proveedores
function prov(){
  const L = sel();
  ['NP','P'].forEach(k=>{
    const m = {}; L.forEach(s=>{ const p = k==='NP'?s.provNP:s.provP; if(p&&p!=='nan') (m[p]=m[p]||[]).push(s); });
    const rows = Object.entries(m).sort((a,b)=>b[1].length-a[1].length);
    hbars($('#cProv'+k), rows.map(([p,ss])=>({name:p, value:ss.length, color:k==='NP'?'var(--azul)':'var(--magenta)', label:ss.length+' serv.',
      tip:'<b>'+esc(p)+'</b><br>'+[...new Set(ss.map(s=>s.ut))].map(esc).join(', ')})), {});
  });
}

// RUC válido: 11 dígitos y dígito verificador de SUNAT (pesos 5-4-3-2-7-6-5-4-3-2)
// RUC de persona natural (empieza con 10 y contiene el DNI): no se publica. En los datos llega como "PN<n>:<v|x>:<largo>:<d|o>".
const esPN = r => /^PN\d+:/.test(String(r||''));
const pnInfo = r => { const p = String(r).split(':'); return {ok:p[1]==='v', len:+p[2], dig:p[3]==='d'}; };
const rucVer = r => String(r||'').split(' / ').map(x=>esPN(x)?'de persona natural, no se publica':x).join(' / ');
const rucMalTxt = r => { if (esPN(r)){ const i=pnInfo(r); return 'RUC de persona natural, no se publica'+(i.dig?' de '+i.len+' dígitos':'')+(i.len===11?', no pasa el dígito verificador':''); }
  return 'RUC '+esc(r)+(/^\d+$/.test(r)?' de '+r.length+' dígitos':'')+(r.length===11?', no pasa el dígito verificador':''); };
const rucOk = r => { if (esPN(r)) return pnInfo(r).ok; r = String(r||''); if(!/^\d{11}$/.test(r)) return false; const w=[5,4,3,2,7,6,5,4,3,2]; let d = 11 - w.reduce((t,x,i)=>t+x*+r[i],0)%11; d = d===10?0:d===11?1:d; return d===+r[10]; };
function provRuc(s, k){
  const n = s['prov'+k], st = s['st'+k];
  if(!n || n==='nan') return '<span style="color:var(--muted)">sin proveedor</span>';
  const r = s['rucStd'+k] || '';
  let h = esc(n)+'<br><span style="font-size:12.5px;color:var(--muted)">RUC '+esc(rucVer(r)||'—')+(st==='sinadj'?' · tal como llegó en el envío':' · adjudicado')+'</span>';
  if (st && st!=='ok' && st!=='sinadj' && st!=='vacio') h += '<br><span style="font-size:12.5px;color:var(--warn)">En el envío: '+esc(s['env'+k])+' · '+(s['ruc'+k]?'RUC '+esc(rucVer(s['ruc'+k])):'sin RUC')+'</span>';
  else if (st==='sinadj' && !rucOk(s['ruc'+k])) h += '<br><span style="font-size:12.5px;color:var(--warn)">RUC no válido</span>';
  return h;
}
// -------- calidad (todos los envíos vigentes)
function calidad(){
  const S = sel(), items = [];
  $('#calLede').textContent = 'Situaciones que conviene revisar antes de usar estas cifras.';
  const tw = S.filter(s=>s.twin.length); const claves = [...new Set(tw.map(s=>[s.cui,...s.twin].sort().join(' y ')))]; const pares = claves.length;
  if (pares) items.push([pares, 'Mismo contenido enviado con dos CUI', 'Envíos con el mismo presupuesto, costo y usuarios bajo CUI distintos: '+
    claves.map(k=>{const s=byCui[k.split(' y ')[0]]; return saA(s)+' (CUI '+k+')';}).join('; ')+'. Puede ser un mismo archivo enviado dos veces con otro CUI; se cuentan dos veces en las sumas.']);
  // CUI que no corresponde al servicio: el nombre, el comité y el distrito del envío no son los del padrón para ese CUI.
  // El envío vigente se decide por el CUI del padrón, así que los envíos repetidos con CUI equivocado se descartan y el servicio
  // cuyo CUI fue usado por otro recupera su propio envío.
  const selCui = new Set(S.map(s=>s.cui)), fh = f=>f.slice(8,10)+'/'+f.slice(5,7)+' '+f.slice(11,16);
  const cuiMal = S.filter(s=>s.cuiSug), desc = (D.descartados||[]).filter(d=>selCui.has(d[1])), resc = S.filter(s=>s.rescatado);
  const partes = [];
  cuiMal.forEach(s=> partes.push(saA(s)+' (CG '+esc(s.cg)+', '+esc(s.utEnv)+'): registró el CUI '+esc(s.cuiEnv)+', que '+(s.padSA?'en el padrón es '+esc(s.padSA)+' ('+esc(s.padUTcui)+', CG '+esc(s.padCG)+')':'no figura en el padrón')+
    (s.cuiSug==='?' ? '; no se encontró en el padrón un servicio con este nombre y comité' : '; en el padrón este servicio tiene el CUI <b>'+s.cui+'</b>, con el que se cuenta')));
  desc.forEach(d=>{ const s=byCui[d[1]]; partes.push((s?saA(s):esc(d[2]))+': el envío del '+fh(d[3])+' llegó con el CUI '+esc(d[0])+' y después el mismo servicio envió con su CUI correcto, <b>'+d[1]+'</b>; se descarta el primero para no contarlo dos veces'); });
  resc.forEach(s=> partes.push(saA(s)+' (CUI '+s.cui+') envió el '+fh(s.fecha)+', pero ese envío había quedado reemplazado por el de otro servicio que usó su CUI; se recupera como su envío vigente'));
  if (partes.length) items.push([cuiMal.length+desc.length+resc.length, 'CUI que no corresponde al servicio', partes.join('; ')+'. El envío vigente, el avance y la unidad territorial se calculan con el CUI del padrón; conviene corregir el CUI en la herramienta.']);
  const fuera = S.filter(s=>!s.padron);
  if (fuera.length) items.push([fuera.length, 'CUI que no está en el padrón', fuera.map(s=>saA(s)+' (CUI '+s.cui+', '+esc(s.utEnv)+')').join('; ')+'. Se cuenta en el avance y se suma a los esperados de su UT/OCT.']);
  const enSel = new Set(S.map(s=>s.cui));
  const ded = S.filter(s=>s.ambDed);
  if (ded.length) items.push([ded.length, 'Comité de gestión fuera del listado de CG', 'No se encontró el código del comité en el listado de CG; su ámbito se dedujo del presupuesto registrado: '+ded.map(s=>saA(s)+' (CG '+esc(s.cg)+', código '+esc(s.cgCod||'sin código')+')').join('; ')+'.']);
  const ut = S.filter(s=>s.padron && s.ut.toUpperCase()!==String(s.utEnv).toUpperCase());
  if (ut.length) items.push([ut.length, 'Unidad territorial distinta a la del padrón', ut.map(s=>saA(s)+': escrita como '+esc(s.utEnv)+', padrón '+esc(s.ut)).join('; ')+'. Aquí se cuenta con la del padrón.']);
  const reenv = sum(S.map(s=>s.reenv)), envTot = S.length + reenv;
  items.push([reenv, 'Envíos reemplazados por un reenvío', (reenv===0?'Ningún envío fue reemplazado por un reenvío.':reenv+' de '+envTot+' envíos '+(reenv===1?'fue reemplazado':'fueron reemplazados')+' porque el mismo servicio volvió a enviar. No afecta las cifras: solo cuenta el último.')]);
  // RUC de los proveedores: dígito verificador de SUNAT (11 dígitos, pesos 5-4-3-2-7-6-5-4-3-2) y un solo RUC por proveedor
  // Proveedores frente a los resultados de adquisición 2026: en la app se usa el proveedor adjudicado al CG (razón social y RUC
  // estandarizados); aquí se alerta cuando el envío registra datos distintos. Las diferencias de forma (orden de apellidos y nombres,
  // tildes, signos, espacios, E.I.R.L./EIRL) no cuentan.
  const PV = [['NP','no perecibles'],['P','perecibles']];
  const adjTxt = a => a.map(([r,n])=>esc(n)+' (RUC '+esc(rucVer(r))+')').join(' y ');
  const envTxt = (s,k) => esc(s['env'+k])+' ('+(s['ruc'+k]?'RUC '+esc(rucVer(s['ruc'+k])):'sin RUC')+')';
  const sunatDe = (s,r) => (s.of||{})[r] || (D.rucOf||{})[r];
  const L = {ruc:[], nom:[], otro:[], sinadj:[], malos:[]};
  S.forEach(s=>PV.forEach(([k,t])=>{ const st=s['st'+k], a=s['adj'+k]||[], r=s['ruc'+k]||'';
    if (st==='ruc') L.ruc.push(saA(s)+' ('+t+'): registró '+envTxt(s,k)+(sunatDe(s,r)?', RUC que según SUNAT corresponde a '+esc(sunatDe(s,r)):'')+'; adjudicado: <b>'+adjTxt(a.filter(x=>x[0]===s['rucStd'+k]).length?a.filter(x=>x[0]===s['rucStd'+k]):a)+'</b>');
    else if (st==='nom') L.nom.push(saA(s)+' ('+t+'): registró '+esc(s['env'+k])+'; según el RUC '+esc(rucVer(s['rucStd'+k]))+' es <b>'+esc(s['prov'+k])+'</b>');
    else if (st==='otro') L.otro.push(saA(s)+' ('+t+'): registró '+envTxt(s,k)+(sunatDe(s,r)&&sunatDe(s,r)!==s['env'+k]?', RUC que según SUNAT corresponde a '+esc(sunatDe(s,r)):'')+'; adjudicado: <b>'+adjTxt(a)+'</b>');
    else if (st==='sinadj'){ if (s['adj'+k]) L.sinadj.push(saA(s)+' ('+t+', CG '+esc(s.cg)+(s.cgCod?' código '+esc(s.cgCod):'')+')');
      if (!rucOk(r)) L.malos.push(saA(s)+' ('+t+': '+esc(s['env'+k])+', '+(r?rucMalTxt(r):'sin RUC')+')'); }
  }));
  const fte = 'los resultados de adquisición de alimentos 2026'+(D.adjCorte?' ('+esc(D.adjCorte)+')':'');
  if (L.otro.length) items.push([L.otro.length, 'Proveedor distinto al adjudicado', 'El envío registra un proveedor que no es el adjudicado al comité de gestión en '+fte+': '+L.otro.join('; ')+'. En el tablero se muestra el adjudicado.']);
  if (L.ruc.length) items.push([L.ruc.length, 'RUC distinto al del proveedor adjudicado', 'El proveedor es el adjudicado, pero el RUC registrado en el envío no es el suyo: '+L.ruc.join('; ')+'. Conviene corregir el RUC en la herramienta.']);
  if (L.nom.length) items.push([L.nom.length, 'Razón social distinta a la del RUC adjudicado', 'El RUC es el del proveedor adjudicado, pero la razón social registrada no coincide con la estandarizada (no se cuentan diferencias de forma, como el orden de apellidos y nombres o E.I.R.L. frente a EIRL): '+L.nom.join('; ')+'.']);
  if (L.sinadj.length) items.push([L.sinadj.length, 'Comité de gestión sin proveedor adjudicado registrado', 'No se encontró el comité de gestión en '+fte+', así que se muestra el proveedor tal como llegó en el envío: '+L.sinadj.join('; ')+'.']);
  if (L.malos.length) items.push([L.malos.length, 'RUC de proveedor no válido', 'El RUC registrado no tiene 11 dígitos o no corresponde a un RUC válido: '+L.malos.join('; ')+'.']);
  const sob = S.filter(s=>s.presT - s.costT < -1);
  items.push([sob.length, 'Costo mayor al presupuesto', sob.length ? sob.map(s=>saA(s)).join(', ') : 'Ningún envío vigente supera su presupuesto.']);
  if (D.envVig < 5) items.push([D.envVig, 'Pocos envíos en este mes', 'El consolidado de '+mesTxt(D.periodo)+' tiene solo '+D.envVig+' envío'+(D.envVig===1?'':'s')+' vigente'+(D.envVig===1?'':'s')+'; puede tratarse de una prueba de la herramienta. Use el selector de mes para ver otro periodo.']);
  const obsHTML = its => its.map(([n,h,p])=>'<article><div class="num"'+((h.startsWith('Costo mayor')&&!n)||h.startsWith('Envíos reemplazados')||h.startsWith('Envíos de otros')?' style="color:var(--muted)"':'')+'>'+n+'</div><h4>'+h+'</h4><p>'+p+'</p></article>').join('');
  // sin observaciones: recuadro verde de confirmación; los conteos en cero no se listan y los reenvíos quedan como dato informativo
  const info = h => /^Envíos reemplazados|^Pocos envíos/.test(h);
  const okBox = msg => '<div class="okbox" style="margin-bottom:10px"><span class="okic" aria-hidden="true">✓</span><span>'+msg+'</span></div>';
  const quien = UT==='TODAS' ? 'los envíos vigentes seleccionados' : 'los envíos vigentes '+esc(deSel());
  const vis = items.filter(([n,h])=>n || info(h));
  const hayObs = vis.some(([n,h])=>!info(h));
  $('#obs').innerHTML = (hayObs ? '' : okBox('Sin observaciones en '+quien+': los CUI corresponden al padrón, los proveedores y RUC coinciden con los adjudicados y ningún costo supera el presupuesto.')) + obsHTML(vis.filter(([n,h])=>n));
  const envIt = items.filter(([n,h])=>/^CUI que no corresponde|^Envíos reemplazados|^CUI que no está en el padrón/.test(h));
  const envAl = envIt.filter(([n,h])=>n && !info(h));
  $('#obsEnv').innerHTML = (envAl.length ? '' : okBox('Sin alertas sobre '+quien+': todos los CUI corresponden al servicio en el padrón.')) + obsHTML(envIt.filter(([n,h])=>n));
}

// -------- ir al detalle de un servicio desde cualquier nombre
function irDetalle(cui){
  const s = byCui[cui]; if(!s) return;
  if ($('#vRes').hidden) tab('res');
  if (!sel().includes(s)){ UT=s.ut; CG=''; SAF=''; $('#fUT').value=UT; llenarFiltros(); }   // el detalle solo existe con la UT filtrada
  $('#q').value=''; openCui = cui; render();
  const tr = document.querySelector('#tSA tr[data-cui="'+cui+'"]');
  (tr||$('#detalle')).scrollIntoView({behavior:'smooth', block:'center'});
}
on('click', e=>{
  const a = e.target.closest('a.salink'); if(!a) return;
  e.preventDefault(); e.stopPropagation();
  if (a.dataset.go) irDetalle(a.dataset.go);
  else if (a.dataset.saf){ const s = byCui[a.dataset.saf]; if (s) fijarFiltro(s.ut, CG && nCG(s.cg)===CG ? CG : '', s.cui); }
  else if (a.dataset.ut) fijarFiltro(a.dataset.ut, '', '');
});

// -------- detalle
let sortK = 'ejec', sortD = -1, openCui = null;
const cols = [
  ['sa','Servicio alimentario',s=>'<span class="nmsa">'+esc(s.sa)+'</span>'+(s.padron?'':' <span class="chip">fuera del padrón</span>')+(s.twin.length?' <span class="chip">CUI duplicado</span>':'')],
  ['apMal','Aporte nutricional',s=>{ if(!s.dias) return '—'; const r=evaluarAporte(s); const n=r.malos.length;
      const dd = n ? diasDz(s) : [];
      return n ? lnkDias(s,r.malos,'Días bajo la meta del Programa','<span class="chip">'+n+' día'+(n===1?'':'s')+' bajo la meta</span>','chipl')+(dd.length?'<br>'+chipDz(s,dd):'') : '<span class="chip ok">Cumple</span>'; }],
  ['ninos','Niños · AC',s=>s.ninos+' · '+s.acs,1],
  ['amb','Ámbito',s=>AMB[s.amb]+(s.rn?'<br><span style="color:var(--muted);font-size:12px">'+esc(s.rn)+'</span>':'')+(s.ambDed?' <span class="chip" title="El comité de gestión no figura en el listado de CG; el ámbito se dedujo del presupuesto registrado">deducido</span>':'')], ['costT','Costo<br>presupuesto',s=>S0(s.costT)+'<span class="sub2">'+S0(s.presT)+'</span>',1], ['ejec','Uso',s=>nf0.format(s.ejec*100)+' %',1],
  ['ninoDia','S/ por día<br>niño · AC',s=>nf2.format(s.ninoDia)+' · '+nf2.format(s.acDia),1], ['reenv','Reenvíos',s=>s.reenv,1], ['fecha','Último<br>envío',s=>s.fecha.slice(8,10)+'/'+s.fecha.slice(5,7)+'<span class="sub2">'+s.fecha.slice(11)+'</span>']
];
$('#q').addEventListener('input', detalle);
// sin filtro de UT/OCT, el detalle es un resumen por UT/OCT con la misma estructura; al tocar una fila se filtra esa UT/OCT
const colsUT = [
  ['sa','UT/OCT',o=>'<span class="nmsa" style="white-space:nowrap">'+esc(o.ut)+'</span>'],
  ['apMal','Aporte nutricional',o=> !o.conDias ? '—' : o.apMal ? lnkLista('Días bajo la meta del Programa · '+o.ut, o.itAp, '<span class="chip">'+o.apMal+' de '+o.conDias+' bajo la meta</span>', 'chipl') : '<span class="chip ok">Cumple</span>'],
  ['n','Servicios',o=>o.n,1], ['ninos','Niños · AC',o=>nf0.format(o.ninos)+' · '+nf0.format(o.acs),1],
  ['amb','Ámbito',o=>o.ambTxt], ['costT','Costo<br>presupuesto',o=>S0(o.costT)+'<span class="sub2">'+S0(o.presT)+'</span>',1], ['ejec','Uso',o=>nf0.format(o.ejec*100)+' %',1],
  ['ninoDia','S/ por día<br>niño · AC',o=>(o.ninoDia?nf2.format(o.ninoDia):'—')+' · '+(o.acDia?nf2.format(o.acDia):'—'),1], ['reenv','Reenvíos',o=>o.reenv,1], ['fecha','Último<br>envío',o=>o.fecha.slice(8,10)+'/'+o.fecha.slice(5,7)+'<span class="sub2">'+o.fecha.slice(11)+'</span>']
];
function resumenPorUT(){
  const g = {}; sel().forEach(s=>(g[s.ut]=g[s.ut]||[]).push(s));
  return Object.entries(g).map(([ut,ss])=>{
    const conD = ss.filter(s=>s.dias), al = conD.map(s=>({s, r:evaluarAporte(s)})).filter(x=>x.r.malos.length);
    const nd = sum(ss.map(s=>s.ninos*s.dias)), ad = sum(ss.map(s=>s.acs*s.dias));
    const pres = sum(ss.map(s=>s.presT)), cost = sum(ss.map(s=>s.costT));
    const amb = {}; ss.forEach(s=>{ const k=AMB[s.amb]; amb[k]=(amb[k]||0)+1; });
    return {ut, sa:ut, n:ss.length, conDias:conD.length, apMal:al.length, itAp:al.map(x=>({s:x.s, dias:x.r.malos.map(m=>({f:m.f, s:m.s}))})),
      ninos:sum(ss.map(s=>s.ninos)), acs:sum(ss.map(s=>s.acs)), amb:Object.keys(amb).sort().join(' '),
      ambTxt:Object.entries(amb).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<span style="white-space:nowrap">'+k+' '+v+'</span>').join('<br>'),
      presT:pres, costT:cost, ejec: pres?cost/pres:0, ninoDia: nd?sum(ss.map(s=>s.costCons[0]))/nd:0, acDia: ad?sum(ss.map(s=>s.costCons[1]))/ad:0,
      reenv:sum(ss.map(s=>s.reenv)), fecha:ss.map(s=>s.fecha).sort().pop()};
  });
}
function detalle(){
  const porUT = UT==='TODAS';
  $('#detalle').hidden = false;
  const nl = document.querySelector('#navRes a[href="#detalle"]'); if (nl) nl.hidden = false;
  $('#detH').firstChild.nodeValue = porUT ? 'Detalle por unidad territorial' : 'Detalle por servicio alimentario';
  $('#detLede').textContent = porUT
    ? 'Resumen de los envíos vigentes de cada UT/OCT, con la misma estructura del detalle por servicio. Toque una fila para ver los servicios alimentarios de esa UT/OCT; toque los servicios con días bajo la meta para ver cuáles son y sus fechas. Toque un encabezado para ordenar.'
    : 'Servicios alimentarios de la UT/OCT filtrada. Toque una fila para ver el pedido y el menú de ese servicio; toque los días bajo la meta para ir al menú de esos días. Toque un encabezado para ordenar.';
  $('#q').placeholder = porUT ? 'Nombre de la UT/OCT' : 'Nombre, CUI o comité de gestion'.replace('gestion','gestión');
  const q = $('#q').value.trim().toLowerCase();
  const ord = (a,b)=> (a[sortK]>b[sortK]?1:a[sortK]<b[sortK]?-1:0)*sortD;
  const C = porUT ? colsUT : cols;
  let filas;
  if (porUT){ openCui = null; filas = resumenPorUT().filter(o=>!q || o.ut.toLowerCase().includes(q)).sort(ord); }
  else { sel().forEach(s=>{ s.apMal = s.dias ? evaluarAporte(s).malos.length : -1; });
    filas = sel().filter(s=>!q || (s.sa+' '+s.cui+' '+s.cg).toLowerCase().includes(q)).sort(ord); }
  $('#tSA').innerHTML = '<thead><tr>'+C.map(c=>'<th class="sort'+(c[3]?' n':'')+'" tabindex="0" data-k="'+c[0]+'" aria-sort="'+(sortK===c[0]?(sortD>0?'ascending':'descending'):'none')+'">'+c[1]+(sortK===c[0]?(sortD>0?' ↑':' ↓'):'')+'</th>').join('')+'</tr></thead><tbody>'+
    filas.map(o=> porUT
      ? '<tr class="click" data-ut="'+esc(o.ut)+'" title="Ver los servicios alimentarios de '+esc(o.ut)+'">'+C.map(c=>'<td'+(c[3]?' class="n"':'')+'>'+c[2](o)+'</td>').join('')+'</tr>'
      : '<tr class="click" data-cui="'+o.cui+'"'+(o.cui===openCui?' style="outline:2px solid var(--azul)"':'')+'>'+C.map(c=>'<td'+(c[3]?' class="n"':'')+'>'+c[2](o)+'</td>').join('')+'</tr>').join('')+'</tbody>';
  drawer();
}
$('#tSA').addEventListener('click', e=>{
  const th = e.target.closest('th'); if(th){ const k=th.dataset.k; if(!k) return; if(sortK===k) sortD=-sortD; else {sortK=k; sortD=(k==='sa'||k==='ut')?1:-1;} detalle(); return; }
  if (e.target.closest('a')) return;   // enlaces dentro de la fila (p. ej., días bajo la meta) no abren la ficha
  const tu = e.target.closest('tr[data-ut]'); if(tu){ $('#q').value=''; fijarFiltro(tu.dataset.ut, '', ''); $('#detalle').scrollIntoView({behavior:'smooth', block:'start'}); return; }
  const tr = e.target.closest('tr[data-cui]'); if(tr){ openCui = openCui===tr.dataset.cui?null:tr.dataset.cui; detalle(); if(openCui) $('#drawer').scrollIntoView({behavior:'smooth',block:'nearest'}); }
});
$('#tSA').addEventListener('keydown', e=>{ if(e.key==='Enter'){ const th=e.target.closest('th'); if(th) th.click(); }});
function drawer(){
  const s = openCui && byCui[openCui];
  if(!s){ $('#drawer').innerHTML=''; return; }
  const detOk = window.__cargarDet(s.cui);
  if (detOk !== true) detOk.then(()=>{ if (!AC.signal.aborted && openCui===s.cui) drawer(); }).catch(()=>{});
  const f = D.food.filter(r=>r[0]===s.cui).sort((a,b)=>b[4]-a[4]);
  const tf = sum(f.map(r=>r[4]));
  const m = D.menu.filter(r=>r[0]===s.cui);
  const porT = D.tiempos.map((t,i)=>m.filter(r=>r[1]===i).sort((a,b)=>b[3]-a[3]));
  $('#drawer').innerHTML = '<div class="drawer"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>'+esc(s.sa)+'</h3><span class="chip blue">CUI '+s.cui+'</span></div>'+
    '<p class="note" style="margin:2px 0 0">'+'<button type="button" class="ghost" style="float:right;font:inherit;font-size:13px;padding:4px 10px;border:1px solid var(--azul);color:var(--azul);background:var(--surface);border-radius:8px;cursor:pointer" onclick="__verMenu(\''+s.cui+'\')">Ver menú semanal</button>'+esc(s.ut)+' · '+esc(s.prov)+', '+esc(s.dist)+' · Comité de gestión '+esc(s.cg)+'</p>'+
    '<div class="facts"><div><b>Usuarios</b>'+s.u.join(' · ')+' <span style="color:var(--muted)">(6-8 · 9-11 · 12-23 · 24-36 m)</span></div><div><b>Actores comunales</b>'+s.ac.join(' · ')+' <span style="color:var(--muted)">(MC · MG · SC)</span></div>'+
    '<div><b>Presupuesto calculado</b>'+S2(s.presT)+' <span style="color:var(--muted)">('+AMB[s.amb].toLowerCase()+(s.rn?' · '+s.rn.toLowerCase():'')+')</span><br><span style="color:var(--muted);font-size:13px">Registrado en el envío: '+S2(s.presReg)+'</span></div><div><b>Costo por día</b>S/ '+nf2.format(s.ninoDia)+' por niño · S/ '+nf2.format(s.acDia)+' por AC<br><span style="color:var(--muted);font-size:13px">Incluye saldos de no perecibles por '+S2(s.saldo[0]+s.saldo[1])+'</span></div><div><b>Costo</b>'+S2(s.costT)+' ('+nf0.format(s.ejec*100)+' %)</div><div><b>Días con menú</b>'+s.dias+'</div><div><b>Proveedor de no perecibles</b>'+provRuc(s,'NP')+'</div><div><b>Proveedor de perecibles</b>'+provRuc(s,'P')+'</div></div>'+
    '<div class="grid2"><div><h3 style="font-size:15px;margin:6px 0">Pedido: 10 alimentos de mayor costo</h3><div id="dF"></div></div><div><h3 style="font-size:15px;margin:6px 0">Menú: preparaciones por tiempo de comida</h3><div style="font-size:13px">'+
    (detOk !== true ? '<p class="note">Cargando…</p>' : porT.map((rows,i)=>'<p style="margin:6px 0"><b>'+['Media mañana','Almuerzo','Media tarde','Fruta'][i]+':</b> '+rows.slice(0,6).map(r=>esc(D.preps[r[2]])+' ('+r[3]+' d)').join(', ')+(rows.length>6?', y '+(rows.length-6)+' más':'')+'</p>').join(''))+
    '</div></div></div></div>';
  hbars($('#dF'), f.slice(0,10).map(r=>({name:D.alimentos[r[1]][0], value:r[4], color:r[2]?'var(--magenta)':'var(--azul)', label:S0(r[4]), tip:esc(D.alimentos[r[1]][0])+'<br>'+nf1.format(r[3])+' kg o L · '+P1(tf?r[4]/tf:0)})), {});
}

$('#foot').innerHTML = 'Fuente: libro CONSOLIDADO_'+D.periodo+' de la carpeta ENVIOS_HERRAMIENTA_PNCM (hojas ENVIOS, MENUPROG, PNP, PPTOTAL y COTIZACIONES) y padrón de '+D.padTotal+' servicios alimentarios '+((D.padRef && D.padRef.sa && D.padRef.sa!=='PADRON_SA.csv') ? 'del archivo '+esc(D.padRef.sa)+(D.padRef.ex?', sin los de '+esc(D.padRef.ex):'')+'.' : '(seguimiento de funcionamiento de agosto de 2026, sin los que no usan sus instalaciones y no tienen trámite de cierre en el Sistema Integrado).')+' Los proveedores son los adjudicados a cada comité de gestión según la hoja RESULTADOS CG del Seguimiento Adquisición Alimentos 2026'+(D.adjCorte?' ('+D.adjCorte+')':'')+', con la razón social y el RUC estandarizados de la hoja RESULTADOS ZONAS (revisada con SUNAT); las diferencias con lo registrado en el envío se señalan en Calidad de los datos. Solo se usan envíos vigentes. La unidad territorial de cada servicio es la del padrón cuando su CUI figura en él. Los montos están en soles.';


// ================= MENÚ SEMANAL =================
const DIAS = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES'];
const ORD = ['Primera','Segunda','Tercera','Cuarta','Quinta'];
const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
const FILAS = [
  {hora:'9:00 a 10:00 a.m.', tipo:'REFRIGERIO DE MEDIA MAÑANA', grupo:'6 a 36 MESES', k:0},
  {hora:'12:00 m. a 1:00 p.m.', tipo:'ALMUERZO', grupo:'6 a 8 MESES', k:1, span:2},
  {grupo:'9 a 36 MESES', k:2},
  {hora:'2:30 a 3:30 p.m.', tipo:'REFRIGERIO DE MEDIA TARDE', grupo:'6 a 36 MESES', k:3},
  {hora:'Según complemento', tipo:'FRUTA (COMPLEMENTO)', grupo:'6 a 36 MESES', k:4}
];
const pd = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const ddmm = d => String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
const lunes = d => { const x=new Date(d); const w=(x.getDay()+6)%7; x.setDate(x.getDate()-w); return x; };
let SA = null, SEM = null;
try { SA = localStorage.getItem('envios_sa'); } catch(e) {}

function semanasDe(cui){
  const rows = D.menuW[cui]||[]; const m = {};
  rows.forEach(([f,s])=>{ const L=iso(lunes(pd(f))); const o=m[s]||(m[s]={s,lun:L,min:f,max:f}); if(f<o.min)o.min=f; if(f>o.max)o.max=f; });
  return Object.values(m).sort((a,b)=>a.s-b.s);
}
function semanaEnCurso(sems){
  if(!sems.length) return null;
  const hoy = iso(new Date()), L = iso(lunes(new Date()));
  const exact = sems.find(w=>w.lun===L); if(exact) return exact.s;
  const prox = sems.find(w=>w.min>=hoy); return prox ? prox.s : sems[sems.length-1].s;
}
function llenarSA(){
  const L = sel().filter(s=>s.mw).sort((a,b)=>a.sa.localeCompare(b.sa,'es'));
  if(!L.find(s=>s.cui===SA)) SA = L.length ? L[0].cui : null;
  $('#fSA').innerHTML = L.map(s=>'<option value="'+s.cui+'">'+esc(s.sa)+' · CUI '+s.cui+(UT==='TODAS'?' · '+esc(s.ut):'')+'</option>').join('');
  if(SA) $('#fSA').value = SA;
}
function llenarSem(keep){
  if (SA){ const r = window.__cargarDet(SA);
    if (r !== true){ $('#fSem').innerHTML = '<option>Cargando…</option>'; $('#wPrev').disabled = $('#wNext').disabled = $('#wHoy').disabled = true;
      r.then(()=>{ if (!AC.signal.aborted){ llenarSem(keep); hoja(); } }).catch(()=>{ if (!AC.signal.aborted) $('#fSem').innerHTML = '<option>No se pudo cargar</option>'; });
      return []; } }
  const sems = SA ? semanasDe(SA) : [];
  if(!keep || !sems.find(w=>w.s===SEM)) SEM = semanaEnCurso(sems);
  $('#fSem').innerHTML = sems.map(w=>{ const a=pd(w.lun), b=new Date(a); b.setDate(b.getDate()+4);
    return '<option value="'+w.s+'">'+w.s+'° semana · '+ddmm(a)+' al '+ddmm(b)+'</option>'; }).join('');
  if(SEM!=null) $('#fSem').value = String(SEM);
  const i = sems.findIndex(w=>w.s===SEM);
  $('#wPrev').disabled = i<=0; $('#wNext').disabled = i<0 || i>=sems.length-1;
  const cur = semanaEnCurso(sems); $('#wHoy').disabled = cur===SEM;
  return sems;
}
// En pantallas angostas la hoja muestra un día a la vez, con un selector de día
const MQ1 = window.matchMedia('(max-width: 760px)');
let DIA = null, DIAkey = '', FOCO = null;   // FOCO: día señalado desde una alerta {cui, f, mot, dias:[{f,s}]}
MQ1.addEventListener('change', ()=>{ if(!$('#vMen').hidden) hoja(); }, {signal: AC.signal});
function fijarCab(){
  const t = document.querySelector('#sheet table.mt'); if(!t || !t.tHead) return;
  const ths = t.tHead.rows[0].cells; const bar = document.querySelector('.bar');
  const tope = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
  const r = t.getBoundingClientRect(), hh = t.tHead.offsetHeight;
  const dy = Math.max(0, Math.min(tope - r.top, r.height - hh - 60));
  for (const c of ths) c.style.transform = dy ? 'translateY('+dy+'px)' : '';
  t.tHead.classList.toggle('fija', dy>0);
  // la fila de edades de la sección del aporte en la que se está queda fija bajo la cabecera de días
  const base = r.top, piso = base + t.tHead.offsetTop + dy + hh - 2;   // -2: solapa el borde colapsado para que no asome el contenido      // borde inferior de la cabecera de días
  const secs = [...t.querySelectorAll('tbody.ap tr.sec')];
  let act = -1; secs.forEach((tr,i)=>{ if (base + tr.offsetTop < piso) act = i; });
  secs.forEach((tr,i)=>{ let d = 0;
    if (i===act && dy>0){ const top = base + tr.offsetTop, nx = secs[i+1] && (secs[i+1].previousElementSibling && secs[i+1].previousElementSibling.classList.contains('tit') ? secs[i+1].previousElementSibling : secs[i+1]), sig = nx ? base + nx.offsetTop : base + r.height - 40;
      d = Math.max(0, Math.min(piso - top, sig - tr.offsetHeight - top)); }
    for (const c of tr.cells) c.style.transform = d ? 'translateY('+d+'px)' : '';
    tr.classList.toggle('fija', d>0); });
}
let cabRaf = 0; const cabProg = ()=>{ if(!cabRaf) cabRaf = requestAnimationFrame(()=>{ cabRaf=0; fijarCab(); }); };
window.addEventListener('scroll', cabProg, {passive:true, signal:AC.signal});
window.addEventListener('resize', cabProg, {signal:AC.signal});
{ const bar=document.querySelector('.bar'); if(bar) bar.addEventListener('transitionend', cabProg, {signal:AC.signal}); }
function hoja(){
  const s = SA && byCui[SA];
  { const zb = $('#dzBox'); if (zb){ zb.innerHTML=''; zb.hidden = true; } }
  if(!s){ $('#sheet').innerHTML='<p class="note">No hay servicios con menú en esta selección.</p>'; $('#sheetNote').textContent=''; return; }
  if(!D._det[SA]){ $('#sheet').innerHTML='<p class="note">Cargando el menú de este servicio…</p>'; $('#sheetNote').textContent=''; return; }
  const sems = semanasDe(SA); const w = sems.find(x=>x.s===SEM); if(!w){ $('#sheet').innerHTML=''; return; }
  const lun = pd(w.lun); const fechas = DIAS.map((_,i)=>{ const d=new Date(lun); d.setDate(d.getDate()+i); return iso(d); });
  const foF = (FOCO && FOCO.cui===SA) ? FOCO.f : null;
  const cell = {}; (D.menuW[SA]||[]).forEach(([f,sm,k,cod,p])=>{ if(sm===SEM) cell[f+'|'+k]=[cod,p]; });
  const atenS = fechas.map(f=>FILAS.some(r=>cell[f+'|'+r.k]));
  const uno = MQ1.matches;
  if (DIAkey !== SA+'|'+SEM || DIA==null){
    DIAkey = SA+'|'+SEM; const hoyI = fechas.indexOf(iso(new Date()));
    DIA = hoyI>=0 ? hoyI : Math.max(0, atenS.indexOf(true));
  }
  const IX = uno ? [DIA] : [0,1,2,3,4];
  const dsel = !uno ? '' : '<div class="dsel" role="group" aria-label="Día de la semana">'+fechas.map((f,i)=>'<button type="button" data-dia="'+i+'" aria-pressed="'+(i===DIA)+'"'+(atenS[i]?'':' class="off"')+'>'+DIAS[i].slice(0,3)+'<small>'+ddmm(pd(f))+'</small></button>').join('')+'</div>';
  const DD = IX.map(i=>DIAS[i]);
  const aten = IX.map(i=>atenS[i]);
  const fechasV = IX.map(i=>fechas[i]);
  const mesNum = +D.periodo.slice(5,7), anio = D.periodo.slice(0,4);
  let h = '<div class="shead"><div class="l">Unidad Territorial '+esc(s.ut)+'</div>'+
    '<div class="t">PROGRAMACIÓN DEL MENÚ CG '+esc(s.cg)+' - S.A. '+esc(s.sa)+'<span>'+ORD[SEM-1]+' Semana</span></div>'+
    '<div class="r">MES Y AÑO: <u>'+MESES[mesNum-1]+'</u> <u>'+anio+'</u></div></div>';
  const fo = (FOCO && FOCO.cui===SA) ? FOCO : null;
  const zz = dzDe(s), dzK = {}; Object.keys(zz).forEach(f=>zz[f].forEach(o=>{ dzK[f+'|'+o[0]] = 1; }));
  if (fo) h += '<div class="foco" role="status"><span class="fm"><b>'+esc(fo.mot)+'</b>'+(fo.dias.length>1?' · '+fo.dias.length+' días':'')+'</span><span class="fd">'+fo.dias.map(d=>'<button type="button" data-fo="'+d.f+'" data-fs="'+d.s+'" aria-pressed="'+(d.f===fo.f)+'">'+DIAS[(pd(d.f).getDay()+6)%7].slice(0,3).toLowerCase()+' '+ddmm(pd(d.f))+'</button>').join('')+'</span>'+(zz[fo.f]&&fechasV.includes(fo.f)?'<button type="button" class="dzgo" data-dzgo="'+fo.f+'">Ver dosificación y sugerencias</button>':'')+'<button type="button" class="fx" data-fox aria-label="Quitar el resaltado">×</button></div>';
  h += dsel;
  // Una sola tabla para el menú y el aporte: cada día ocupa 4 columnas (una por grupo de edad), así las columnas de los días
  // quedan alineadas y la cabecera de días es una sola, fija al bajar.
  const subW = uno ? '13%' : (79/(4*IX.length)).toFixed(3)+'%';
  h += '<table class="mt'+(uno?' uno':'')+'"><colgroup>'+(uno?'<col style="width:30%"><col style="width:18%">':'<col style="width:13%"><col style="width:8%">')+IX.map(()=>('<col style="width:'+subW+'">').repeat(4)).join('')+'</colgroup><thead><tr><th>COMIDA</th><th>GRUPO</th>'+
    fechasV.map((f,i)=>'<th colspan="4" class="d'+(fo&&f===fo.f?' fo':'')+'">'+(aten[i]?DD[i]+'<small>'+ddmm(pd(f))+'/'+f.slice(0,4)+'</small>'+(zz[f]?'<a href="#dz-'+f+'" class="dzt" data-dzgo="'+f+'" data-tip="No cumple dosificaciones del Anexo N° 2 · toque para ver el detalle y las sugerencias">dosificación</a>':''):'SIN ATENCIÓN<small>'+DD[i].toLowerCase()+' '+ddmm(pd(f))+'</small>')+'</th>').join('')+'</tr></thead><tbody>';
  FILAS.forEach((r,ri)=>{
    h += '<tr>';
    if(r.hora!==undefined){ const sp = r.span?' rowspan="'+r.span+'"':'';
      h += '<th class="rh"'+sp+'>'+esc(r.tipo)+'<small>'+esc(r.hora)+'</small></th>'; }
    h += '<th class="rh">'+r.grupo+'</th>';
    fechasV.forEach((f,i)=>{
      const c = cell[f+'|'+r.k];
      const fc = f===foF ? ' fo' : '';
      if(!aten[i]) h += '<td colspan="4" class="c sa'+fc+'">-</td>';
      else if(!c) h += '<td colspan="4" class="c vacio'+fc+'"><span class="cod">&nbsp;</span>-</td>';
      else h += '<td colspan="4" class="c rcx'+fc+(dzK[f+'|'+r.k]?' dz':'')+'" tabindex="0" role="button" data-rc="'+f+'|'+r.k+'" aria-label="Ver receta: '+esc(D.preps[c[1]])+(dzK[f+'|'+r.k]?' (no cumple dosificaciones)':'')+'"'+(dzK[f+'|'+r.k]?' data-tip="Dosificación por debajo del mínimo o igual en todos los grupos (Anexo N° 2) · toque para ver la receta"':'')+'><span class="cod">'+(c[0]!=null?c[0]:'')+'</span>'+esc(D.preps[c[1]])+'</td>';
    });
    h += '</tr>';
  });
  h += '<tr><th class="rh">AGUA SEGURA<small>Durante la jornada</small></th><th class="rh">TODOS</th>'+fechasV.map((f,i)=>'<td colspan="4" class="c agua'+(aten[i]?'':' sa')+(f===foF?' fo':'')+'">'+(aten[i]?'AGUA SEGURA':'-')+'</td>').join('')+'</tr></tbody>';
  h += bloqueAporte(s, fechasV, aten, cell, uno, IX, foF) + '</table>';
  const sh = $('#sheet'); sh.classList.toggle('uno', uno); sh.innerHTML = h;
  const zb = $('#dzBox'); if (zb){ const ph = panelDz(s, fechasV.filter((f,i)=>aten[i])); zb.innerHTML = ph; zb.hidden = !ph; }
  // resalta en el bloque de aporte las 4 columnas del día señalado
  if (foF){ const di = fechasV.indexOf(foF); if (di>=0) sh.querySelectorAll('tbody.ap tr').forEach(tr=>{ let col=0; [...tr.cells].forEach(c=>{ const a=col, b=col+c.colSpan-1; col+=c.colSpan;
    const lo=2+4*di, hi=lo+3; if (a>=lo && b<=hi){ c.classList.add('fo'); if(a===lo) c.classList.add('fol'); if(b===hi) c.classList.add('for'); } }); }); }
  fijarCab();
  const nAt = atenS.filter(Boolean).length;
  $('#sheetNote').innerHTML = 'Semana del '+ddmm(lun)+' al '+ddmm(new Date(lun.getFullYear(),lun.getMonth(),lun.getDate()+4))+': '+nAt+' día'+(nAt===1?'':'s')+' con atención. '+
    'Envío vigente del '+s.fecha.slice(8,10)+'/'+s.fecha.slice(5,7)+' a las '+s.fecha.slice(11)+'. El número en la esquina de cada celda es el código de la preparación en LISTA_RECETAS de ese servicio. '+
    'La hora de la fruta depende del tiempo de comida que complementa, dato que no viaja en el envío. Toque una preparación para ver sus ingredientes, dosificación, costo y aporte. '+'El aporte se calcula como en la herramienta: suma de media mañana, almuerzo, fruta y media tarde de cada día, con la tabla de composición de la versión 8.4; en verde, lo que alcanza la meta del Programa (energía 70 %, proteínas 90 %, hierro 100 %, zinc 70 % y calcio 40 % del requerimiento). El porcentaje se redondea a entero antes de compararlo con la meta (39.7 % cuenta como 40 %). En 6 a 8 y 9 a 11 meses el calcio es referencial: se resalta en verde si llega al 40 %, y si no llega queda sin color y no cuenta como incumplimiento.'+(MQ1.matches?' En pantallas angostas se muestra un día a la vez; elija el día con los botones de arriba.':'');
}

// ================= APORTE NUTRICIONAL Y TARJETA DE RECETA =================
const GRP = ['De 6 a 8 meses','De 9 a 11 meses','De 12 a 23 meses','De 24 a 36 meses','AC'];
const GRC = ['6-8 m','9-11 m','12-23 m','24-36 m','AC'];
const NUTN = [['Energía','Kcal',0],['Proteínas','g',1],['Hierro','mg',1],['Zinc','mg',1],['Calcio','mg',0]];
const LET = {0:'R',1:'A',2:'A',3:'R',4:'F'};
const GRUPOS_FILA = {0:[0,1,2,3],1:[0],2:[1,2,3,4],3:[0,1,2,3],4:[0,1,2,3]};
const TIEMPO_FILA = {0:'Refrigerio de media mañana',1:'Almuerzo (6 a 8 meses)',2:'Almuerzo (9 a 36 meses)',3:'Refrigerio de media tarde',4:'Fruta (complemento)'};
const nfN = [new Intl.NumberFormat('es-PE',{maximumFractionDigits:0}), new Intl.NumberFormat('es-PE',{maximumFractionDigits:1,minimumFractionDigits:1})];
// aporte y costo de una receta para un grupo (índice 0..4): [kcal, prot, fe, zn, ca, costo]
function aporteReceta(cui, key, gi){
  const r = (D.recs[cui]||{})[key]; const P = D.precioIng[cui]||{}; const t=[0,0,0,0,0,0,0,0];   // kcal, prot, Fe, Zn, Ca, costo, grasa, carbohidratos
  if(!r) return null;
  if(gi===4 && key[0]!=='A') return t;          // la herramienta solo cuenta a los AC en el almuerzo
  r[1].forEach(row=>{ const g=row[1+gi]||0; const m=D.ing[row[0]]; for(let k=0;k<5;k++) t[k]+=m[1+k]/100*g*m[6]; t[5]+=(P[row[0]]||0)/1000*g; t[6]+=(m[7]||0)/100*g*m[6]; t[7]+=(m[8]||0)/100*g*m[6]; });
  return t;
}
// El calcio es referencial para 6 a 8 y 9 a 11 meses: se muestra, pero no cuenta como incumplimiento
const evalua = (j,gi) => !(j===4 && gi<2);
// Criterio de la hoja MENU (herramienta 8.4): las calorías del día se redondean a entero (ROUND(...;0))
// antes de dividirlas entre el requerimiento; los demás nutrientes van sin redondear. El porcentaje no se
// redondea para compararlo con la meta: solo se muestra sin decimales. Un porcentaje 0 queda en blanco.
// Además, el porcentaje se redondea a entero antes de compararlo con la meta: 39.7 % cuenta como 40 %.
const valorNut = (t,j) => j===0 ? Math.round(t[0]) : t[j];
const pctNut = (t,j,gi) => Math.round(valorNut(t,j) / D.req[GRP[gi]][j] * 100);   // porcentaje entero
const cumple = (pInt,j) => pInt >= Math.round(D.metaPNCM[j]*100);
// Distribución de las calorías por macronutriente (% de la energía de proteínas, grasas y carbohidratos, factores 4-9-4).
// Rango de referencia para 12 a 36 meses: rango aceptable de distribución de macronutrientes (AMDR) para 1 a 3 años de las
// Recomendaciones de Ingesta de Energía y Nutrientes (RIEN) de Colombia, Resolución 3803 de 2016 del Ministerio de Salud y Protección Social.
// En 6 a 11 meses no se evalúa: la leche materna aporta buena parte de la grasa del día.
const MAC = ['Proteínas','Grasas','Carbohidratos'];
const MAC_RANGO = [[10,20],[25,35],[50,65]];
const evaluaMac = gi => gi>=2;
function distMacRaw(t){ const e = 4*t[1] + 9*t[6] + 4*t[7]; if(!e) return null; return [4*t[1]/e*100, 9*t[6]/e*100, 4*t[7]/e*100]; }
function distMac(t){ const r = distMacRaw(t); return r ? r.map(v=>Math.round(v)) : null; }
const enRango = (p,i) => p>=MAC_RANGO[i][0] && p<=MAC_RANGO[i][1];
function keyCelda(k,cod){ return cod==null ? null : LET[k]+cod; }

function bloqueAporte(s, fechas, aten, cell, uno, IX, foF){
  const DD = (IX||[0,1,2,3,4]).map(i=>DIAS[i]);
  // por día y grupo (6-8..24-36): suma de media mañana + almuerzo (6-8 o 9-36) + fruta + media tarde
  const res = fechas.map((f,i)=> !aten[i] ? null : [0,1,2,3].map(gi=>{
    if(!s.u[gi]) return null;                                  // grupo sin usuarios: la herramienta muestra 0
    const ks = [[0],[gi===0?1:2],[4],[3]].map(([k])=>{ const c=cell[f+'|'+k]; return c?keyCelda(k,c[0]):null; });
    const t=[0,0,0,0,0,0,0,0]; let falta=false;
    ks.forEach(k=>{ if(!k) return; const a=aporteReceta(s.cui,k,gi); if(!a){falta=true;return;} a.forEach((v,j)=>t[j]+=v); });
    t.falta=falta; return t;
  }));
  // En celular el título de la sección va en su propia fila y la fila de edades es corta: solo ella queda fija al bajar.
  const secRow = tit => uno
    ? '<tr class="tit"><th colspan="'+(2+4*fechas.length)+'" class="tt">'+tit+'</th></tr><tr class="sec"><th colspan="2" class="ru ed">EDAD (MESES)</th>'+fechas.map(()=>sub).join('')+'</tr>'
    : '<tr class="sec"><th colspan="2" class="tt">'+tit+'</th>'+fechas.map(()=>sub).join('')+'</tr>';
  const sub = '<th class="g">6-8 m</th><th class="g">9-11 m</th><th class="g">12-23 m</th><th class="g">24-36 m</th>';
  const rowV = (lab,unit,j,dec) => '<tr><th class="rl">'+lab+'</th><th class="ru">'+unit+'</th>'+res.map(d=> d? d.map(t=>'<td>'+(t? (j===5? nf2.format(t[5]) : nfN[dec].format(t[j])) : '0')+'</td>').join('') : '<td class="sa" colspan="4">-</td>').join('')+'</tr>';
  const rowP = (lab,j) => { const req=k=>D.req[GRP[k]][j], meta=D.metaPNCM[j];
    return '<tr><th class="rl">'+lab+'</th><th class="ru">% del req.</th>'+res.map(d=> d? d.map((t,k)=>{ if(!t) return '<td></td>'; const p=pctNut(t,j,k); if(!p) return '<td></td>';
      if(!evalua(j,k)) return '<td class="'+(cumple(p,j)?'okc':'refc')+'" data-tip="'+esc(nf1.format(valorNut(t,j))+' de '+req(k)+' · referencial en este grupo de edad: se resalta si llega al '+nf0.format(meta*100)+' %, pero no cuenta como incumplimiento')+'">'+p+' %</td>';
      return '<td class="'+(cumple(p,j)?'okc':'noc')+'" data-tip="'+esc(nf1.format(valorNut(t,j))+' de '+req(k)+' · meta del Programa '+nf0.format(meta*100)+' %')+'">'+p+' %</td>'; }).join('') : '<td class="sa" colspan="4">-</td>').join('')+'</tr>'; };
  let h = '<tbody class="ap"><tr class="sp"><td colspan="'+(2+4*fechas.length)+'"></td></tr>'+
    secRow('APORTE NUTRICIONAL DEL MENÚ PROGRAMADO')+
    rowV('COSTO','S/',5,1)+rowV('CALORÍAS','Kcal',0,0)+rowV('PROTEÍNAS','g',1,1)+rowV('ZINC','mg',3,1)+rowV('HIERRO','mg',2,1)+rowV('CALCIO','mg',4,0)+rowV('GRASAS','g',6,1)+rowV('CARBOHIDRATOS','g',7,0)+
    secRow('PORCENTAJE DE LAS NECESIDADES NUTRICIONALES CUBIERTO')+
    rowP('CALORÍAS',0)+rowP('PROTEÍNAS',1)+rowP('ZINC',3)+rowP('HIERRO',2)+rowP('CALCIO',4)+
    secRow('DISTRIBUCIÓN DE LAS CALORÍAS POR MACRONUTRIENTE')+
    MAC.map((lab,i)=>'<tr><th class="rl">'+lab.toUpperCase()+'</th><th class="ru">% de kcal</th>'+res.map(d=> d? d.map((t,k)=>{ if(!t) return '<td></td>'; const ds=distMac(t); if(!ds) return '<td></td>'; const p=ds[i];
      if(!evaluaMac(k)) return '<td class="refc" data-tip="'+esc('Referencial en este grupo de edad · rango para 12 a 36 meses: '+MAC_RANGO[i][0]+' a '+MAC_RANGO[i][1]+' %')+'">'+p+' %</td>';
      return '<td class="'+(enRango(p,i)?'okc':'wrc')+'" data-tip="'+esc('Rango de referencia (RIEN Colombia, 1 a 3 años): '+MAC_RANGO[i][0]+' a '+MAC_RANGO[i][1]+' % de las calorías')+'">'+p+' %</td>'; }).join('') : '<td class="sa" colspan="4">-</td>').join('')+'</tr>').join('')+
    '</tbody>';
  return h;
}

// grupos de alimentos para ordenar la receta (de la columna GRUPO de COMP_ALIMENTOS de la herramienta, agrupados)
const GRUPO_ING = [
  ['Cereales y derivados', 'cer', ['CEREALES Y DERIVADOS','GRANOS','GALLETAS','ALIMENTO INFANTIL']],
  ['Raíces y tubérculos', 'rai', ['RAÍCES Y TUBÉRCULOS','TUBÉRCULOS (DERIVADOS)']],
  ['Leguminosas y derivados', 'leg', ['LEGUMINOSAS Y DERIVADOS']],
  ['Lácteos', 'lac', ['LÁCTEOS','PRODUCTOS LÁCTEOS']],
  ['Carnes, vísceras y huevo', 'car', ['PRODUCTOS DE ORIGEN ANIMAL PERECIBLES','PRODUCTOS DE ORIGEN ANIMAL NO PERECIBLES','OVOPRODUCTO']],
  ['Productos pesqueros', 'pes', ['PRODUCTOS PESQUEROS']],
  ['Verduras y hortalizas', 'ver', ['VERDURAS Y HORTALIZAS']],
  ['Frutas', 'fru', ['FRUTAS','FRUTAS (DERIVADOS)']],
  ['Aceites, grasas y oleaginosas', 'ace', ['ACEITE, GRASAS Y OLEAGINOSAS']],
  ['Productos azucarados', 'azu', ['PRODUCTOS AZUCARADOS']],
  ['Potenciadores del sabor', 'pot', ['POTENCIADORES DEL SABOR']],
  ['Agua y otros', 'otr', ['AGUA','OTROS']]
];
function grupoIng(i){
  const g = String((D.ing[i]||[])[9]||'OTROS').toUpperCase();
  const k = GRUPO_ING.findIndex(x=>x[2].includes(g));
  const x = GRUPO_ING[k<0 ? GRUPO_ING.length-1 : k];
  return {o: k<0 ? GRUPO_ING.length-1 : k, n: x[0], c: x[1]};
}
// tarjeta de receta
function tarjeta(cui, f, k){
  const s = byCui[cui]; const W = (D.menuW[cui]||[]).find(r=>r[0]===f && r[2]===k); if(!W) return;
  const cod = W[3], key = keyCelda(k,cod), rec = (D.recs[cui]||{})[key];
  const grs = GRUPOS_FILA[k].filter(gi=> gi===4 ? (k===2) : true);
  const P = D.precioIng[cui]||{};
  let h = '<div class="rc-head"><div><div class="eyebrow" style="color:var(--azul);opacity:1">'+TIEMPO_FILA[k]+' · '+DIAS[(pd(f).getDay()+6)%7].toLowerCase()+' '+ddmm(pd(f))+'</div>'+
    '<h3 id="rcT">'+esc(D.preps[W[4]])+'</h3><p class="note" style="margin:2px 0 0">Código '+(cod!=null?cod:'—')+' en LISTA_RECETAS · '+esc(s.sa)+'</p></div>'+
    '<button type="button" class="rc-x" id="rcX" aria-label="Cerrar">×</button></div>';
  if(!rec){ h += '<p>Esta preparación no figura en el recetario enviado por el servicio alimentario, así que no se puede mostrar su dosificación.</p>'; }
  else {
    const dia = evaluarAporte(s).malos.some(m=>m.f===f), gsR = gsDe(s,k), mk = {};
    const obsR = dia && gsR.length ? Dosif.revisar(LET[k], rec[0], filas6(rec[1]), gsR) : [];
    obsR.forEach(o=>{ if(o.t==='bajo') o.ids.forEach(i=>{ mk[i+'|'+o.g] = ['bajo', 'Por debajo del mínimo del Anexo N° 2: '+gramos(o.min)+(o.ids.length>1?' entre '+o.ids.length+' alimentos':'')+' ('+Dosif.NOMT[o.tabla]+')']; });
      else o.ids.forEach(i=>o.gs.forEach((g,x)=>{ if(!mk[i+'|'+g]) mk[i+'|'+g] = ['igual', 'Misma cantidad en todos los grupos; el Anexo N° 2 la diferencia (mínimo '+gramos(o.mins[x])+' en '+GRC[g]+')']; })); });
    const filas = rec[1].map((r,i)=>({r,i})).filter(o=>grs.some(gi=>o.r[1+gi]>0)).map(o=>({r:o.r, i:o.i, g:grupoIng(o.r[0])}))
      .sort((a,b)=> a.g.o-b.g.o || Math.max(...grs.map(gi=>b.r[1+gi]||0))-Math.max(...grs.map(gi=>a.r[1+gi]||0)));
    let gAnt = null;
    h += '<div class="scroll"><table class="rc rcg"><thead><tr><th>Alimento</th>'+grs.map(gi=>'<th class="n">'+GRC[gi]+'</th>').join('')+'<th class="n">S/ por kg</th></tr></thead><tbody>'+
      filas.map(({r,i,g})=>{ const m=D.ing[r[0]]; const cab = g.o!==gAnt ? '<tr class="gh"><td colspan="'+(grs.length+2)+'" style="--gc:var(--ga-'+g.c+')"><span class="gdot"></span>'+g.n+'</td></tr>' : ''; gAnt = g.o; return cab+'<tr class="gi" style="--gc:var(--ga-'+g.c+')"><td>'+esc(m[0])+(m[6]<1?' <span class="pc" data-tip="Parte comestible '+nf0.format(m[6]*100)+' %">'+nf0.format(m[6]*100)+' %</span>':'')+'</td>'+grs.map(gi=>{ const x=mk[i+'|'+gi]; return '<td class="n'+(x?' '+x[0]:'')+'"'+(x?' data-tip="'+esc(x[1])+'"':'')+'>'+(r[1+gi]?nf1.format(r[1+gi])+' g':'—')+'</td>'; }).join('')+'<td class="n">'+(P[r[0]]?((((D.equiv||{})[cui]||{})[r[0]])?'<span class="pc" data-tip="El servicio no cotizó este alimento; se usa el precio de '+esc(D.equiv[cui][r[0]])+'">precio de '+esc(D.equiv[cui][r[0]].toLowerCase())+'</span> ':'')+nf2.format(P[r[0]]):(/^AGUA/.test(m[0])?'—':'<span class="pc" data-tip="El servicio no cotizó un alimento con este nombre; la herramienta tampoco le asigna costo">sin cotización</span>'))+'</td></tr>'; }).join('')+
      '</tbody></table></div>';
    if (obsR.length) h += '<p class="rc-dz"><span class="chip mag">No cumple dosificaciones</span> Este día no alcanza la meta del Programa y la receta tiene '+
      [obsR.some(o=>o.t==='bajo')?'<span class="bajo">alimentos por debajo del mínimo</span>':'', obsR.some(o=>o.t!=='bajo')?'<span class="igual">alimentos con la misma cantidad en todos los grupos</span>':''].filter(Boolean).join(' y ')+
      ' del Anexo N° 2 (toque la cantidad para ver el mínimo). Las sugerencias de cambio están debajo del menú semanal.</p>';
    const ap = grs.map(gi=>aporteReceta(cui,key,gi));
    h += '<h4 class="rc-sub">Costo y aporte por ración</h4><div class="scroll"><table class="rc"><thead><tr><th></th>'+grs.map(gi=>'<th class="n">'+GRC[gi]+'</th>').join('')+'</tr></thead><tbody>'+
      '<tr><td>Costo</td>'+ap.map(a=>'<td class="n">S/ '+nf2.format(a[5])+'</td>').join('')+'</tr>'+
      NUTN.map(([n,u,dec],j)=>{ const jj=[0,1,2,3,4][j]; return '<tr><td>'+n+' ('+u+')</td>'+ap.map(a=>'<td class="n">'+nfN[dec].format(a[jj])+'</td>').join('')+'</tr>'; }).join('')+
      '<tr><td>Grasas (g)</td>'+ap.map(a=>'<td class="n">'+nfN[1].format(a[6])+'</td>').join('')+'</tr>'+
      '<tr><td>Carbohidratos (g)</td>'+ap.map(a=>'<td class="n">'+nfN[0].format(a[7])+'</td>').join('')+'</tr>'+
      '<tr><td>Calorías de proteínas · grasas · carbohidratos</td>'+ap.map(a=>{ const ds=distMac(a); return '<td class="n" style="white-space:nowrap">'+(ds? ds.join(' · ')+' %' : '—')+'</td>'; }).join('')+'</tr>'+
      '</tbody></table></div>';
    const n = grs.map(gi=> gi===4 ? s.acs : s.u[gi]);
    const tot = sum(grs.map((gi,i)=>ap[i][5]*n[i]));
    h += '<p class="rc-tot">Costo de la preparación en el día: <b>S/ '+nf2.format(tot)+'</b> para '+sum(n)+' raciones ('+grs.map((gi,i)=>n[i]+' de '+GRC[gi]).join(', ')+').</p>'+
      '<p class="note">Gramajes en peso bruto, tal como figuran en RECET_GEN. El aporte descuenta la parte no comestible con la tabla de composición de alimentos de la herramienta 8.4, y el precio es el promedio por kilo o litro de las cotizaciones del servicio alimentario. Los actores comunales solo se cuentan en el almuerzo.</p>';
  }
  const ov = $('#rcOv'); $('#rcBox').innerHTML = h; ov.hidden = false; document.body.style.overflow='hidden';
  $('#rcX').focus(); $('#rcX').onclick = cerrarTarjeta;
}
function cerrarTarjeta(){ $('#rcOv').hidden = true; document.body.style.overflow=''; if(window.__lastCell) window.__lastCell.focus(); }
$('#rcOv').addEventListener('click', e=>{ if(e.target.id==='rcOv') cerrarTarjeta(); });
on('keydown', e=>{ if(e.key==='Escape' && !$('#rcOv').hidden) cerrarTarjeta(); });
on('click', e=>{ const b=e.target.closest('[data-dzgo]'); if(!b) return; e.preventDefault(); e.stopPropagation(); const t=document.getElementById('dz-'+b.dataset.dzgo); if(t){ t.scrollIntoView({behavior:'smooth', block:'start'}); t.classList.add('dzfl'); setTimeout(()=>t.classList.remove('dzfl'), 1600); } });
$('#sheet').addEventListener('click', e=>{ const x=e.target.closest('[data-fox]'); if(x){ FOCO=null; hoja(); return; }
  const fb=e.target.closest('[data-fo]'); if(fb && FOCO){ window.__verMenu(FOCO.cui, +fb.dataset.fs, {f:fb.dataset.fo, mot:FOCO.mot, dias:FOCO.dias}); return; } });
$('#sheet').addEventListener('click', e=>{ const b=e.target.closest('[data-dia]'); if(!b) return; DIA=+b.dataset.dia; hoja(); const nb=$('#sheet [data-dia="'+DIA+'"]'); if(nb) nb.focus(); });
$('#sheet').addEventListener('click', e=>{ const c=e.target.closest('[data-rc]'); if(!c) return; window.__lastCell=c; const [f,k]=c.dataset.rc.split('|'); tarjeta(SA,f,+k); });
$('#sheet').addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target.matches('[data-rc]')){ e.preventDefault(); e.target.click(); } });


// -------- alertas de aporte nutricional (mismo cálculo que el bloque de la hoja MENU)
const NUTL = ['Energía','Proteínas','Hierro','Zinc','Calcio'];
const apCache = {};
function evaluarAporte(s){
  if (apCache[s.cui]) return apCache[s.cui];
  if (s.ap) return apCache[s.cui] = Armar.expandirAporte(s.ap);   // calculado al publicar, con las mismas reglas
  const rows = D.menuW[s.cui]||[]; const dias = {};
  rows.forEach(([f,sm,k,cod])=>{ (dias[f]=dias[f]||{s:sm,c:{}}).c[k]=cod; });
  const res = {dias:0, malos:[], porNut:[0,0,0,0,0], grupos:[0,0,0,0], mac:[0,1,2,3].map(()=>({n:0, suma:[0,0,0], fuera:[0,0,0], diasFuera:0, vals:[]})), cob:[0,1,2,3].map(()=>({n:0, suma:[0,0,0,0,0]})), cobDias:[[],[],[],[]]};
  Object.keys(dias).sort().forEach(f=>{
    const d = dias[f]; res.dias++; const falla = {nut:new Set(), gr:new Set()};
    [0,1,2,3].forEach(gi=>{
      if(!s.u[gi]) return;
      const keys = [0, gi===0?1:2, 4, 3].map(k=> d.c[k]!=null ? LET[k]+d.c[k] : null);
      const t=[0,0,0,0,0,0,0,0];
      keys.forEach(key=>{ if(!key) return; const a=aporteReceta(s.cui,key,gi); if(a) for(let j=0;j<8;j++) t[j]+=a[j]; });
      const ds = distMac(t);
      if (ds){ const M = res.mac[gi]; M.n++; M.vals.push({p:distMacRaw(t), f, s:d.s, cui:s.cui}); let fuera=false; ds.forEach((p,i)=>{ M.suma[i]+=p; if(evaluaMac(gi) && !enRango(p,i)){ M.fuera[i]++; fuera=true; } }); if(fuera) M.diasFuera++; }
      // orden de t: energía, proteínas, hierro, zinc, calcio (igual que D.req y D.metaPNCM)
      // cobertura del requerimiento: % sin redondear (las calorías del día sí se redondean a entero, como en la hoja MENU); solo días con aporte
      if (t[0] > 0){ const C = res.cob[gi]; C.n++; for(let j=0;j<5;j++) C.suma[j] += valorNut(t,j) / D.req[GRP[gi]][j] * 100;
        const pp = [0,1,2,3,4].map(j=>pctNut(t,j,gi)); res.cobDias[gi].push({f, s:d.s, bajo: pp.map((p,j)=> !!(evalua(j,gi) && p && !cumple(p,j)))}); }
      for(let j=0;j<5;j++){ const p = pctNut(t,j,gi); if (evalua(j,gi) && p && !cumple(p,j)) { falla.nut.add(j); falla.gr.add(gi); } }
    });
    if (falla.nut.size){ res.malos.push({f, s:d.s, nut:[...falla.nut], gr:[...falla.gr]}); falla.nut.forEach(j=>res.porNut[j]++); falla.gr.forEach(g=>res.grupos[g]++); }
  });
  return apCache[s.cui] = res;
}
// ================= DOSIFICACIÓN DE LAS RECETAS (ANEXO N° 2) =================
// Se revisa solo en los días que no alcanzan la meta del Programa: una receta "no cumple dosificaciones" si algún alimento que define
// el aporte (lácteos, carnes, vísceras, pescado, huevo, leguminosas, tubérculos, cereales y harinas, aceites, frutas, alimento infantil)
// está por debajo del mínimo del Anexo N° 2 para un grupo de edad, o lleva la misma cantidad en todos los grupos cuando el anexo la diferencia.
// Dosificación según el Anexo N° 2 del Procedimiento "Atención alimentaria y nutricional" v3 (RDE 000100-2026-MIDIS/PNCM-DE)
// Mínimos por grupo etario [6-8, 9-11, 12-23, 24-36] para los alimentos que definen el aporte.
const Dosif = (function(){
  const sinT = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
  const T = {
    lacEvR:[50,50,60,60], lacUhtR:[100,100,120,120], lacEvA:[10,10,20,20], lacUhtA:[20,20,40,40], quesoA:[5,5,7,7],
    animSolo:[50,50,50,50], animComb:[30,30,30,30], sbComb:[20,20,20,20], animMaz:[10,10,10,10],
    huevoMain:[0,60,60,60], huevoLig:[0,6,6,6], yema:[20,20,0,0], ovo:[10,10,10,15],
    legA:[20,20,25,35], tubA:[30,30,30,50], tubPure:[50,50,80,80], papaSeca:[0,30,35,40],
    arroz:[0,35,50,60], arrozPpal:[0,40,70,80], fideo:[25,25,45,45], fideoPpal:[0,35,60,65], granoA:[10,20,30,30], espA:[4,4,5,5],
    aceite68:[7,0,0,0], aceiteA:[0,11,15,17],
    harina1:[14,16,22,24], harina1e:[10,12,17,19], harina2:[7,8,11,12], esp:[4,4,5,5], enteroMaz:[15,24,30,36],
    frutaF:[40,50,80,100], alimInf:[50,50,50,50]
  };
  const NOMT = {lacEvR:'Lácteos · mazamorras (leche evaporada)', lacUhtR:'Lácteos · mazamorras (leche UHT)', lacEvA:'Lácteos · otros (leche evaporada en chupes, cremas u otros)', lacUhtA:'Lácteos · otros (leche UHT en chupes, cremas u otros)', quesoA:'Lácteos · queso madurado',
    animSolo:'Productos de origen animal · segundos', animComb:'Productos de origen animal · carnes y vísceras para combinar', sbComb:'Productos de origen animal · sangrecita y bazo para combinar', animMaz:'Productos de origen animal · mazamorras (vísceras)',
    huevoMain:'Huevo · segundos (entero)', huevoLig:'Huevo · ligante', yema:'Huevo · papillas (yema)', ovo:'Ovoproducto', legA:'Leguminosas · segundos (guisos, papillas)', tubA:'Raíces y tubérculos · guarnición', tubPure:'Raíces y tubérculos · purés, papillas o guisos', papaSeca:'Raíces y tubérculos · guisos (papa seca)',
    arroz:'Cereales · arroz como guarnición', arrozPpal:'Cereales · arroz chaufa, jardinera o verde', fideo:'Cereales · fideos como guarnición', fideoPpal:'Cereales · fideos como plato principal', granoA:'Cereales · quinua y trigo (guarnición, papilla)', espA:'Cereales · harina para apanar o ligar',
    aceite68:'Aceites · papillas o puré', aceiteA:'Aceites · arroz con guisos, purés o leguminosas',
    harina1:'Mazamorras · harina u hojuela (sin espesante)', harina1e:'Mazamorras · harina u hojuela (con espesante)', harina2:'Mazamorras · con 2 harinas u hojuelas (cada una)', esp:'Mazamorras · harina como espesante', enteroMaz:'Mazamorras o batidos · fruta o tubérculo',
    frutaF:'Frutas · como complemento', alimInf:'Alimento infantil'};
  // categoría de un alimento: nombre y grupo de COMP_ALIMENTOS
  function cat(nom, grupo){
    const n = sinT(nom), g = sinT(grupo);
    if (/LECHE EVAPORADA/.test(n)) return 'lacEv';
    if (/LECHE/.test(n) && /LACTEO/.test(g)) return 'lacUht';
    if (/QUESO/.test(n)) return 'queso';
    if (/MANTEQUILLA|^ACEITE/.test(n)) return 'aceite';
    if (/YEMA/.test(n)) return 'yema';
    if (/HUEVO/.test(n) && !/MEZCLA|POLVO/.test(n)) return 'huevo';
    if (/OVOPRODUCTO/.test(g) || /MEZCLA EN POLVO/.test(n)) return 'ovo';
    if (/SANGRECITA|SANGRE|BAZO/.test(n)) return 'sb';
    if (/ORIGEN ANIMAL|PESQUERO/.test(g)) return 'anim';
    if (/ALIMENTO INFANTIL/.test(g)) return 'alimInf';
    if (/ALMIDON|MAICENA|FECULA|CHUNO/.test(n)) return 'esp';
    if (/HARINA|HOJUELA/.test(n)) return 'harina';
    if (/PAPA SECA/.test(n)) return 'papaSeca';
    if (/LEGUMINOSA/.test(g)) return 'leg';
    if (/RAICES Y TUBERCULOS/.test(g) && !/BETARRAGA|BETERRAGA/.test(n)) return 'tub';
    if (/^ARROZ/.test(n)) return 'arroz';
    if (/FIDEO/.test(n)) return 'fideo';
    if (/CEREAL/.test(g)) return 'grano';          // quinua, trigo, sémola, cebada, kiwicha, maíz
    if (/^FRUTAS$/.test(g.trim()) && !/LIMON/.test(n)) return 'fruta';
    return null;                                    // verduras, condimentos, sal, azúcar, agua, etc.: no se evalúan
  }
  /** Mínimos de cada fila de una receta. k: 'R' refrigerio, 'A' almuerzo, 'F' fruta. rows: [[nombre, grupo, g68, g911, g1223, g2436], ...]
      Devuelve [{i, cat, tabla, min:[4], suma:[i,...] (si se evalúa la suma de varias filas)}] */
  function minimos(k, nombreRec, rows){
    const nr = sinT(nombreRec), C = rows.map(r=>cat(r[0], r[1]));
    const res = [];
    const idx = c => C.map((x,i)=>x===c?i:-1).filter(i=>i>=0);
    const pon = (ids, tabla, suma) => { if (!ids.length) return; if (suma) res.push({ids, tabla, suma:true}); else ids.forEach(i=>res.push({ids:[i], tabla})); };
    if (k==='F'){ pon(idx('fruta'), 'frutaF', true); return res; }
    if (k==='R'){
      pon(idx('lacEv'), 'lacEvR'); pon(idx('lacUht'), 'lacUhtR');
      const main = C.map((c,i)=>(c==='harina'||c==='grano'||c==='arroz'||(c==='leg'))?i:-1).filter(i=>i>=0), esp = idx('esp');
      pon(main, main.length>=2 ? 'harina2' : (esp.length ? 'harina1e' : 'harina1'));
      pon(esp, 'esp');
      pon(idx('fruta').concat(idx('tub')), 'enteroMaz', true);
      pon(idx('anim').concat(idx('sb')), 'animMaz');
      pon(idx('huevo'), 'huevoLig'); pon(idx('yema'), 'huevoLig'); pon(idx('ovo'), 'ovo'); pon(idx('alimInf'), 'alimInf');
      return res;
    }
    // almuerzo
    pon(idx('lacEv'), 'lacEvA'); pon(idx('lacUht'), 'lacUhtA'); pon(idx('queso'), 'quesoA');
    const an = idx('anim'), sb = idx('sb'), comb = an.length + sb.length >= 2;
    pon(an, comb ? 'animComb' : 'animSolo'); pon(sb, comb ? 'sbComb' : 'animSolo');
    pon(idx('huevo'), (an.length+sb.length) ? 'huevoLig' : 'huevoMain'); pon(idx('yema'), 'yema'); pon(idx('ovo'), 'ovo');
    pon(idx('leg'), 'legA', true); pon(idx('tub'), /PURE|PAPILLA/.test(nr) ? 'tubPure' : 'tubA', true); pon(idx('papaSeca'), 'papaSeca');
    pon(idx('arroz'), /CHAUFA|JARDINERA|ARROZ VERDE/.test(nr) ? 'arrozPpal' : 'arroz', true);
    pon(idx('fideo'), /PLATO PRINCIPAL/.test(nr) ? 'fideoPpal' : 'fideo', true);
    pon(idx('grano'), 'granoA', true); pon(idx('harina').concat(idx('esp')), 'espA');
    pon(idx('aceite'), 'aceiteA', true);   // 6-8: se usa aceite68 (abajo)
    pon(idx('alimInf'), 'alimInf');
    return res;
  }
  const tablaG = (tabla, g) => (tabla==='aceiteA' && g===0) ? T.aceite68[0] : T[tabla][g];
  /** Revisa una receta para los grupos que la reciben (gs: índices 0..3). Devuelve observaciones. */
  function revisar(k, nombreRec, rows, gs){
    const obs = [];
    minimos(k, nombreRec, rows).forEach(m=>{
      gs.forEach(g=>{
        const min = tablaG(m.tabla, g); if (!min) return;
        const v = m.ids.reduce((t,i)=>t+(+rows[i][2+g]||0),0);
        if (v>0 && v < min - 1e-9) obs.push({t:'bajo', ids:m.ids, g, v, min, tabla:m.tabla});
      });
      // misma dosificación para todos los grupos que la reciben, cuando el Anexo N° 2 la diferencia
      const gv = gs.filter(g=>tablaG(m.tabla,g)>0);      // solo los grupos para los que el Anexo N° 2 fija una dosificación
      if (!m.suma && gv.length>=2){
        const mins = gv.map(g=>tablaG(m.tabla,g));
        if (new Set(mins).size>1) m.ids.forEach(i=>{ const vs = gv.map(g=>+rows[i][2+g]||0); if (vs.every(x=>x>0 && x===vs[0])) obs.push({t:'igual', ids:[i], gs:gv, v:vs[0], mins, tabla:m.tabla}); });
      }
    });
    return obs;
  }
  const LET = {0:'R',1:'A',2:'A',3:'R',4:'F'}, GS = {0:[0,1,2,3],1:[0],2:[1,2,3],3:[0,1,2,3],4:[0,1,2,3]};
  /** Observaciones de un día. recs: {clave: [nombre, filas [ing, g68, g911, g1223, g2436, gAC]]}, ing: [[nombre, …, grupo (9)]],
      dia: {k: cod}, u: usuarios por grupo. Devuelve [[k, clave, alimentos, 'b'|'i', g | [gs], valor, mín | [mins], tabla]]. */
  function revisarDia(recs, ing, dia, u){
    const out = [];
    [0,1,2,3,4].forEach(k=>{
      if (dia[k]==null) return; const key = LET[k]+dia[k], rec = recs[key]; if (!rec) return;
      const gs = GS[k].filter(g=>u[g]>0); if (!gs.length) return;
      const rows = rec[1].map(r=>[(ing[r[0]]||[])[0], (ing[r[0]]||[])[9], r[1], r[2], r[3], r[4]]);
      revisar(LET[k], rec[0], rows, gs).forEach(o=>out.push([k, key, o.ids.map(i=>rows[i][0]).join(' + '), o.t==='bajo'?'b':'i', o.t==='bajo'?o.g:o.gs, o.v, o.t==='bajo'?o.min:o.mins, o.tabla]));
    });
    return out;
  }
  return { T, NOMT, cat, minimos, revisar, revisarDia, LET, GS };
})();

const MOT_DZ = 'No cumple dosificaciones (Anexo N° 2)';
const dzCache = {};
function celdasDe(cui){ const c = {}; (D.menuW[cui]||[]).forEach(([f,sm,k,cod])=>{ (c[f]=c[f]||{})[k]=cod; }); return c; }
// {fecha: [[k, clave, alimentos, 'b' (bajo el mínimo) | 'i' (igual en todos los grupos), grupo | [grupos], gramos, mínimo | [mínimos], tabla]]}
function dzDe(s){
  if (dzCache[s.cui]) return dzCache[s.cui];
  if (s.dz) return dzCache[s.cui] = s.dz;                       // calculado al publicar, con las mismas reglas
  if (!D.recs[s.cui] || !D.menuW[s.cui]) return {};
  const cel = celdasDe(s.cui), out = {};
  evaluarAporte(s).malos.forEach(m=>{ const o = Dosif.revisarDia(D.recs[s.cui], D.ing, cel[m.f]||{}, s.u); if (o.length) out[m.f] = o; });
  return dzCache[s.cui] = out;
}
const diasDz = s => { const z = dzDe(s); return evaluarAporte(s).malos.filter(m=>z[m.f]); };
const chipDz = (s, dd) => lnkDias(s, dd, MOT_DZ, '<span class="chip mag">No cumple dosificaciones'+(dd.length>1?' · '+dd.length+' días':'')+'</span>', 'chipl');
const gramos = v => nf1.format(v).replace(/,0$/,'').replace(/\.0$/,'')+' g';
const filas6 = rows => rows.map(r=>[(D.ing[r[0]]||[])[0], (D.ing[r[0]]||[])[9], r[1], r[2], r[3], r[4]]);
const gsDe = (s,k) => Dosif.GS[k].filter(g=>s.u[g]>0);
// costo del día (usuarios de cada grupo y AC en el almuerzo) y nutrientes bajo la meta, para un juego de recetas {k: filas}
function evalDiaDz(s, R){
  const P = D.precioIng[s.cui]||{};
  const ap = (rows, gi) => { const t=[0,0,0,0,0,0]; rows.forEach(row=>{ const g=row[1+gi]||0, m=D.ing[row[0]]; for(let j=0;j<5;j++) t[j]+=m[1+j]/100*g*m[6]; t[5]+=(P[row[0]]||0)/1000*g; }); return t; };
  let cost = 0; const malos = [];
  [0,1,2,3].forEach(gi=>{ if(!s.u[gi]) return; const t=[0,0,0,0,0,0];
    [0, gi===0?1:2, 4, 3].forEach(k=>{ if(R[k]) ap(R[k],gi).forEach((v,j)=>t[j]+=v); });
    cost += t[5]*s.u[gi];
    for(let j=0;j<5;j++){ const p = pctNut(t,j,gi); if(evalua(j,gi) && p && !cumple(p,j)) malos.push([j,gi]); } });
  if (R[2] && s.acs) cost += ap(R[2],4)[5]*s.acs;
  return {cost, malos};
}
// sube al mínimo del anexo los alimentos que están por debajo (si son varios que se suman, en la misma proporción)
function alMinimo(s, k, rec){
  const rows = rec[1].map(r=>r.slice()); let n = 0;
  Dosif.revisar(LET[k], rec[0], filas6(rec[1]), gsDe(s,k)).forEach(o=>{ if(o.t!=='bajo') return; const f = o.min/o.v;
    o.ids.forEach(i=>{ rows[i][1+o.g] = Math.ceil(rec[1][i][1+o.g]*f*10-1e-6)/10; }); n++; });
  return n ? rows : null;
}
const malosTxt = M => { const p = {}; M.forEach(([j,g])=>(p[j]=p[j]||[]).push(g)); return Object.keys(p).map(j=>NUTL[j]+' ('+p[j].map(g=>GRC[g]).join(', ')+')').join(', '); };
// sugerencias para un día bajo la meta: ajustar al mínimo y cambiar una preparación por otra del recetario del servicio
function sugerenciasDz(s, f, obs){
  const recs = D.recs[s.cui]||{}, cel = celdasDe(s.cui)[f]||{}, base = {}, corr = {}, ajustados = new Set();
  [0,1,2,3,4].forEach(k=>{ if(cel[k]==null) return; const rec = recs[LET[k]+cel[k]]; if(!rec) return; base[k] = rec[1];
    const c = gsDe(s,k).length ? alMinimo(s, k, rec) : null; corr[k] = c || rec[1]; if (c) ajustados.add(k); });
  // ¿alguna receta del día diferencia la dosificación entre al menos 2 grupos de edad?
  const difer = Object.keys(base).some(k=>{ const gs = gsDe(s,+k); return gs.length>=2 && base[k].some(r=>new Set(gs.map(g=>r[1+g]||0)).size>1); });
  const c0 = evalDiaDz(s, base), saldo = s.presT - s.costT, tope = Math.max(0, saldo);
  const out = {difer, saldo, ajustados};
  if (!difer) return out;
  if (ajustados.size){ const c1 = evalDiaDz(s, corr); out.ajuste = {dc: c1.cost-c0.cost, malos: c1.malos}; }
  const W = D.menuW[s.cui]||[], sem = (W.find(r=>r[0]===f)||[])[1], usadas = {};
  W.forEach(([ff,sm,k,cod])=>{ if(sm===sem && cod!=null) (usadas[k]=usadas[k]||new Set()).add(LET[k]+cod); });
  const conObs = new Set(obs.map(o=>o[0])), P = D.precioIng[s.cui]||{}, cands = [];
  Object.keys(base).forEach(k0=>{ const k = +k0, gs = gsDe(s,k); if(!gs.length) return;
    Object.keys(recs).forEach(key=>{
      if (key[0]!==LET[k] || (usadas[k] && usadas[k].has(key))) return;          // otra receta, no programada ya esa semana en el mismo tiempo
      const rec = recs[key], rows = rec[1];
      if (!gs.every(g=>rows.some(r=>r[1+g]>0))) return;                        // con dosificación para los grupos que la reciben
      if (rows.some(r=>gs.some(g=>r[1+g]>0) && !P[r[0]] && !/^AGUA/.test((D.ing[r[0]]||[''])[0]))) return;   // todos sus alimentos cotizados
      const ob = Dosif.revisar(LET[k], rec[0], filas6(rows), gs);
      if (ob.some(o=>o.t!=='bajo')) return;                                     // que diferencie la dosificación como el Anexo N° 2
      const rowsC = ob.length ? alMinimo(s, k, rec) : rows;                      // y, si algo está bajo el mínimo, ajustada al mínimo
      const c = evalDiaDz(s, Object.assign({}, corr, {[k]: rowsC}));
      if (c.malos.length) return;
      const dc = c.cost - c0.cost; if (dc > tope + 1e-9) return;               // dentro del presupuesto calculado del servicio
      cands.push({k, key, nom: rec[0], dc, obs: conObs.has(k)?1:0, aj: ob.length>0});
    }); });
  cands.sort((a,b)=> b.obs-a.obs || a.dc-b.dc);
  const sel = [], vistos = new Set();
  cands.forEach(c=>{ if(sel.length<3 && !vistos.has(c.k)){ sel.push(c); vistos.add(c.k); } });
  cands.forEach(c=>{ if(sel.length<3 && !sel.includes(c)) sel.push(c); });
  out.cambios = sel;
  return out;
}
const dS = v => (v>=0.005?'+':v<=-0.005?'−':'')+S2(Math.abs(v));
function panelDz(s, fechasV){
  const z = dzDe(s), malos = evaluarAporte(s).malos, recs = D.recs[s.cui]||{}, cel = celdasDe(s.cui);
  const dias = fechasV.filter(f=>z[f]); if (!dias.length) return '';
  const tiempo = k => ({0:'Media mañana',1:'Almuerzo (6 a 8 meses)',2:'Almuerzo (9 a 36 meses)',3:'Media tarde',4:'Fruta'})[k];
  const nomRec = (k,key) => { const r = recs[key]; return r ? r[0] : key; };
  const uso = s.presT ? nf0.format(s.costT/s.presT*100)+' %' : '—';
  let h = '<div class="dzbox" role="region" aria-label="Dosificación de las recetas"><h3>No cumple dosificaciones</h3>'+
    '<p class="note" style="margin:0 0 4px">Días de esta semana que no alcanzan la meta del Programa y tienen recetas con dosificaciones que no corresponden al Anexo N° 2 (tabla de dosificación de alimentos para la preparación de raciones) del procedimiento de atención alimentaria. Se revisan lácteos, carnes, vísceras, pescado, huevo, leguminosas, tubérculos, cereales y harinas, aceites, frutas y alimento infantil.</p>';
  dias.forEach(f=>{
    const m = malos.find(x=>x.f===f), obs = z[f], dd = DIAS[(pd(f).getDay()+6)%7];
    h += '<div class="dzdia" id="dz-'+f+'"><h4>'+dd.charAt(0)+dd.slice(1).toLowerCase()+' '+ddmm(pd(f))+' · no alcanza la meta en '+(m?m.nut.map(j=>NUTL[j].toLowerCase()).join(', ')+' ('+m.gr.map(g=>GRC[g]).join(', ')+')':'algún nutriente')+'</h4>';
    const porR = {}; obs.forEach(o=>{ const k = o[0]+'|'+o[1]; (porR[k]=porR[k]||[]).push(o); });
    h += '<ul>'+Object.keys(porR).map(kk=>{ const L = porR[kk], k = L[0][0], key = L[0][1];
      const por = {}; L.forEach(o=>{ const q = o[3]+'|'+o[2]+'|'+o[7]; (por[q]=por[q]||[]).push(o); });
      return '<li><b>'+tiempo(k)+'</b> · '+esc(nomRec(k,key))+' <span class="tb">(código '+esc(key.slice(1))+')</span><ul>'+Object.values(por).map(G=>{ const o = G[0];
        if (o[3]==='b') return '<li>'+esc(o[2])+': '+G.map(x=>gramos(x[5])+' en '+GRC[x[4]]+' (mínimo '+gramos(x[6])+')').join(', ')+' <span class="tb">· '+esc(Dosif.NOMT[o[7]])+'</span></li>';
        return '<li>'+esc(o[2])+': '+gramos(o[5])+' en todos los grupos ('+o[4].map(g=>GRC[g]).join(', ')+'); el Anexo N° 2 la diferencia: mínimo '+o[6].map(gramos).join(' · ')+' <span class="tb">· '+esc(Dosif.NOMT[o[7]])+'</span></li>'; }).join('')+'</ul></li>'; }).join('')+'</ul>';
    const sg = sugerenciasDz(s, f, obs);
    if (!sg.difer){ h += '<p class="note">No se proponen cambios: las recetas de este día usan la misma dosificación para todos los grupos de edad.</p></div>'; return; }
    h += '<div class="dzsug"><b class="t">Sugerencias</b> <span class="tb">para que el día alcance la meta sin pasar del presupuesto calculado del servicio (uso '+uso+(sg.saldo>=0?', saldo '+S2(sg.saldo):', '+S2(-sg.saldo)+' por encima; solo se proponen cambios que bajan el costo')+')</span><ul>';
    if (sg.ajuste){ const a = sg.ajuste, ok = !a.malos.length;
      h += '<li><b>Ajustar al mínimo del Anexo N° 2</b> los alimentos señalados por debajo del mínimo: '+(ok ? 'con eso el día alcanza la meta' : 'con eso el día aún no alcanza la meta en '+malosTxt(a.malos).toLowerCase())+'; costo del día (todas las raciones) '+dS(a.dc)+(ok && a.dc > Math.max(0,sg.saldo)+1e-9 ? ', más que el saldo del presupuesto' : '')+'.</li>'; }
    if (sg.cambios.length) sg.cambios.forEach(c=>{
      h += '<li><b>Cambiar '+tiempo(c.k).toLowerCase()+'</b> «'+esc(nomRec(c.k, LET[c.k]+cel[f][c.k]))+'» por «'+esc(c.nom)+'» <span class="tb">(código '+esc(c.key.slice(1))+' del recetario del servicio)</span>'+(()=>{ const ot = [...sg.ajustados].some(k=>k!==c.k);
          return c.aj&&ot ? ', ajustando al mínimo del Anexo N° 2 sus dosificaciones y las de las demás preparaciones' : c.aj ? ', ajustando sus dosificaciones al mínimo del Anexo N° 2' : ot ? ', con las demás preparaciones ajustadas al mínimo del Anexo N° 2' : ''; })()+
        ': el día alcanza la meta en todos los nutrientes y grupos de edad; costo del día (todas las raciones) '+dS(c.dc)+'.</li>'; });
    else h += '<li>No se encontró en el recetario del servicio una preparación que, cambiando una sola del día, alcance la meta dentro del presupuesto.</li>';
    h += '</ul><p class="tb" style="margin:2px 0 0">Las preparaciones propuestas diferencian la dosificación por grupo de edad como el Anexo N° 2, tienen todos sus alimentos cotizados y no están programadas en esa semana en el mismo tiempo de comida.'+(obs.some(o=>o[3]==='i')?' Aunque el día alcance la meta, las recetas con la misma cantidad en todos los grupos de edad deben diferenciarse según el Anexo N° 2.':'')+'</p></div></div>';
  });
  return h + '</div>';
}
// -------- lista de servicios y fechas detrás de un conteo de días (se abre en la ventana; cada servicio lleva a su menú)
let LISTAS = {}, nLista = 0;
function lnkLista(tit, items, txt, cls){
  items = items.filter(o=>o.dias.length);
  if (!items.length) return txt;
  if (items.length===1) return lnkDias(items[0].s, items[0].dias, tit, txt, cls||'cnt');   // un solo servicio: directo a su menú
  const k = 'l'+(++nLista); LISTAS[k] = {tit, items};
  const nd = sum(items.map(o=>o.dias.length));
  return '<a href="#" class="verlista'+(cls?' '+cls:'')+'" data-l="'+k+'" data-tip="'+esc(tit+': '+nd+(nd===1?' día':' días')+' en '+items.length+' servicios · toque para ver cuáles')+'">'+txt+'</a>';
}
function abrirLista(k, desde){
  const L = LISTAS[k]; if (!L) return;
  const it = L.items.slice().sort((a,b)=>b.dias.length-a.dias.length || a.s.sa.localeCompare(b.s.sa,'es'));
  const nd = sum(it.map(o=>o.dias.length)), conUT = UT==='TODAS';
  const fechas = o => o.dias.slice().sort((a,b)=>a.f<b.f?-1:1).map(d=>ddmm(pd(d.f))).join(', ');
  const h = '<div class="rc-head"><div><div class="eyebrow" style="color:var(--azul);opacity:1">'+nd+(nd===1?' día':' días')+' en '+it.length+' servicios alimentarios</div>'+
    '<h3 id="rcT">'+esc(L.tit)+'</h3><p class="note" style="margin:2px 0 0">Toque las fechas de un servicio para ver su menú con esos días señalados.</p></div>'+
    '<button type="button" class="rc-x" id="rcX" aria-label="Cerrar">×</button></div>'+
    '<div class="scroll"><table class="lst"><thead><tr><th>Servicio alimentario</th>'+(conUT?'<th>UT/OCT</th>':'')+'<th class="n">Días</th><th>Fechas</th></tr></thead><tbody>'+
    it.map(o=>'<tr><td>'+esc(o.s.sa)+'</td>'+(conUT?'<td>'+esc(o.s.ut)+'</td>':'')+'<td class="n">'+o.dias.length+'</td><td>'+lnkDias(o.s,o.dias,L.tit,fechas(o),'fl')+'</td></tr>').join('')+'</tbody></table></div>';
  window.__lastCell = desde || null;
  $('#rcBox').innerHTML = h; $('#rcOv').hidden = false; document.body.style.overflow='hidden';
  $('#rcX').focus(); $('#rcX').onclick = cerrarTarjeta;
}
on('click', e=>{ const a=e.target.closest('a.verlista'); if(!a) return; e.preventDefault(); abrirLista(a.dataset.l, a); });

// -------- cobertura del requerimiento por grupo de edad (Directiva Prestación del SCD v5, num. 7.3, Cuadros N° 05 y 06)
function resumenCob(){
  const L = sel();
  const G = [0,1,2,3].map(gi=>{ const o={gi, n:0, suma:[0,0,0,0,0], sa:0, saBajo:0, porS:[]};
    L.forEach(s=>{ const r=evaluarAporte(s), C=r.cob[gi]; if(!C.n) return; o.n+=C.n; o.sa++; for(let j=0;j<5;j++) o.suma[j]+=C.suma[j];
      const dd=r.cobDias[gi]; o.porS.push({s, dd}); if(dd.some(x=>x.bajo.some(Boolean))) o.saBajo++; });
    return o; });
  const meta = j => Math.round(D.metaPNCM[j]*100);
  const items = (o, test) => o.porS.map(({s,dd})=>({s, dias: dd.filter(test).map(x=>({f:x.f, s:x.s}))}));
  $('#tCob').innerHTML = '<thead><tr><th>Grupo de edad</th><th class="n">Días evaluados</th>'+NUT_TARJ.map((n,j)=>'<th class="n">'+n+'<br><span style="font-weight:500;text-transform:none">mínimo '+meta(j)+' %</span></th>').join('')+
    '<th class="n">Días bajo la meta</th><th class="n">Servicios con días bajo la meta</th></tr></thead><tbody>'+
    G.map(o=>{ if(!o.n) return ''; const gi=o.gi;
      const cel = [0,1,2,3,4].map(j=>{ const p=Math.round(o.suma[j]/o.n);
        if(!evalua(j,gi)) return '<td class="n">'+p+' %<br><span class="note" style="font-size:12px">referencial</span></td>';
        const it = items(o, x=>x.bajo[j]), nb = sum(it.map(i=>i.dias.length));
        return '<td class="n">'+p+' %'+(nb?'<br><span class="wl">'+lnkLista(NUT_TARJ[j]+' bajo la meta ('+meta(j)+' %) · '+GRP[gi], it, nb+(nb===1?' día bajo':' días bajo'))+'</span>':'')+'</td>'; }).join('');
      const itA = items(o, x=>x.bajo.some(Boolean)), na = sum(itA.map(i=>i.dias.length)), tit = 'Días bajo la meta de la Directiva · '+GRP[gi];
      return '<tr><td>'+GRP[gi]+'</td><td class="n">'+nf0.format(o.n)+'</td>'+cel+
        '<td class="n">'+(na? lnkLista(tit, itA, nf0.format(na))+' ('+nf0.format(na/o.n*100)+' %)' : '—')+'</td>'+
        '<td class="n">'+(o.saBajo? lnkLista(tit, itA, o.saBajo+' de '+o.sa) : '0 de '+o.sa)+'</td></tr>'; }).join('')+'</tbody>';
}
function resumenMacro(){
  const L = sel(); const G = [0,1,2,3].map(()=>({n:0, suma:[0,0,0], fuera:[0,0,0], diasFuera:0, sa:0, saFuera:0}));
  // servicios y días de un grupo que cumplen una condición (para abrir la lista desde los conteos)
  const itMac = (gi, test) => L.map(s=>({s, dias: evaluarAporte(s).mac[gi].vals.filter(test).map(v=>({f:v.f, s:v.s}))}));
  L.forEach(s=>{ const r=evaluarAporte(s); r.mac.forEach((M,gi)=>{ if(!M.n) return; const o=G[gi]; o.n+=M.n; o.sa++; if(M.diasFuera) o.saFuera++; o.diasFuera+=M.diasFuera; for(let i=0;i<3;i++){ o.suma[i]+=M.suma[i]; o.fuera[i]+=M.fuera[i]; } }); });
  $('#tMac').innerHTML = '<thead><tr><th>Grupo de edad</th><th class="n">Días evaluados</th>'+MAC.map((m,i)=>'<th class="n">'+m+'<br><span style="font-weight:500;text-transform:none">rango '+MAC_RANGO[i][0]+' a '+MAC_RANGO[i][1]+' %</span></th>').join('')+'<th class="n">Días fuera de rango</th><th class="n">Servicios con días fuera de rango</th></tr></thead><tbody>'+
    G.map((o,gi)=>{ if(!o.n) return ''; const ev=evaluaMac(gi);
      return '<tr><td>'+GRP[gi]+(ev?'':' <span class="chip blue" data-tip="La leche materna aporta buena parte de la grasa del día; el rango de referencia es para 1 a 3 años">referencial</span>')+'</td><td class="n">'+nf0.format(o.n)+'</td>'+
        o.suma.map((v,i)=>{ const p=Math.round(v/o.n); return '<td class="n">'+p+' %'+(ev&&o.fuera[i]?'<br><span class="wl">'+lnkLista(MAC[i]+' fuera del rango ('+MAC_RANGO[i][0]+' a '+MAC_RANGO[i][1]+' % de las calorías) · '+GRP[gi], itMac(gi,v=>!enRango(Math.round(v.p[i]),i)), o.fuera[i]+(o.fuera[i]===1?' día fuera':' días fuera'))+'</span>':'')+'</td>'; }).join('')+
        (()=>{ if(!ev) return '<td class="n">—</td><td class="n">—</td>'; const it=itMac(gi,v=>[0,1,2].some(i=>!enRango(Math.round(v.p[i]),i))), tit='Días con algún macronutriente fuera del rango de referencia · '+GRP[gi];
          return '<td class="n">'+(o.diasFuera? lnkLista(tit,it,nf0.format(o.diasFuera))+' ('+nf0.format(o.diasFuera/o.n*100)+' %)' : '—')+'</td><td class="n">'+(o.saFuera? lnkLista(tit,it,o.saFuera+' de '+o.sa) : '0 de '+o.sa)+'</td></tr>'; })(); }).join('')+'</tbody>';
}
// -------- gráfico: distribución del % de calorías de un macronutriente (caja y puntos por grupo de edad)
let macSel = 0;
const cuantil = (a,q) => { const pos=(a.length-1)*q, b=Math.floor(pos), r=pos-b; return a[b+1]!==undefined ? a[b]+r*(a[b+1]-a[b]) : a[b]; };
let macVista = 'edad';   // 'edad': una fila por grupo de edad · 'ut': una fila por UT/OCT (o por servicio si hay una UT filtrada), 12 a 36 meses
function graficoMacro(){
  const el = $('#cMacG'); if(!el) return;
  const tot = UT==='TODAS', porUT = macVista==='ut';
  $('#segMac').innerHTML = MAC.map((m,i)=>'<button type="button" data-mac="'+i+'" aria-pressed="'+(i===macSel)+'">'+m+'</button>').join('');
  $('#segMacV').innerHTML = [['edad','Por grupo de edad'],['ut', tot ? 'Por UT/OCT' : 'Por servicio']].map(([k,t])=>'<button type="button" data-vista="'+k+'" aria-pressed="'+(k===macVista)+'">'+t+'</button>').join('');
  $('#hMacG').textContent = 'Porcentaje de las calorías que viene de '+MAC[macSel].toLowerCase()+', por día y '+(!porUT ? 'grupo de edad' : tot ? 'UT/OCT (12 a 36 meses)' : 'servicio alimentario (12 a 36 meses)');
  // filas: {lab, sub, vals[], ev (se evalúa contra el rango), tipo}
  const L = sel(); let rows;
  if (!porUT){
    rows = [0,1,2,3].map(gi=>({lab:GRC[gi], full:GRP[gi], vals:[], ev:evaluaMac(gi)}));
    L.forEach(s=> evaluarAporte(s).mac.forEach((M,gi)=> M.vals.forEach(v=> rows[gi].vals.push(v.p[macSel]))));
  } else {
    const m = {};
    L.forEach(s=>{ const k = tot ? s.ut : s.cui; const o = m[k] || (m[k] = {lab: tot ? s.ut : s.sa, full: tot ? s.ut : s.sa+' (CUI '+s.cui+')', vals:[], ev:true, n:0, k});
      let t=false; [2,3].forEach(gi=> evaluarAporte(s).mac[gi].vals.forEach(v=>{ o.vals.push(v.p[macSel]); t=true; })); if(t) o.n++; });
    rows = Object.values(m).filter(o=>o.vals.length).map(o=>Object.assign(o,{md: cuantil([...o.vals].sort((a,b)=>a-b), .5)}))
      .sort((a,b)=> b.md - a.md || a.lab.localeCompare(b.lab,'es'));
  }
  if (!rows.some(r=>r.vals.length)){ el.innerHTML='<p class="note">Sin datos para esta selección.</p>'; return; }
  const [r0,r1] = MAC_RANGO[macSel];
  const all = rows.flatMap(r=>r.vals); let lo = Math.min(r0, ...all), hi = Math.max(r1, ...all);
  lo = Math.max(0, Math.floor((lo-2)/5)*5); hi = Math.min(100, Math.ceil((hi+2)/5)*5);
  const N = rows.length, W = Math.max(320, el.clientWidth || 680);
  const LW = porUT ? (W<520 ? 118 : 210) : (W<520 ? 92 : 150);
  const RW = 12, RH = porUT ? (N>12 ? 40 : 48) : 58, TOP = 26, H = TOP + RH*N + 30;
  const x = v => LW + (W-LW-RW) * (v-lo)/(hi-lo);
  const paso = ((hi-lo) > 40 || W < 520) ? 10 : 5;
  const corta = (t,n) => t.length > n ? t.slice(0,n-1)+'…' : t;
  let g = '';
  g += '<rect x="'+x(r0)+'" y="'+(TOP-6)+'" width="'+(x(r1)-x(r0))+'" height="'+(RH*N+6)+'" fill="var(--ok-soft)"/>';
  g += '<text x="'+((x(r0)+x(r1))/2)+'" y="'+(TOP-10)+'" text-anchor="middle" style="fill:var(--ok);font-size:11.5px;font-weight:600">Rango 12 a 36 m (RIEN Colombia): '+r0+' a '+r1+' %</text>';
  for (let t=lo; t<=hi; t+=paso) g += '<line class="ax" x1="'+x(t)+'" x2="'+x(t)+'" y1="'+(TOP-6)+'" y2="'+(TOP+RH*N)+'"/><text x="'+x(t)+'" y="'+(TOP+RH*N+16)+'" text-anchor="middle">'+t+' %</text>';
  const hb = porUT ? 9 : 11;   // media altura de la caja
  rows.forEach((row,ri)=>{
    const a = row.vals, yc = TOP + RH*ri + RH/2;
    const lab = porUT ? corta(row.lab, W<520 ? 15 : 27) : row.lab;
    g += (porUT && !(SAF && !tot) ? '<a href="#" class="salink" '+(tot?'data-ut="'+esc(row.k)+'"':'data-saf="'+row.k+'"')+'><text x="0" y="'+(yc-3)+'" class="lnk" style="fill:var(--azul);font-size:12.5px;font-weight:600;text-decoration:underline;cursor:pointer"><title>'+esc(row.full)+' · '+(tot?'toque para filtrar esta UT/OCT':'toque para ver solo este servicio')+'</title>'+esc(lab)+'</text></a>'
                                 : '<text x="0" y="'+(yc-3)+'" style="fill:var(--ink);font-size:12.5px;font-weight:600"><title>'+esc(row.full)+'</title>'+esc(lab)+'</text>')+
         '<text x="0" y="'+(yc+12)+'" style="font-size:11px">'+(a.length? nf0.format(a.length)+(porUT?' menús diarios':' días')+(porUT && tot ? ' · '+row.n+' serv.' : '')+(row.ev?'':' · ref.') : 'sin usuarios')+'</text>';
    if (!a.length) return;
    const s = [...a].sort((p,q)=>p-q), q1=cuantil(s,.25), md=cuantil(s,.5), q3=cuantil(s,.75), mn=s[0], mx=s[s.length-1], av=sum(s)/s.length;
    const fuera = row.ev ? s.filter(v=>Math.round(v)<r0||Math.round(v)>r1).length : null;   // mismo criterio que la tabla: porcentaje entero
    const op = s.length > 300 ? .16 : s.length > 60 ? .28 : .45;
    s.forEach((v,i)=>{ const jy = ((i*37)%23)/23 - .5; g += '<circle cx="'+x(v)+'" cy="'+(yc + jy*RH*0.5)+'" r="2.4" fill="var(--azul)" fill-opacity="'+op+'"/>'; });
    g += '<line x1="'+x(mn)+'" x2="'+x(q1)+'" y1="'+yc+'" y2="'+yc+'" stroke="var(--ink2)" stroke-width="1.5"/><line x1="'+x(q3)+'" x2="'+x(mx)+'" y1="'+yc+'" y2="'+yc+'" stroke="var(--ink2)" stroke-width="1.5"/>'+
         '<line x1="'+x(mn)+'" x2="'+x(mn)+'" y1="'+(yc-6)+'" y2="'+(yc+6)+'" stroke="var(--ink2)" stroke-width="1.5"/><line x1="'+x(mx)+'" x2="'+x(mx)+'" y1="'+(yc-6)+'" y2="'+(yc+6)+'" stroke="var(--ink2)" stroke-width="1.5"/>'+
         '<rect x="'+x(q1)+'" y="'+(yc-hb)+'" width="'+Math.max(2,x(q3)-x(q1))+'" height="'+(hb*2)+'" rx="4" fill="var(--azul-soft)" fill-opacity=".85" stroke="var(--azul)" stroke-width="1.5"/>'+
         '<line x1="'+x(md)+'" x2="'+x(md)+'" y1="'+(yc-hb)+'" y2="'+(yc+hb)+'" stroke="var(--ink)" stroke-width="2.5"/>'+
         '<circle cx="'+x(av)+'" cy="'+yc+'" r="4" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5"/>';
    const tip = '<b>'+esc(row.full)+'</b>'+(porUT?' · 12 a 36 meses':'')+' · '+nf0.format(s.length)+(porUT?' menús diarios (un día de un grupo de edad)':' días con menú')+(porUT && tot ? ' · '+row.n+' servicio'+(row.n===1?'':'s') : '')+
      '<br>Mínimo '+nf1.format(mn)+' % · máximo '+nf1.format(mx)+' %<br>Cuartiles: '+nf1.format(q1)+' % · <b>mediana '+nf1.format(md)+' %</b> · '+nf1.format(q3)+' %<br>Promedio '+nf1.format(av)+' %'+
      (fuera===null ? '<br>Referencial en este grupo de edad' : '<br>Fuera del rango '+r0+' a '+r1+' %: '+nf0.format(fuera)+(porUT?' menús':' días')+' ('+nf0.format(fuera/s.length*100)+' %)');
    g += '<rect x="'+LW+'" y="'+(yc-RH/2)+'" width="'+(W-LW-RW)+'" height="'+RH+'" fill="transparent" data-tip="'+esc(tip)+'"/>';
  });
  el.innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="Distribución del porcentaje de calorías de '+MAC[macSel].toLowerCase()+' '+(porUT?'por '+(tot?'UT/OCT':'servicio alimentario'):'por grupo de edad')+'">'+g+'</svg>';
  $('#nMacG').textContent = porUT
    ? 'Cada punto es el menú de un día para un grupo de edad (12 a 23 o 24 a 36 meses) de un servicio alimentario; un servicio con 19 días y los dos grupos suma 38 menús diarios. Las filas se ordenan por la mediana, de mayor a menor. Las líneas laterales llegan al valor mínimo y al máximo. El rango de referencia es el de 1 a 3 años de la RIEN de Colombia. Toque una fila para ver sus cifras.'
    : 'Cada punto es un día con menú de un servicio alimentario para ese grupo de edad. Las líneas laterales llegan al valor mínimo y al máximo. El rango de referencia es el de 1 a 3 años de la RIEN de Colombia; en 6 a 8 y 9 a 11 meses los valores son referenciales. Toque una fila para ver sus cifras.';
}
// -------- alertas técnicas de distribución de calorías (12 a 36 meses): proteínas bajo el rango y grasas sobre el rango.
// Criterio técnico con el rango de la RIEN de Colombia; no está establecido en la Directiva del SCD.
// enlace a uno o varios días señalados: lleva al menú del primer día y deja una barra para recorrer los demás
function lnkDias(s, dias, mot, txt, cls){
  dias = dias.slice().sort((a,b)=>a.f<b.f?-1:1);
  return '<a href="#menu-semanal" class="vermenu'+(cls?' '+cls:'')+'" data-cui="'+s.cui+'" data-sem="'+dias[0].s+'" data-f="'+dias[0].f+'" data-dias="'+dias.map(d=>d.f+':'+d.s).join(',')+'" data-mot="'+esc(mot)+'" data-tip="'+esc(mot+': '+dias.map(d=>ddmm(pd(d.f))).join(', ')+' · toque para ver el menú')+'">'+txt+'</a>';
}
// con todas las UT/OCT, las tablas de alertas muestran un resumen por UT/OCT; al tocar una se filtra y se ven sus servicios
const utLink = u => '<a href="#" class="salink" data-ut="'+esc(u)+'" title="Filtrar por '+esc(u)+'">'+esc(u)+'</a>';
function tablaUT(L, fila, cab){
  const g = {}; L.forEach(s=>(g[s.ut]=g[s.ut]||[]).push(s));
  const rows = Object.entries(g).map(([u,ss])=>fila(u,ss)).filter(Boolean).sort((a,b)=>b.k-a.k || a.u.localeCompare(b.u,'es'));
  return '<thead><tr>'+cab+'</tr></thead><tbody>'+rows.map(o=>o.h).join('')+'</tbody>';
}
// cuando no hay alertas, en lugar de la tabla vacía se muestra un mensaje de confirmación
function okTabla(id, msg){ const ok=$('#'+id+'Ok'), w=$('#'+id+'Wrap'); ok.hidden=!msg; w.hidden=!!msg; if(msg) ok.innerHTML='<span class="okic" aria-hidden="true">✓</span><span>'+msg+'</span>'; }
function alertasMacro(){
  // solo proteínas: días en que menos del 10 % de las calorías viene de proteínas (las grasas fuera de rango se ven en el menú semanal)
  const pMin = MAC_RANGO[0][0];
  const L = sel(); const rows = [];
  L.forEach(s=>{ const r = evaluarAporte(s); const dp = {}, gr = new Set();
    [2,3].forEach(gi=> r.mac[gi].vals.forEach(v=>{ if (Math.round(v.p[0]) < pMin){ dp[v.f]=v.s; gr.add(gi); } }));
    const dias = Object.keys(dp).sort();
    if (dias.length) rows.push({s, dias:new Set(r.mac[2].vals.concat(r.mac[3].vals).map(v=>v.f)).size, np:dias.length, dp:dias.map(f=>({f,s:dp[f]})), gr:[...gr].sort(), f:dias[0]});
  });
  rows.sort((a,b)=> b.np-a.np || a.s.sa.localeCompare(b.s.sa,'es'));
  const conG = L.filter(s=>s.u[2]||s.u[3]).length;
  $('#apMacLede').innerHTML = '<b>Criterio técnico, no establecido en la Directiva del Servicio de Cuidado Diurno.</b> Señala los días en que el menú de 12 a 23 o de 24 a 36 meses tiene menos de '+pMin+' % de sus calorías de proteínas, límite inferior del rango aceptable de distribución de macronutrientes para 1 a 3 años de la RIEN de Colombia (Resolución 3803 de 2016). No se cuenta como incumplimiento del aporte nutricional; sirve para revisar las recetas de esos días. La distribución completa (proteínas, grasas y carbohidratos) de cada día se ve en el bloque de aporte de la pestaña Menú semanal. '+
    (rows.length ? rows.length+' de '+conG+' servicios alimentarios con usuarios de 12 a 36 meses tienen al menos un día señalado.' : '');
  if(!rows.length){
    $('#tApMac').innerHTML='';
    let nd=0, alto=0; L.forEach(s=>{ const r=evaluarAporte(s); [2,3].forEach(gi=>r.mac[gi].vals.forEach(v=>{ nd++; if(Math.round(v.p[0])>MAC_RANGO[0][1]) alto++; })); });
    const quien = UT==='TODAS' ? 'los servicios alimentarios seleccionados' : SAF ? esc(filtroTxt()) : 'los servicios alimentarios '+esc(deSel());
    okTabla('tApMac', !conG ? 'No hay servicios alimentarios con usuarios de 12 a 36 meses en esta selección.' :
      (alto ? 'En '+quien+', ningún menú diario de 12 a 36 meses tiene menos de '+pMin+' % de sus calorías de proteínas.' :
              'En '+quien+', todos los menús diarios de 12 a 36 meses están dentro del rango de referencia de proteínas ('+MAC_RANGO[0][0]+' a '+MAC_RANGO[0][1]+' % de las calorías).'));
    return;
  }
  okTabla('tApMac', null);
  const mot = 'Proteínas por debajo de '+pMin+' % de las calorías (criterio técnico)';
  if (UT==='TODAS'){
    $('#apMacLede').innerHTML += ' Toque una UT/OCT para ver sus servicios alimentarios.';
    const porS = new Map(rows.map(o=>[o.s.cui,o]));
    $('#tApMac').innerHTML = tablaUT(L, (u,ss)=>{ const c=ss.filter(s=>s.u[2]||s.u[3]); if(!c.length) return null; const al=c.map(s=>porS.get(s.cui)).filter(Boolean);
        if(!al.length) return null;   // solo las UT/OCT con algún servicio con días señalados
        const np=sum(al.map(o=>o.np)), gr=[...new Set(al.flatMap(o=>o.gr))].sort();
        return {u, k:al.length, h:'<tr><td>'+utLink(u)+'</td><td class="n">'+c.length+'</td><td class="n">'+(al.length?'<b>'+al.length+'</b>':'—')+'</td><td class="n">'+(np||'—')+'</td><td style="white-space:nowrap">'+(gr.map(g=>GRC[g]).join(', ')||'—')+'</td></tr>'}; },
      '<th>UT/OCT</th><th class="n">Servicios con usuarios de 12 a 36 m</th><th class="n">Servicios con días señalados</th><th class="n">Días con proteínas &lt; '+pMin+' %</th><th>Grupos de edad</th>');
    return;
  }
  $('#tApMac').innerHTML = '<thead><tr><th>Servicio alimentario</th><th class="n">Días con menú</th><th class="n">Días con proteínas &lt; '+pMin+' %</th><th>Grupos de edad</th><th>Primer día</th></tr></thead><tbody>'+
    rows.map(o=>'<tr><td>'+saA(o.s)+'</td><td class="n">'+o.dias+'</td><td class="n">'+lnkDias(o.s,o.dp,mot,o.np,'cnt')+'</td><td style="white-space:nowrap">'+o.gr.map(g=>GRC[g]).join(', ')+'</td><td style="white-space:nowrap">'+lnkDias(o.s,o.dp,mot,ddmm(pd(o.f))+' · ver menú')+'</td></tr>').join('')+'</tbody>';
}
function alertasAporte(){
  const L = sel(); const ev = L.map(s=>({s, r:evaluarAporte(s)}));
  const con = ev.filter(x=>x.r.malos.length).sort((a,b)=>b.r.malos.length-a.r.malos.length || a.s.sa.localeCompare(b.s.sa,'es'));
  $('#apLede').innerHTML = con.length
    ? con.length+' de '+L.length+' servicios alimentarios tienen al menos un día en que el menú no alcanza la meta del Programa para algún nutriente y grupo de edad (energía 70 %, proteínas 90 %, hierro 100 %, zinc 70 % y calcio 40 % del requerimiento). El cálculo es el mismo del bloque de aporte de la pestaña Menú semanal; solo se evalúan los grupos que tienen usuarios, y en los de 6 a 8 y 9 a 11 meses el calcio es referencial y no se cuenta como incumplimiento.'
    : 'Se evalúa si cada día con menú alcanza la meta del Programa (energía 70 %, proteínas 90 %, hierro 100 %, zinc 70 % y calcio 40 % del requerimiento) en los grupos de edad con usuarios; en los de 6 a 8 y 9 a 11 meses el calcio es referencial.';
  if (con.length) $('#apLede').innerHTML += ' <b>No cumple dosificaciones</b>: días bajo la meta en que alguna receta tiene un alimento por debajo de la dosificación mínima del Anexo N° 2 del procedimiento de atención alimentaria, o usa la misma cantidad para todos los grupos de edad cuando el anexo la diferencia. En el menú semanal se detallan y se sugieren cambios para alcanzar la meta dentro del presupuesto calculado del servicio.';
  if(!con.length){ $('#tAp').innerHTML=''; okTabla('tAp', L.length ? 'En '+(UT==='TODAS'?'los servicios alimentarios seleccionados':SAF?esc(filtroTxt()):'los servicios alimentarios '+esc(deSel()))+', todos los días con menú alcanzan la meta del Programa en los cinco nutrientes y en todos los grupos de edad con usuarios.' : 'No hay servicios alimentarios en esta selección.'); return; }
  okTabla('tAp', null);
  if (UT==='TODAS'){
    $('#apLede').innerHTML += ' Toque una UT/OCT para ver sus servicios alimentarios.';
    const porS = new Map(ev.map(x=>[x.s.cui,x.r]));
    $('#tAp').innerHTML = tablaUT(L, (u,ss)=>{ const rr=ss.map(s=>porS.get(s.cui)), al=rr.filter(r=>r.malos.length);
        if(!al.length) return null;   // solo las UT/OCT con algún servicio con días bajo la meta
        const dm=sum(al.map(r=>r.malos.length)), nut=[0,1,2,3,4].map(j=>sum(al.map(r=>r.porNut[j]))), gr=[0,1,2,3].filter(g=>al.some(r=>r.grupos[g]));
        const nz=sum(ss.map(s=>diasDz(s).length)), sz=ss.filter(s=>diasDz(s).length).length;
        return {u, k:al.length, h:'<tr><td>'+utLink(u)+'</td><td class="n">'+ss.length+'</td><td class="n">'+(al.length?'<b>'+al.length+'</b>':'—')+'</td><td class="n">'+(dm||'—')+'</td><td class="n">'+(nz?'<span class="chip mag">'+nz+' día'+(nz===1?'':'s')+' · '+sz+' servicio'+(sz===1?'':'s')+'</span>':'—')+'</td><td>'+
          (nut.map((n,j)=>n?'<span class="chip" style="margin:1px 2px">'+NUTL[j]+' '+n+'</span>':'').join('')||'—')+'</td><td style="white-space:nowrap">'+(gr.map(g=>GRC[g]).join(', ')||'—')+'</td></tr>'}; },
      '<th>UT/OCT</th><th class="n">Servicios con menú</th><th class="n">Servicios con días bajo la meta</th><th class="n">Días bajo la meta</th><th class="n">No cumple dosificaciones</th><th>Nutrientes (n.° de días)</th><th>Grupos de edad</th>');
    return;
  }
  $('#tAp').innerHTML = '<thead><tr><th>Servicio alimentario</th><th class="n">Días con menú</th><th class="n">Días bajo la meta</th><th>Dosificación</th><th>Nutrientes (n.° de días)</th><th>Grupos de edad</th><th>Primer día</th></tr></thead><tbody>'+
    con.map(({s,r})=>{ const m=r.malos[0], dd=diasDz(s);
      return '<tr><td>'+saA(s)+'</td><td class="n">'+r.dias+'</td><td class="n">'+lnkDias(s,r.malos,'Días bajo la meta del Programa',r.malos.length,'cnt')+'</td><td>'+(dd.length?chipDz(s,dd):'—')+'</td><td>'+
        r.porNut.map((n,j)=>n?lnkDias(s,r.malos.filter(m=>m.nut.includes(j)),NUTL[j]+' bajo la meta del Programa','<span class="chip" style="margin:1px 2px">'+NUTL[j]+' '+n+'</span>','chipl'):'').join('')+'</td><td>'+
        r.grupos.map((n,g)=>n?GRC[g]:'').filter(Boolean).join(', ')+'</td><td>'+lnkDias(s,r.malos,'Días bajo la meta del Programa',ddmm(pd(m.f))+' · ver menú')+'</td></tr>'; }).join('')+'</tbody>';
}
on('click', e=>{ const a=e.target.closest('a.vermenu'); if(!a) return; e.preventDefault();
  if (!$('#rcOv').hidden){ $('#rcOv').hidden = true; document.body.style.overflow=''; window.__lastCell = null; }
  const op = a.dataset.f ? {f:a.dataset.f, mot:a.dataset.mot||'', dias:(a.dataset.dias||'').split(',').filter(Boolean).map(x=>{ const [f,s]=x.split(':'); return {f, s:+s}; })} : null;
  window.__verMenu(a.dataset.cui, +a.dataset.sem, op); });

function menuSemanal(keepWeek){ llenarSA(); llenarSem(keepWeek); hoja(); }
$('#fSA').addEventListener('change', e=>{ SA=e.target.value; try{localStorage.setItem('envios_sa',SA)}catch(_){} llenarSem(true); hoja(); });
$('#fSem').addEventListener('change', e=>{ SEM=+e.target.value; llenarSem(true); hoja(); });
$('#wPrev').onclick = ()=>{ const s=semanasDe(SA); const i=s.findIndex(w=>w.s===SEM); if(i>0){SEM=s[i-1].s; llenarSem(true); hoja();} };
$('#wNext').onclick = ()=>{ const s=semanasDe(SA); const i=s.findIndex(w=>w.s===SEM); if(i<s.length-1){SEM=s[i+1].s; llenarSem(true); hoja();} };
$('#wHoy').onclick = ()=>{ SEM=semanaEnCurso(semanasDe(SA)); llenarSem(true); hoja(); };

// pestañas
// vistas: Resumen, Menú semanal y Envíos (avance de los envíos)
const VISTAS = {res:['#vRes','#tbRes','#resumen'], menu:['#vMen','#tbMen','#menu-semanal'], env:['#vEnv','#tbEnv','#envios']};
function tab(which){
  if(!VISTAS[which]) which='res';
  Object.entries(VISTAS).forEach(([k,[v,b]])=>{ $(v).hidden = k!==which; $(b).setAttribute('aria-selected', String(k===which)); });
  $('#navRes').hidden = which!=='res';
  try{ history.replaceState(null,'', VISTAS[which][2]); }catch(_){}
  if(which==='menu') menuSemanal(true);
  window.scrollTo(0,0);
}
$('#tbRes').onclick = ()=>tab('res'); $('#tbMen').onclick = ()=>tab('menu'); $('#tbEnv').onclick = ()=>tab('env');
// abrir el menú de un servicio desde el detalle
window.__verMenu = (cui, sem, op) => { FOCO = op ? Object.assign({cui}, op) : null; SA = cui; const s0=byCui[cui]; if(s0 && !sel().includes(s0)){ UT='TODAS'; CG=''; SAF=''; $('#fUT').value=UT; llenarFiltros(); render(); } if(sem){ SEM = sem; } tab('menu'); if(sem){ SEM = sem; if(op && op.f){ DIA = (pd(op.f).getDay()+6)%7; DIAkey = cui+'|'+sem; } llenarSem(true); hoja(); }
  if(op && op.f){ requestAnimationFrame(()=>{ const sh=$('#sheet'); const th=sh.querySelector('th.fo'); const top=sh.getBoundingClientRect().top+window.scrollY-70; window.scrollTo(0, Math.max(0,top));
    if(th && sh.scrollWidth>sh.clientWidth) sh.scrollLeft = Math.max(0, th.offsetLeft - sh.clientWidth/2 + th.offsetWidth/2); }); }
  else window.scrollTo(0,0); };

$('#segMac').addEventListener('click', e=>{ const b=e.target.closest('[data-mac]'); if(!b) return; macSel=+b.dataset.mac; graficoMacro(); });
$('#segMacV').addEventListener('click', e=>{ const b=e.target.closest('[data-vista]'); if(!b) return; macVista=b.dataset.vista; graficoMacro(); });
let rzT; window.addEventListener('resize', ()=>{ clearTimeout(rzT); rzT=setTimeout(graficoMacro, 150); }, {signal: AC.signal});
// con una UT/OCT filtrada, su nombre va en los títulos de las secciones (y las tablas dejan de repetirlo en una columna)
function titulosUT(){
  const tag = UT==='TODAS' ? '' : ' · '+UT+(CG?' · CG '+CG:'')+(SAF?' · '+(byCui[SAF]||{}).sa:'');
  const hu = document.querySelector('#hUT'); if (hu) hu.textContent = tag;
  document.querySelectorAll('#vRes section > h2, #vEnv section > h2, h3.ut-t, #nutHead').forEach(h=>{
    h.querySelectorAll('.uttag').forEach(x=>x.remove());
    if (UT==='TODAS') return;
    const t = document.createElement('span'); t.className='uttag'; t.textContent = tag;
    const chip = h.querySelector('.chip, .nut-src'); chip ? h.insertBefore(t, chip) : h.appendChild(t);
  });
}
// ================= N° EN LOS LISTADOS Y DESCARGA EN PNG =================
// Cada listado de UT/OCT o de servicios alimentarios empieza con N°: se agrega cada vez que la tabla se vuelve a dibujar.
function numerar(t){
  if (!t || !t.tHead || !t.tBodies.length) return;
  const hr = t.tHead.rows[0]; if (!hr || hr.querySelector('.nro')) return;
  const th = document.createElement('th'); th.className = 'n nro'; th.textContent = 'N°'; hr.insertBefore(th, hr.firstChild);
  let i = 0;
  [...t.tBodies[0].rows].forEach(tr=>{
    if (tr.cells.length===1 && tr.cells[0].colSpan>1){ tr.cells[0].colSpan++; return; }
    const td = document.createElement('td'); td.className = 'n nro'; td.textContent = String(++i); tr.insertBefore(td, tr.firstChild); });
}
{ const obs = new MutationObserver(ms=>{ const vistos = new Set();
    ms.forEach(m=>{ const t = m.target; if (t.tagName==='TABLE') vistos.add(t); else t.querySelectorAll && t.querySelectorAll('table.lst').forEach(x=>vistos.add(x)); });
    vistos.forEach(numerar); });
  ['tAv','tUlt','tSA','tAp','tApMac'].forEach(id=>{ const t = document.getElementById(id); if (t) obs.observe(t, {childList:true}); });
  const rc = document.getElementById('rcBox'); if (rc) obs.observe(rc, {childList:true});
  AC.signal.addEventListener('abort', ()=>obs.disconnect()); }

// Descarga de cualquier tabla o gráfico como imagen PNG (con su título, la selección y la fecha de los datos)
let H2I = null;
const cargarH2I = () => window.htmlToImage ? Promise.resolve(window.htmlToImage) : (H2I = H2I || new Promise((ok, mal)=>{
  const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
  s.onload = ()=> window.htmlToImage ? ok(window.htmlToImage) : mal(new Error('sin generador'));
  s.onerror = ()=>{ H2I = null; mal(new Error('No se pudo cargar el generador de imágenes')); };
  document.head.appendChild(s); }));
const slugPNG = t => String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
const ICO_PNG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>';
function botonesPNG(){
  const fila = () => { const d = document.createElement('div'); d.className = 'pngfila'; d.innerHTML = '<button type="button" class="pngbtn" title="Descargar como imagen PNG">'+ICO_PNG+'PNG</button>'; return d; };
  document.querySelectorAll('#vRes .panel, #vEnv .panel').forEach(p=>{
    if (p.dataset.png || !p.querySelector('table, #cEjec, #cNino, #cFood, #cGrupo, #cMacG, #cProvNP, #cProvP, #cDia')) return;
    p.dataset.png = '1'; const f = fila();
    if (p.classList.contains('scroll')){ f._panel = p; p.after(f); } else p.appendChild(f);   // en un panel con desplazamiento, el botón va debajo
  });
  const sh = document.getElementById('sheet');
  if (sh && !sh.dataset.png){ sh.dataset.png = '1'; const f = fila(); f._panel = sh; sh.after(f); }
}
// título: el del panel (h3) o, si no tiene, el encabezado que lo precede; arriba, el de la sección
function titulosPNG(p){
  const sec = p.closest('section'), h2 = sec && sec.querySelector('h2');
  const ante = h2 ? h2.textContent.trim() : '';
  if (p.querySelector('h3') || p.id==='sheet') return {ante, tit:''};
  let x = p.previousElementSibling;
  while (x){ if (/^H[23]$/.test(x.tagName)) return {ante: x.tagName==='H2' ? '' : ante, tit: x.textContent.trim()}; x = x.previousElementSibling; }
  return {ante:'', tit: ante};
}
async function guardarArchivo(blob, nombre){
  let dl = null;
  try { if (window.claude && typeof window.claude.use==='function') dl = await window.claude.use('downloads'); } catch(_) {}
  if (dl){
    try { await dl.save({filename: nombre, data: blob}); return; }
    catch(e){ if (e && e.code==='declined') return; if (e && !['unavailable','not_granted','capability_disabled','capability_removed'].includes(e.code)) throw e; }
  }
  const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u), 5000);
}
async function exportarPNG(btn){
  const f = btn.closest('.pngfila'), p = f._panel || f.closest('.panel'); if (!p || p.hidden) return;
  const txt = btn.innerHTML; btn.disabled = true; btn.innerHTML = ICO_PNG+'Generando…';
  let w = null;
  try {
    const H = await cargarH2I();
    const {ante, tit} = titulosPNG(p);
    const cs = getComputedStyle(document.body);
    let ancho = p.offsetWidth; [p, ...p.querySelectorAll('.scroll, table')].forEach(x=>{ ancho = Math.max(ancho, x.scrollWidth); });
    w = document.createElement('div'); w.className = 'pngexp';
    w.style.cssText = 'position:fixed;left:-30000px;top:0;box-sizing:border-box;padding:18px 22px 14px;width:'+(ancho+44)+'px;background:'+cs.backgroundColor+';color:'+cs.color;
    if (ante) { const a = document.createElement('div'); a.className = 'pngante'; a.textContent = ante; w.appendChild(a); }
    if (tit) { const t = document.createElement('div'); t.className = 'pngtit'; t.textContent = tit; w.appendChild(t); }
    const c = p.cloneNode(true);
    c.querySelectorAll('.pngfila').forEach(x=>x.remove()); c.removeAttribute('id');
    c.style.overflow = 'visible'; c.style.width = ancho+'px'; c.style.maxWidth = 'none'; c.style.boxSizing = 'border-box'; c.style.margin = '0';
    c.querySelectorAll('.scroll').forEach(x=>{ x.style.overflow = 'visible'; });
    c.querySelectorAll('th, td').forEach(x=>{ if (x.style.transform) x.style.transform = ''; });
    w.appendChild(c);
    const sel = UT==='TODAS' ? 'Todas las UT/OCT' : UT+(CG?' · CG '+CG:'')+(SAF?' · '+(byCui[SAF]||{}).sa:'');
    const pie = document.createElement('div'); pie.className = 'pngpie';
    pie.textContent = 'Envíos del menú · '+mesTxt(D.periodo)+' · '+sel+(/^\d{4}-\d{2}-\d{2}/.test(String(D.corte)) ? ' · datos al '+D.corte.slice(8,10)+'/'+D.corte.slice(5,7)+'/'+D.corte.slice(0,4)+' '+D.corte.slice(11)+' h' : '')+' · Programa Nacional Cuna Más';
    w.appendChild(pie);
    document.body.appendChild(w);
    const op = {pixelRatio: 2, style: {position:'static', left:'0', top:'0'}};
    let blob;
    try { blob = await H.toBlob(w, op); } catch(e){ blob = await H.toBlob(w, Object.assign({skipFonts:true}, op)); }   // si las fuentes no se pueden incrustar
    const nom = 'envios_'+D.periodo+'_'+(slugPNG(tit || (p.querySelector('h3')||{}).textContent || (p.id==='sheet' ? 'menu-semanal' : ante)) || 'tabla')+'.png';
    await guardarArchivo(blob, nom);
    btn.innerHTML = txt;
  } catch(e){
    console.error('PNG', e); btn.innerHTML = ICO_PNG+'No se pudo generar'; setTimeout(()=>{ btn.innerHTML = txt; }, 3000);
  } finally {
    if (w) w.remove(); btn.disabled = false;
  }
}
botonesPNG();
on('click', e=>{ const b = e.target.closest('.pngbtn'); if (b){ e.preventDefault(); exportarPNG(b); } });

function render(){ titulosUT(); kpis(); coberturaNut(); avance(); porDia(); ultimos(); calidad(); ejec(); nino(); foods(); alertasAporte(); resumenCob(); resumenMacro(); graficoMacro(); alertasMacro(); prov(); detalle(); if(!$('#vMen').hidden) menuSemanal(true); }
const E0 = arguments[2];
if (E0){ if (E0.SA) SA=E0.SA; if (E0.UT && (E0.UT==='TODAS' || uts.includes(E0.UT))){ UT=E0.UT; $('#fUT').value=UT; } CG=E0.CG||''; SAF=E0.SAF||''; llenarFiltros(); if (E0.SEM!=null) SEM=E0.SEM; openCui=E0.openCui; sortK=E0.sortK; sortD=E0.sortD; macSel=E0.macSel; macVista=E0.macVista; $('#q').value=E0.q||''; DIA=E0.DIA; DIAkey=E0.DIAkey; FOCO=E0.FOCO;
  if (E0.metric==='kg'){ metric='kg'; $('#mK').setAttribute('aria-pressed','true'); $('#mS').setAttribute('aria-pressed','false'); } }
render();
if(location.hash==='#menu-semanal') tab('menu'); else if(location.hash==='#envios') tab('env');
return { estado: () => ({SA, UT, CG, SAF, SEM, openCui, sortK, sortD, metric, macSel, macVista, q:$('#q').value, DIA, DIAkey, FOCO}) };
}

