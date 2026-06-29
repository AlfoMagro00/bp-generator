// ============================================================
// BP Generator — core.js
// Stato condiviso, Supabase, multilingua, calcoli, utils
// ============================================================

// ── SUPABASE CONFIG ─────────────────────────────────────────
const SUPABASE_URL  = 'https://laejzfcajjeokdaskniv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_UrIZJI83FL21ImFPLp4qQA_7R_Z32Tb';

// ── STATO GLOBALE ────────────────────────────────────────────
const D = {
  lang: 'it',
  hist: [2021,2022,2023,2024,2025],
  prev: [2026,2027,2028,2029,2030],
  nPrev: 5,
  ce: {}, sp: {},
  prevCE: {}, prevGrowth: {}, prevAbs: {}, prevMode: {},
  loans: [
    {id:1,label:'Mutuo 1',cap:0,yr:0,rate:0,type:'fr',active:false},
    {id:2,label:'Mutuo 2',cap:0,yr:0,rate:0,type:'fr',active:false},
    {id:3,label:'Mutuo 3',cap:0,yr:0,rate:0,type:'fr',active:false},
    {id:4,label:'Mutuo 4',cap:0,yr:0,rate:0,type:'fr',active:false},
    {id:5,label:'Mutuo 5',cap:0,yr:0,rate:0,type:'it',active:false},
  ],
  stress: {
    vars: [
      {id:'ricavi',   active:true,  pct:-20},
      {id:'mp',       active:true,  pct: 20},
      {id:'personale',active:true,  pct: 10},
      {id:'servizi',  active:false, pct: 15},
      {id:'prezzo',   active:false, pct:-10},
    ],
    kpis: ['EBITDA','EBIT','Utile netto','Current Ratio','Debt Ratio'],
  },
  lav4: [
    {id:'desc1', incl:true,  txt:''},
    {id:'desc2', incl:true,  txt:''},
    {id:'desc3', incl:true,  txt:''},
    {id:'desc4', incl:true,  txt:''},
    {id:'desc5', incl:true,  txt:''},
    {id:'desc6', incl:true,  txt:''},
    {id:'desc7', incl:false, txt:''},
    {id:'desc8', incl:false, txt:''},
    {id:'desc9', incl:false, txt:''},
    {id:'altro1',incl:false, txt:''},
    {id:'altro2',incl:false, txt:''},
  ],
  swot: {s:'',w:'',o:'',t:'',so:'',st:'',wo:'',wt:''},
  tam: {n:0,p:0,samPct:10,samAbs:0,somRows:[]},
  apRows: [],
  kpiTexts: {},
  mods: new Set([
    'anagrafica','sedi','desc1','desc2','desc3','swot','tows',
    'tam','sam','som','ce_stor','ce_prev','kpi','stress','action_plan'
  ]),
};

// ── SUPABASE CLIENT ──────────────────────────────────────────
const SB = {
  _token: null,
  headers(extra){
    return {
      'apikey': SUPABASE_ANON,
      'Content-Type': 'application/json',
      ...(this._token
        ? {'Authorization':'Bearer '+this._token}
        : {'Authorization':'Bearer '+SUPABASE_ANON}),
      ...extra
    };
  },
  async signUp(email,password,meta){
    const r=await fetch(`${SUPABASE_URL}/auth/v1/signup`,{method:'POST',headers:this.headers(),body:JSON.stringify({email,password,data:meta})});
    const d=await r.json(); if(d.error)throw new Error(d.error.message||JSON.stringify(d)); return d;
  },
  async signIn(email,password){
    const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:this.headers(),body:JSON.stringify({email,password})});
    const d=await r.json(); if(d.error)throw new Error(d.error.message||JSON.stringify(d)); this._token=d.access_token; return d;
  },
  async signOut(){
    await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:this.headers()}); this._token=null;
  },
  async getUser(){
    const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:this.headers()}); const d=await r.json(); if(d.error)throw new Error(d.error.message); return d;
  },
  async select(table,filter=''){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`,{headers:this.headers({'Prefer':'return=representation'})});
    const d=await r.json(); if(d.error)throw new Error(d.error.message); return d;
  },
  async insert(table,row){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:'POST',headers:this.headers({'Prefer':'return=representation'}),body:JSON.stringify(row)});
    const d=await r.json(); if(d.error)throw new Error(d.error.message); return Array.isArray(d)?d[0]:d;
  },
  async upsert(table,row,onConflict='id'){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`,{method:'POST',headers:this.headers({'Prefer':'return=representation,resolution=merge-duplicates'}),body:JSON.stringify(row)});
    const d=await r.json(); if(d.error)throw new Error(d.error.message); return Array.isArray(d)?d[0]:d;
  },
  async delete(table,filter){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`,{method:'DELETE',headers:this.headers()});
    if(!r.ok){const d=await r.json();throw new Error(d.message||'Errore');}
  },
};

// ── SESSION ──────────────────────────────────────────────────
const SESSION = { user:null, accessToken:null, refreshToken:null, currentDbId:null, currentSlug:null, currentNome:null };

function saveSession(){
  localStorage.setItem('bp_session',JSON.stringify({accessToken:SESSION.accessToken,refreshToken:SESSION.refreshToken,user:SESSION.user}));
}
function loadSession(){
  const s=localStorage.getItem('bp_session'); if(!s)return false;
  const p=JSON.parse(s); if(!p.accessToken)return false;
  SESSION.accessToken=p.accessToken; SESSION.refreshToken=p.refreshToken; SESSION.user=p.user; SB._token=p.accessToken; return true;
}
function clearSession(){
  Object.assign(SESSION,{user:null,accessToken:null,refreshToken:null,currentDbId:null,currentSlug:null,currentNome:null});
  SB._token=null; localStorage.removeItem('bp_session');
}

// ── CE/SP ROWS DEFINITION ────────────────────────────────────
const CE_ROWS = [
  {id:'A1', lbl:'Ricavi delle vendite',t:'v'},
  {id:'A2', lbl:'Var. rim. prodotti in lav., sem., p.f.',t:'v'},
  {id:'A3', lbl:'Variazioni lavori in corso su ordinazione',t:'v'},
  {id:'A4', lbl:'Incrementi imm. per lavori interni',t:'v'},
  {id:'A5', lbl:'Altri ricavi e proventi',t:'v'},
  {id:'_TA',lbl:'A) TOTALE VALORE DELLA PRODUZIONE',t:'s'},
  {id:'B6', lbl:'Per materie prime, sussidiarie e merci',t:'v'},
  {id:'B7', lbl:'Per servizi',t:'v'},
  {id:'B8', lbl:'Per godimento beni di terzi',t:'v'},
  {id:'B9a',lbl:'a) Salari e stipendi',t:'v'},
  {id:'B9b',lbl:'b) Oneri sociali',t:'v'},
  {id:'B9c',lbl:'c) TFR',t:'v'},
  {id:'B9d',lbl:'d) Trattamenti di quiescenza',t:'v'},
  {id:'B9e',lbl:'e) Altri costi',t:'v'},
  {id:'_T9',lbl:'9) Totale costi del personale',t:'sub'},
  {id:'B10a',lbl:'a) Amm. imm. immateriali',t:'v'},
  {id:'B10b',lbl:'b) Amm. imm. materiali',t:'v'},
  {id:'B10c',lbl:'c) Altre svalutazioni imm.',t:'v'},
  {id:'B10d',lbl:'d) Sval. crediti a.c.',t:'v'},
  {id:'_T10',lbl:'10) Totale amm. e svalutazioni',t:'sub'},
  {id:'B11',lbl:'Var. rim. materie prime, sussidiarie',t:'v'},
  {id:'B12',lbl:'Accantonamento per rischi',t:'v'},
  {id:'B13',lbl:'Altri accantonamenti',t:'v'},
  {id:'B14',lbl:'Oneri diversi di gestione',t:'v'},
  {id:'_TB',lbl:'B) TOTALE COSTI DELLA PRODUZIONE',t:'s'},
  {id:'_AB',lbl:'DIFFERENZA A-B  (EBIT)',t:'s'},
  {id:'C15',lbl:'Proventi da partecipazioni',t:'v'},
  {id:'C16',lbl:'Altri proventi e oneri finanziari',t:'v'},
  {id:'C17',lbl:'Interessi e oneri finanziari',t:'v'},
  {id:'C18',lbl:'Utili su cambi',t:'v'},
  {id:'C19',lbl:'Perdite su cambi',t:'v'},
  {id:'D20',lbl:'Rivalutazione',t:'v'},
  {id:'D21',lbl:'Svalutazione',t:'v'},
  {id:'_EBT',lbl:'UTILE PRIMA DELLE IMPOSTE (EBT)',t:'s'},
  {id:'E22',lbl:'Imposte sul reddito dell\'esercizio',t:'v'},
  {id:'_UTILE',lbl:'UTILE (PERDITA) DELL\'ESERCIZIO',t:'s'},
];

const SP_ATTIVO = [
  {id:'_HATT', lbl:'ATTIVO',t:'h'},
  {id:'AI_imm',lbl:'A.I Imm. immateriali',t:'v'},
  {id:'AI_mat',lbl:'A.II Imm. materiali',t:'v'},
  {id:'AI_fin',lbl:'A.III Imm. finanziarie',t:'v'},
  {id:'_TIMM', lbl:'A) Tot. attivo immobilizzato',t:'sub'},
  {id:'CI_rim', lbl:'C.I Rimanenze',t:'v'},
  {id:'CII_cred',lbl:'C.II Crediti verso clienti',t:'v'},
  {id:'CII_trib',lbl:'C.II Crediti tributari',t:'v'},
  {id:'CIII_fin',lbl:'C.III Att. finanziarie a breve',t:'v'},
  {id:'CIV_liq',lbl:'C.IV Depositi e cassa',t:'v'},
  {id:'_TCIRC',lbl:'C) Tot. attivo circolante',t:'sub'},
  {id:'D_att',  lbl:'D) Ratei e risconti attivi',t:'v'},
  {id:'_TATT',  lbl:'TOTALE ATTIVO',t:'s'},
];

const SP_PASSIVO = [
  {id:'_HPASS',lbl:'PASSIVO E PATRIMONIO NETTO',t:'h'},
  {id:'APN_cs', lbl:'A Capitale sociale',t:'v'},
  {id:'APN_ris',lbl:'A Riserve',t:'v'},
  {id:'APN_ut', lbl:'A Utile/perdita esercizio',t:'v'},
  {id:'_TPN',   lbl:'A) Totale patrimonio netto',t:'sub'},
  {id:'B_fondi',lbl:'B) Fondi per rischi e oneri',t:'v'},
  {id:'C_tfr',  lbl:'C) Fondo TFR',t:'v'},
  {id:'D_lt',   lbl:'D) Debiti a lungo termine',t:'v'},
  {id:'D_fin',  lbl:'D) Debiti finanziari a breve',t:'v'},
  {id:'D_forni',lbl:'D) Debiti verso fornitori',t:'v'},
  {id:'D_trib', lbl:'D) Debiti tributari',t:'v'},
  {id:'D_prev', lbl:'D) Debiti v/ist. prev.',t:'v'},
  {id:'D_altri',lbl:'D) Altri debiti',t:'v'},
  {id:'_TDEB',  lbl:'D) Totale debiti',t:'sub'},
  {id:'E_pass', lbl:'E) Ratei e risconti passivi',t:'v'},
  {id:'_TPASS', lbl:'TOTALE PASSIVO E PN',t:'s'},
];

// ── KPI DEFINITIONS ──────────────────────────────────────────
const KPI_DEFS = [
  // Liquidità
  {id:'current_ratio',  grp:'liquidita',  fmt:'x',
   fn:(y,h,aY)=>{ const d=_sp(y,'_DCT'); return d?(_sp(y,'_CIV')+_sp(y,'_CII')+_sp(y,'_CI'))/d:null; }},
  {id:'quick_ratio',    grp:'liquidita',  fmt:'x',
   fn:(y,h,aY)=>{ const d=_sp(y,'_DCT'); return d?(_sp(y,'_CIV')+_sp(y,'_CII'))/d:null; }},
  {id:'cash_ratio',     grp:'liquidita',  fmt:'x',
   fn:(y,h,aY)=>{ const d=_sp(y,'_DCT'); return d?_sp(y,'_CIV')/d:null; }},
  // Redditività
  {id:'ebitda_margin',  grp:'redditivita',fmt:'%',
   fn:(y,h,aY)=>{ const r=_v(y,h,'_A1'); const e=_v(y,h,'_EBITDA'); return r?(e/r*100):null; }},
  {id:'ros',            grp:'redditivita',fmt:'%',
   fn:(y,h,aY)=>{ const r=_v(y,h,'_A1'); const e=_v(y,h,'_AB');    return r?(e/r*100):null; }},
  {id:'roi',            grp:'redditivita',fmt:'%',
   fn:(y,h,aY)=>{ const a=_sp(y,'_TATT'); const e=_v(y,h,'_AB');   return a?(e/a*100):null; }},
  {id:'roe',            grp:'redditivita',fmt:'%',
   fn:(y,h,aY)=>{ const p=_sp(y,'_TPN'); const u=_v(y,h,'_UTILE'); return p?(u/p*100):null; }},
  // Struttura
  {id:'debt_ratio',     grp:'struttura',  fmt:'%',
   fn:(y,h,aY)=>{ const a=_sp(y,'_TATT'); const d=_sp(y,'_TDEB');  return a?(d/a*100):null; }},
  {id:'autonomia_fin',  grp:'struttura',  fmt:'%',
   fn:(y,h,aY)=>{ const a=_sp(y,'_TATT'); const p=_sp(y,'_TPN');   return a?(p/a*100):null; }},
  {id:'leverage',       grp:'struttura',  fmt:'x',
   fn:(y,h,aY)=>{ const p=_sp(y,'_TPN'); const a=_sp(y,'_TATT');   return p?(a/p):null; }},
  // Sviluppo
  {id:'fatturato_growth',grp:'sviluppo',  fmt:'%',
   fn:(y,h,aY)=>{ const i=aY.indexOf(y); if(i<1)return null; const py=aY[i-1]; const pH=D.hist.includes(py); const rp=pH?_ce(py,'_A1'):D.prevCE[`_A1_${py}`]||0; const r=_v(y,h,'_A1'); return rp?((r-rp)/Math.abs(rp)*100):null; }},
  {id:'ebitda_growth',  grp:'sviluppo',   fmt:'%',
   fn:(y,h,aY)=>{ const i=aY.indexOf(y); if(i<1)return null; const py=aY[i-1]; const pH=D.hist.includes(py); const ep=pH?_ce(py,'_EBITDA'):D.prevCE[`_EBITDA_${py}`]||0; const e=_v(y,h,'_EBITDA'); return ep?((e-ep)/Math.abs(ep)*100):null; }},
];

// Helpers accesso dati
function _ce(y,id){ return D.ce[`${id}_${y}`] || D.ce[`ce_${id.replace('_','')}_${y}_i`] || 0; }
function _sp(y,id){ return D.sp[`${id}_${y}`] || 0; }
function _v(y,isHist,id){
  return isHist ? _ce(y,id) : (D.prevCE[`${id}_${y}`] || _ce(y,id) || 0);
}

// ── CALCOLI CE ───────────────────────────────────────────────
function getCE(id,y){ return (D.ce[`ce_${id}_${y}_i`]||0)+(D.ce[`ce_${id}_${y}_r`]||0); }

function recalcCE(){
  D.hist.forEach(y=>{
    const A1=getCE('A1',y),A2=getCE('A2',y),A3=getCE('A3',y),A4=getCE('A4',y),A5=getCE('A5',y);
    const TA=A1+A2+A3+A4+A5;
    const B6=getCE('B6',y),B7=getCE('B7',y),B8=getCE('B8',y);
    const T9=getCE('B9a',y)+getCE('B9b',y)+getCE('B9c',y)+getCE('B9d',y)+getCE('B9e',y);
    const T10=getCE('B10a',y)+getCE('B10b',y)+getCE('B10c',y)+getCE('B10d',y);
    const B11=getCE('B11',y),B12=getCE('B12',y),B13=getCE('B13',y),B14=getCE('B14',y);
    const TB=B6+B7+B8+T9+T10+B11+B12+B13+B14;
    const ebit=TA-TB;
    const C15=getCE('C15',y),C16=getCE('C16',y),C17=getCE('C17',y),C18=getCE('C18',y),C19=getCE('C19',y);
    const D20=getCE('D20',y),D21=getCE('D21',y);
    const ebt=ebit+C15+C16-C17+C18-C19+D20-D21;
    const E22=getCE('E22',y);
    const utile=ebt-E22;
    const amm=getCE('B10a',y)+getCE('B10b',y);
    D.ce[`_TA_${y}`]=TA; D.ce[`_T9_${y}`]=T9; D.ce[`_T10_${y}`]=T10;
    D.ce[`_TB_${y}`]=TB; D.ce[`_AB_${y}`]=ebit; D.ce[`_EBT_${y}`]=ebt;
    D.ce[`_UTILE_${y}`]=utile; D.ce[`_EBITDA_${y}`]=ebit+amm;
    D.ce[`_A1_${y}`]=A1;
  });
}

function recalcSP(){
  D.hist.forEach(y=>{
    const imm=_getSP('AI_imm',y)+_getSP('AI_mat',y)+_getSP('AI_fin',y);
    const circ=_getSP('CI_rim',y)+_getSP('CII_cred',y)+_getSP('CII_trib',y)+_getSP('CIII_fin',y)+_getSP('CIV_liq',y);
    const tAtt=imm+circ+_getSP('D_att',y);
    const pn=_getSP('APN_cs',y)+_getSP('APN_ris',y)+_getSP('APN_ut',y);
    const dct=_getSP('D_fin',y)+_getSP('D_forni',y)+_getSP('D_trib',y)+_getSP('D_prev',y)+_getSP('D_altri',y);
    const dlt=_getSP('D_lt',y);
    const tDeb=pn?0:0+_getSP('B_fondi',y)+_getSP('C_tfr',y)+dlt+dct;
    const tPass=pn+tDeb+_getSP('E_pass',y);
    D.sp[`_TIMM_${y}`]=imm; D.sp[`_TCIRC_${y}`]=circ; D.sp[`_TATT_${y}`]=tAtt;
    D.sp[`_TPN_${y}`]=pn; D.sp[`_TDEB_${y}`]=tDeb; D.sp[`_TPASS_${y}`]=tPass;
    D.sp[`_DCT_${y}`]=dct; D.sp[`_CIV_${y}`]=_getSP('CIV_liq',y);
    D.sp[`_CII_${y}`]=_getSP('CII_cred',y); D.sp[`_CI_${y}`]=_getSP('CI_rim',y);
  });
}
function _getSP(id,y){ return (D.sp[`sp_${id}_${y}_i`]||0)+(D.sp[`sp_${id}_${y}_r`]||0); }

function recalcPrev(){
  D.prev.forEach((y,i)=>{
    const prevY=i===0?D.hist[4]:D.prev[i-1];
    const isHP=D.hist.includes(prevY);
    const getBase=(id)=>isHP?(D.ce[`_${id}_${prevY}`]||0):(D.prevCE[`_${id}_${prevY}`]||0);
    const getGrowth=(id)=>{
      const k=`${id}_${y}`;
      const m=D.prevMode[id]||'pct';
      if(m==='abs') return { abs:D.prevAbs[k]||0 };
      const g=(D.prevGrowth[k]||0)/100;
      return { pct:g };
    };
    const apply=(id,base)=>{ const g=getGrowth(id); return g.abs!==undefined?g.abs:base*(1+g.pct); };
    const a1=apply('A1',getBase('A1'));
    const ta=apply('_TA',getBase('_TA'));
    const tb=apply('_TB',getBase('_TB'));
    const ebit=ta-tb;
    const amm=(D.ce[`_T10_${D.hist[4]}`]||0);
    D.prevCE[`_A1_${y}`]=a1;
    D.prevCE[`_TA_${y}`]=ta;
    D.prevCE[`_TB_${y}`]=tb;
    D.prevCE[`_AB_${y}`]=ebit;
    D.prevCE[`_EBITDA_${y}`]=ebit+amm;
    D.prevCE[`_EBT_${y}`]=ebit;
    D.prevCE[`_UTILE_${y}`]=ebit*0.78;
  });
}

function recalcAll(){ recalcCE(); recalcSP(); recalcPrev(); }

// ── CALCOLO % AUTO PREVISIONALI ──────────────────────────────
function calcAutoGrowth(){
  recalcCE();
  const voceIds=['A1','B6','B7','B8','_T9','B10a','B10b','B14','C17'];
  D.prev.forEach(py=>{
    voceIds.forEach(id=>{
      const vals=D.hist.map(y=>D.ce[`_${id}_${y}`]||getCE(id.replace('_',''),y)||0).filter(v=>v!==0);
      if(vals.length<2)return;
      let diffs=[];
      for(let i=1;i<vals.length;i++){
        if(vals[i-1]!==0) diffs.push((vals[i]-vals[i-1])/Math.abs(vals[i-1]));
      }
      if(!diffs.length)return;
      const avg=diffs.reduce((a,b)=>a+b,0)/diffs.length;
      D.prevGrowth[`${id}_${py}`]=parseFloat((avg*100).toFixed(2));
      D.prevMode[id]='pct';
    });
  });
}

// ── LINGUA ───────────────────────────────────────────────────
const LANG = {
  it:{
    stress_var_ricavi:'Ricavi vendite', stress_var_mp:'Costo materie prime',
    stress_var_personale:'Costo del personale', stress_var_servizi:'Costo servizi',
    stress_var_prezzo:'Prezzo medio vendita',
    kpi_grp_liquidita:'Liquidità', kpi_grp_redditivita:'Redditività',
    kpi_grp_struttura:'Struttura finanziaria', kpi_grp_sviluppo:'Sviluppo',
    kpi:{
      current_ratio:  {title:'Current Ratio',def:'Capacità di far fronte alle obbligazioni a breve con le attività correnti.',formula:'Attivo Corrente / Passivo Corrente',soglie:'> 2: ottimale · 1-2: accettabile · < 1: rischio'},
      quick_ratio:    {title:'Quick Ratio',def:'Liquidità senza le rimanenze.',formula:'(Att. Corrente - Rimanenze) / Passivo Corrente',soglie:'> 1: buona · 0.5-1: sufficiente · < 0.5: attenzione'},
      cash_ratio:     {title:'Cash Ratio',def:'Copertura debiti a breve con sole disponibilità liquide.',formula:'Liquidità / Passivo Corrente',soglie:'> 0.5: ottimo · 0.2-0.5: buono · < 0.2: basso'},
      ebitda_margin:  {title:'EBITDA Margin',def:'Percentuale di ricavi che diventa EBITDA.',formula:'EBITDA / Ricavi × 100',soglie:'> 20%: eccellente · 10-20%: buono · < 10%: basso'},
      ros:            {title:'ROS',def:'Redditività delle vendite.',formula:'EBIT / Ricavi × 100',soglie:'> 10%: ottimo · 5-10%: buono · < 5%: basso'},
      roi:            {title:'ROI',def:'Rendimento del capitale investito.',formula:'EBIT / Totale Attivo × 100',soglie:'> 10%: eccellente · 5-10%: buono · < 5%: basso'},
      roe:            {title:'ROE',def:'Rendimento del patrimonio netto.',formula:'Utile Netto / Patrimonio Netto × 100',soglie:'> 15%: ottimo · 8-15%: buono · < 8%: basso'},
      debt_ratio:     {title:'Debt Ratio',def:'Proporzione del totale attivo finanziata da debiti.',formula:'Totale Debiti / Totale Attivo × 100',soglie:'< 40%: solida autonomia · 40-70%: normale · > 70%: rischio'},
      autonomia_fin:  {title:'Indice di autonomia finanziaria',def:'Proporzione del totale attivo finanziata da capitale proprio.',formula:'Patrimonio Netto / Totale Attivo × 100',soglie:'> 60%: ottima · 40-60%: buona · < 40%: bassa'},
      leverage:       {title:'Leverage Ratio',def:'Leva finanziaria dell\'azienda.',formula:'Totale Attivo / Patrimonio Netto',soglie:'< 2: bassa leva · 2-4: media · > 4: alta leva'},
      fatturato_growth:{title:'Tasso crescita fatturato',def:'Variazione % dei ricavi rispetto all\'anno precedente.',formula:'(Ricavi N - Ricavi N-1) / |Ricavi N-1| × 100',soglie:'> 10%: forte · 0-10%: moderata · < 0%: contrazione'},
      ebitda_growth:  {title:'Tasso crescita EBITDA',def:'Variazione % dell\'EBITDA rispetto all\'anno precedente.',formula:'(EBITDA N - EBITDA N-1) / |EBITDA N-1| × 100',soglie:'> 15%: forte · 0-15%: moderata · < 0%: contrazione'},
    },
    report:{
      cover_subtitle:'Relazione Business Plan',
      sec_anagrafica:'Anagrafica aziendale', sec_ce_stor:'Conto economico storico',
      sec_ce_prev:'Conto economico previsionale', sec_kpi:'KPI & Indici finanziari',
      sec_stress:'Stress test finanziario', sec_ap:'Action Plan',
      storico:'Storico', previsionale:'Previsionale', variazione:'Variazione',
      anno:'Anno', voce:'Voce', valore:'Valore',
    }
  },
  en:{
    stress_var_ricavi:'Revenue', stress_var_mp:'Raw materials cost',
    stress_var_personale:'Personnel cost', stress_var_servizi:'Services cost',
    stress_var_prezzo:'Average selling price',
    kpi_grp_liquidita:'Liquidity', kpi_grp_redditivita:'Profitability',
    kpi_grp_struttura:'Financial structure', kpi_grp_sviluppo:'Growth',
    kpi:{
      current_ratio:  {title:'Current Ratio',def:'Ability to meet short-term obligations with current assets.',formula:'Current Assets / Current Liabilities',soglie:'> 2: optimal · 1-2: acceptable · < 1: risk'},
      quick_ratio:    {title:'Quick Ratio',def:'Liquidity excluding inventories.',formula:'(Current Assets - Inventories) / Current Liabilities',soglie:'> 1: good · 0.5-1: sufficient · < 0.5: caution'},
      cash_ratio:     {title:'Cash Ratio',def:'Coverage of short-term debt with cash only.',formula:'Cash / Current Liabilities',soglie:'> 0.5: excellent · 0.2-0.5: good · < 0.2: low'},
      ebitda_margin:  {title:'EBITDA Margin',def:'Percentage of revenues becoming EBITDA.',formula:'EBITDA / Revenue × 100',soglie:'> 20%: excellent · 10-20%: good · < 10%: low'},
      ros:            {title:'ROS',def:'Operating profitability of sales.',formula:'EBIT / Revenue × 100',soglie:'> 10%: excellent · 5-10%: good · < 5%: low'},
      roi:            {title:'ROI',def:'Return on invested capital.',formula:'EBIT / Total Assets × 100',soglie:'> 10%: excellent · 5-10%: good · < 5%: low'},
      roe:            {title:'ROE',def:'Return on equity.',formula:'Net Income / Equity × 100',soglie:'> 15%: excellent · 8-15%: good · < 8%: low'},
      debt_ratio:     {title:'Debt Ratio',def:'Proportion of total assets financed by debt.',formula:'Total Debt / Total Assets × 100',soglie:'< 40%: solid · 40-70%: normal · > 70%: risk'},
      autonomia_fin:  {title:'Financial autonomy index',def:'Proportion of total assets financed by equity.',formula:'Equity / Total Assets × 100',soglie:'> 60%: excellent · 40-60%: good · < 40%: low'},
      leverage:       {title:'Leverage Ratio',def:'Financial leverage of the company.',formula:'Total Assets / Equity',soglie:'< 2: low · 2-4: medium · > 4: high'},
      fatturato_growth:{title:'Revenue growth rate',def:'Year-on-year revenue change.',formula:'(Revenue N - Revenue N-1) / |Revenue N-1| × 100',soglie:'> 10%: strong · 0-10%: moderate · < 0%: contraction'},
      ebitda_growth:  {title:'EBITDA growth rate',def:'Year-on-year EBITDA change.',formula:'(EBITDA N - EBITDA N-1) / |EBITDA N-1| × 100',soglie:'> 15%: strong · 0-15%: moderate · < 0%: contraction'},
    },
    report:{
      cover_subtitle:'Business Plan Report',
      sec_anagrafica:'Company profile', sec_ce_stor:'Historical income statement',
      sec_ce_prev:'Forecast income statement', sec_kpi:'KPI & Financial ratios',
      sec_stress:'Financial stress test', sec_ap:'Action Plan',
      storico:'Historical', previsionale:'Forecast', variazione:'Change',
      anno:'Year', voce:'Item', valore:'Value',
    }
  },
  es:{
    stress_var_ricavi:'Ingresos', stress_var_mp:'Coste materias primas',
    stress_var_personale:'Coste personal', stress_var_servizi:'Coste servicios',
    stress_var_prezzo:'Precio medio venta',
    kpi_grp_liquidita:'Liquidez', kpi_grp_redditivita:'Rentabilidad',
    kpi_grp_struttura:'Estructura financiera', kpi_grp_sviluppo:'Crecimiento',
    kpi:{
      current_ratio:  {title:'Current Ratio',def:'Capacidad de hacer frente a obligaciones a corto plazo.',formula:'Activo Corriente / Pasivo Corriente',soglie:'> 2: óptimo · 1-2: aceptable · < 1: riesgo'},
      quick_ratio:    {title:'Quick Ratio',def:'Liquidez excluyendo existencias.',formula:'(Activo Corriente - Existencias) / Pasivo Corriente',soglie:'> 1: bueno · 0.5-1: suficiente · < 0.5: atención'},
      cash_ratio:     {title:'Cash Ratio',def:'Cobertura de deuda a corto solo con efectivo.',formula:'Efectivo / Pasivo Corriente',soglie:'> 0.5: excelente · 0.2-0.5: bueno · < 0.2: bajo'},
      ebitda_margin:  {title:'Margen EBITDA',def:'Porcentaje de ingresos convertido en EBITDA.',formula:'EBITDA / Ingresos × 100',soglie:'> 20%: excelente · 10-20%: bueno · < 10%: bajo'},
      ros:            {title:'ROS',def:'Rentabilidad operativa de las ventas.',formula:'EBIT / Ingresos × 100',soglie:'> 10%: excelente · 5-10%: bueno · < 5%: bajo'},
      roi:            {title:'ROI',def:'Rendimiento del capital invertido.',formula:'EBIT / Total Activo × 100',soglie:'> 10%: excelente · 5-10%: bueno · < 5%: bajo'},
      roe:            {title:'ROE',def:'Rentabilidad sobre recursos propios.',formula:'Beneficio Neto / Patrimonio × 100',soglie:'> 15%: excelente · 8-15%: bueno · < 8%: bajo'},
      debt_ratio:     {title:'Ratio de endeudamiento',def:'Proporción del activo financiada con deuda.',formula:'Deuda Total / Activo Total × 100',soglie:'< 40%: sólido · 40-70%: normal · > 70%: riesgo'},
      autonomia_fin:  {title:'Índice de autonomía financiera',def:'Proporción del activo financiada con recursos propios.',formula:'Patrimonio / Activo Total × 100',soglie:'> 60%: excelente · 40-60%: buena · < 40%: baja'},
      leverage:       {title:'Ratio de apalancamiento',def:'Apalancamiento financiero de la empresa.',formula:'Activo Total / Patrimonio',soglie:'< 2: bajo · 2-4: medio · > 4: alto'},
      fatturato_growth:{title:'Tasa de crecimiento de ingresos',def:'Variación interanual de ingresos.',formula:'(Ing. N - Ing. N-1) / |Ing. N-1| × 100',soglie:'> 10%: fuerte · 0-10%: moderado · < 0%: contracción'},
      ebitda_growth:  {title:'Tasa de crecimiento EBITDA',def:'Variación interanual del EBITDA.',formula:'(EBITDA N - EBITDA N-1) / |EBITDA N-1| × 100',soglie:'> 15%: fuerte · 0-15%: moderado · < 0%: contracción'},
    },
    report:{
      cover_subtitle:'Informe Plan de Negocio',
      sec_anagrafica:'Perfil empresarial', sec_ce_stor:'Cuenta de resultados histórica',
      sec_ce_prev:'Cuenta de resultados previsional', sec_kpi:'KPI & Ratios financieros',
      sec_stress:'Test de estrés financiero', sec_ap:'Plan de acción',
      storico:'Histórico', previsionale:'Previsión', variazione:'Variación',
      anno:'Año', voce:'Partida', valore:'Valor',
    }
  },
  fr:{
    stress_var_ricavi:'Chiffre d\'affaires', stress_var_mp:'Coût matières premières',
    stress_var_personale:'Coût personnel', stress_var_servizi:'Coût services',
    stress_var_prezzo:'Prix moyen de vente',
    kpi_grp_liquidita:'Liquidité', kpi_grp_redditivita:'Rentabilité',
    kpi_grp_struttura:'Structure financière', kpi_grp_sviluppo:'Croissance',
    kpi:{
      current_ratio:  {title:'Current Ratio',def:'Capacité à faire face aux obligations à court terme.',formula:'Actif Courant / Passif Courant',soglie:'> 2: optimal · 1-2: acceptable · < 1: risque'},
      quick_ratio:    {title:'Quick Ratio',def:'Liquidité hors stocks.',formula:'(Actif Courant - Stocks) / Passif Courant',soglie:'> 1: bon · 0.5-1: suffisant · < 0.5: attention'},
      cash_ratio:     {title:'Cash Ratio',def:'Couverture des dettes à court terme par les liquidités.',formula:'Liquidités / Passif Courant',soglie:'> 0.5: excellent · 0.2-0.5: bon · < 0.2: faible'},
      ebitda_margin:  {title:'Marge EBITDA',def:'Pourcentage des revenus converti en EBITDA.',formula:'EBITDA / Revenus × 100',soglie:'> 20%: excellent · 10-20%: bon · < 10%: faible'},
      ros:            {title:'ROS',def:'Rentabilité opérationnelle des ventes.',formula:'EBIT / Revenus × 100',soglie:'> 10%: excellent · 5-10%: bon · < 5%: faible'},
      roi:            {title:'ROI',def:'Rendement du capital investi.',formula:'EBIT / Total Actif × 100',soglie:'> 10%: excellent · 5-10%: bon · < 5%: faible'},
      roe:            {title:'ROE',def:'Rentabilité des capitaux propres.',formula:'Résultat Net / Capitaux Propres × 100',soglie:'> 15%: excellent · 8-15%: bon · < 8%: faible'},
      debt_ratio:     {title:'Ratio d\'endettement',def:'Part de l\'actif financée par des dettes.',formula:'Total Dettes / Total Actif × 100',soglie:'< 40%: solide · 40-70%: normal · > 70%: risque'},
      autonomia_fin:  {title:'Indice d\'autonomie financière',def:'Part de l\'actif financée par les capitaux propres.',formula:'Capitaux Propres / Total Actif × 100',soglie:'> 60%: excellent · 40-60%: bon · < 40%: faible'},
      leverage:       {title:'Ratio de levier',def:'Levier financier de l\'entreprise.',formula:'Total Actif / Capitaux Propres',soglie:'< 2: faible · 2-4: moyen · > 4: élevé'},
      fatturato_growth:{title:'Taux de croissance du CA',def:'Variation du chiffre d\'affaires.',formula:'(CA N - CA N-1) / |CA N-1| × 100',soglie:'> 10%: forte · 0-10%: modérée · < 0%: contraction'},
      ebitda_growth:  {title:'Taux de croissance EBITDA',def:'Variation de l\'EBITDA.',formula:'(EBITDA N - EBITDA N-1) / |EBITDA N-1| × 100',soglie:'> 15%: forte · 0-15%: modérée · < 0%: contraction'},
    },
    report:{
      cover_subtitle:'Rapport Business Plan',
      sec_anagrafica:'Profil de l\'entreprise', sec_ce_stor:'Compte de résultat historique',
      sec_ce_prev:'Compte de résultat prévisionnel', sec_kpi:'KPI & Ratios financiers',
      sec_stress:'Test de stress financier', sec_ap:'Plan d\'action',
      storico:'Historique', previsionale:'Prévision', variazione:'Variation',
      anno:'Année', voce:'Élément', valore:'Valeur',
    }
  }
};

function t(key){ return LANG[D.lang]?.[key] || LANG.it[key] || key; }
function tkpi(id){ return LANG[D.lang]?.kpi?.[id] || LANG.it.kpi?.[id] || {title:id,def:'',formula:'',soglie:''}; }
function trep(key){ return LANG[D.lang]?.report?.[key] || LANG.it.report?.[key] || key; }
function tvar(id){ return LANG[D.lang]?.[`stress_var_${id}`] || LANG.it[`stress_var_${id}`] || id; }
function tgrp(g){ return LANG[D.lang]?.[`kpi_grp_${g}`] || LANG.it[`kpi_grp_${g}`] || g; }

// ── UTILS ────────────────────────────────────────────────────
function fmtN(n){
  if(n===null||n===undefined) return '—';
  return n.toLocaleString('it-IT',{minimumFractionDigits:0,maximumFractionDigits:1});
}
function fmtC(n){
  if(n===null||n===undefined) return '—';
  return '€ '+fmtN(n);
}
function pct(n){ return n!==null&&!isNaN(n)?(n*100).toFixed(1)+'%':'—'; }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function v(id){ return document.getElementById(id)?.value||''; }

// ── SAVE / LOAD ──────────────────────────────────────────────
async function loadAziende(){
  const uid=SESSION.user?.id; if(!uid)return [];
  try{ return await SB.select('aziende',`user_id=eq.${uid}&order=updated_at.desc`); }catch{return [];}
}

function collectAppData(){
  const fields={};
  document.querySelectorAll('input[id],select[id],textarea[id]').forEach(el=>{
    const skip=['login-user','login-pwd','reg-nome','reg-user','reg-pwd','reg-pwd2','import-file-tpl','import-file-bp','import-file-custom'];
    if(skip.includes(el.id))return;
    if(el.type==='checkbox')fields[el.id]=el.checked;
    else fields[el.id]=el.value;
  });
  return {
    meta:{ragione_sociale:fields['c-rs']||SESSION.currentNome},
    fields,
    D_ce:D.ce,D_sp:D.sp,D_prevGrowth:D.prevGrowth,D_prevAbs:D.prevAbs,D_prevMode:D.prevMode,
    D_loans:D.loans,D_lav4:D.lav4,D_swot:D.swot,D_tam:D.tam,
    D_apRows:D.apRows,D_mods:[...D.mods],D_kpiTexts:D.kpiTexts,D_stress:D.stress,
    D_hist:D.hist,D_prev:D.prev,D_nPrev:D.nPrev,D_lang:D.lang,
  };
}

function loadDataIntoApp(data){
  if(!data)return;
  if(data.D_lang) D.lang=data.D_lang;
  if(data.D_hist) D.hist=[...data.D_hist];
  if(data.D_prev) D.prev=[...data.D_prev];
  if(data.D_nPrev) D.nPrev=data.D_nPrev;
  if(data.D_ce) Object.assign(D.ce,data.D_ce);
  if(data.D_sp) Object.assign(D.sp,data.D_sp);
  if(data.D_prevGrowth) Object.assign(D.prevGrowth,data.D_prevGrowth);
  if(data.D_prevAbs) Object.assign(D.prevAbs,data.D_prevAbs);
  if(data.D_prevMode) Object.assign(D.prevMode,data.D_prevMode);
  if(data.D_loans) D.loans.splice(0,D.loans.length,...data.D_loans);
  if(data.D_lav4) data.D_lav4.forEach((s,i)=>{if(D.lav4[i])Object.assign(D.lav4[i],s);});
  if(data.D_swot) Object.assign(D.swot,data.D_swot);
  if(data.D_tam) Object.assign(D.tam,data.D_tam);
  if(data.D_apRows) D.apRows.splice(0,D.apRows.length,...data.D_apRows);
  if(data.D_mods){D.mods.clear();data.D_mods.forEach(m=>D.mods.add(m));}
  if(data.D_kpiTexts) Object.assign(D.kpiTexts,data.D_kpiTexts);
  if(data.D_stress) Object.assign(D.stress,data.D_stress);
  if(data.fields){
    Object.entries(data.fields).forEach(([id,val])=>{
      const el=document.getElementById(id);
      if(!el)return;
      if(el.type==='checkbox')el.checked=!!val;
      else el.value=val||'';
    });
  }
}

async function saveData(){
  if(!SESSION.currentDbId)return;
  const data=collectAppData();
  return SB.upsert('aziende',{
    id:SESSION.currentDbId,user_id:SESSION.user.id,
    nome:SESSION.currentNome,slug:SESSION.currentSlug,
    data,updated_at:new Date().toISOString()
  });
}

// ── EXPORT TEMPLATE EXCEL ────────────────────────────────────
function exportTemplate(){
  if(typeof XLSX==='undefined'){alert('XLSX non ancora caricato');return;}
  const wb=XLSX.utils.book_new();
  const rs=document.getElementById('c-rs')?.value||'Azienda';
  const allYrs=[...D.hist,...D.prev];
  allYrs.forEach(yr=>{
    const rows=[['Codice','Descrizione','Saldo','Note'],['','--- CONTO ECONOMICO ---','','']];
    CE_ROWS.filter(r=>r.t==='v').forEach(r=>{
      const val=D.ce[`_${r.id}_${yr}`]||D.ce[`ce_${r.id}_${yr}_i`]||'';
      rows.push([r.id,r.lbl,val===''?'':val,'']);
    });
    rows.push(['','--- STATO PATRIMONIALE ATTIVO ---','','']);
    SP_ATTIVO.filter(r=>r.t==='v').forEach(r=>{
      const val=D.sp[`sp_${r.id}_${yr}_i`]||'';
      rows.push([r.id,r.lbl,val===''?'':val,'']);
    });
    rows.push(['','--- STATO PATRIMONIALE PASSIVO ---','','']);
    SP_PASSIVO.filter(r=>r.t==='v').forEach(r=>{
      const val=D.sp[`sp_${r.id}_${yr}_i`]||'';
      rows.push([r.id,r.lbl,val===''?'':val,'']);
    });
    const ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:14},{wch:52},{wch:14},{wch:18}];
    XLSX.utils.book_append_sheet(wb,ws,String(yr));
  });
  const info=[['BP Generator — Template dati'],['Azienda:',rs],['Generato:',new Date().toLocaleDateString('it-IT')],[''],['Istruzioni:'],['1. Ogni foglio = un anno'],['2. Col A = Codice conto (non modificare)'],['3. Col B = Descrizione (non modificare)'],['4. Col C = Saldo da inserire'],['5. Reimporta con Import Excel → Modalità Template']];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(info),'Info');
  XLSX.writeFile(wb,`Template_BP_${rs.replace(/[^a-zA-Z0-9]/g,'_')}.xlsx`);
}

// ── IMPORT EXCEL ─────────────────────────────────────────────
function buildCodeMap(){
  const m={};
  const map={
    'A1':['ricavi delle vendite','revenues from sales','ingresos por ventas','chiffre d\'affaires'],
    'A5':['altri ricavi','other revenues','otros ingresos','autres produits'],
    'B6':['materie prime','raw materials','materias primas','matières premières'],
    'B7':['per servizi','services','servicios','services'],
    'B8':['godimento beni di terzi','rental','alquiler','location'],
    'B9a':['salari e stipendi','wages and salaries','salarios','salaires'],
    'B9b':['oneri sociali','social charges','cargas sociales','charges sociales'],
    'B9c':['trattamento di fine rapporto','tfr','severance pay'],
    'B10a':['ammortamento immateriali','amortisation','amortización'],
    'B10b':['ammortamento materiali','depreciation','depreciación','dotations'],
    'B12':['accantonamento per rischi','provisions for risks'],
    'B14':['oneri diversi di gestione','other operating costs','otros gastos','autres charges'],
    'C17':['interessi e oneri finanziari','interest expense','gastos financieros','charges financières'],
    'E22':['imposte sul reddito','income taxes','impuestos','impôts'],
  };
  Object.entries(map).forEach(([id,keys])=>keys.forEach(k=>{ m[k.toLowerCase()]=id; }));
  return m;
}

function parseWorkbook(wb){
  const result={anni:{},ce:{},sp:{},anagrafica:{}};
  const home=wb.Sheets['Home'];
  if(home){
    const range=XLSX.utils.decode_range(home['!ref']||'A1:Z50');
    let found=[];
    for(let r=range.s.r;r<=range.e.r;r++)
      for(let c=range.s.c;c<=range.e.c;c++){
        const vv=home[XLSX.utils.encode_cell({r,c})]?.v;
        if(typeof vv==='number'&&vv>2000&&vv<2050&&!found.includes(vv))found.push(vv);
      }
    found.sort();
    ['y1','y2','y3','y4','ya'].forEach((k,i)=>{if(found[i])result.anni[k]=found[i];});
  }
  const cli1=wb.Sheets['Cli1'];
  if(cli1){
    const rows=XLSX.utils.sheet_to_json(cli1,{header:1,defval:''});
    const fieldMap={'Ragione sociale:':'c-rs','Partita IVA':'c-piva','Codice Fiscale:':'c-cf','Settore di mercato':'c-sett','Area geografica':'c-geo','Modello di business':'c-biz'};
    rows.forEach(row=>row.forEach((cell,ci)=>{
      const s=String(cell||'').trim();
      Object.entries(fieldMap).forEach(([k,id])=>{
        if(s.includes(k)){const nxt=String(row[ci+1]||'').trim();if(nxt)result.anagrafica[id]=nxt;}
      });
    }));
  }
  const cli2=wb.Sheets['Cli2'];
  if(cli2){
    const rows=XLSX.utils.sheet_to_json(cli2,{header:1,defval:''});
    const fmap={'Indirizzo:':'sl-ind','N.civico:':'sl-civ','CAP:':'sl-cap','Comune:':'sl-com','Provincia:':'sl-prov','Mail:':'sl-mail'};
    rows.forEach(row=>row.forEach((cell,ci)=>{
      const s=String(cell||'').trim();
      if(fmap[s]){const nxt=String(row[ci+1]||'').trim();if(nxt)result.anagrafica[fmap[s]]=nxt;}
    }));
  }
  const lav3=wb.Sheets['Lav_3'];
  if(lav3){
    const rows=XLSX.utils.sheet_to_json(lav3,{header:1,defval:''});
    const CE_MAP={
      'Ricavi delle vendite':'A1','Var. rim. Prodotti in corso di lav.,sem, p.f':'A2',
      'Per materie prime, sussidiarie, di consumo e merci':'B6','Per servizi':'B7','Per godimento beni di terzi':'B8',
      'a) salari e stipendi':'B9a','b) oneri sociali':'B9b','c) trattamento di fine rapporto':'B9c',
      'a) ammortamento delle immobilizzazioni immateriali':'B10a','b) ammortamento delle immobilizzazioni materiali':'B10b',
      'Accantonamento per rischi':'B12','Oneri diversi di gestione':'B14',
      'Interessi e oneri finanziari':'C17','Imposte sul reddito dell\'esercizio':'E22',
    };
    const SP_MAP={
      'Impianti e macchinari':'AI_mat','Terreni e fabbricati':'AI_mat',
      'Prodotti finiti e merci':'CI_rim','Crediti verso clienti (EE)':'CII_cred',
      'Crediti verso clienti (OE)':'CII_cred','Depositi bancari e postali':'CIV_liq',
      'Denaro e valori in cassa':'CIV_liq','Capitale sociale':'APN_cs',
      'Utile (perdita) dell\'esercizio':'APN_ut','Fondo T.F.R.':'C_tfr',
      'Debiti verso banche (EE)':'D_lt','Debiti verso fornitori (EE)':'D_forni',
      'Debiti tributari (EE)':'D_trib','Altri debiti (EE)':'D_altri',
    };
    let yearCols=[];
    rows.forEach(row=>{
      if(yearCols.length)return;
      const yrs=row.map((v2,ci)=>({v:v2,ci})).filter(x=>typeof x.v==='number'&&x.v>2000&&x.v<2050);
      if(yrs.length>=3)yearCols=yrs.map(x=>({year:x.v,colBase:x.ci}));
    });
    rows.forEach(row=>{
      let lbl='';
      for(let ci=0;ci<row.length;ci++){
        const vv=String(row[ci]||'').trim();
        if(vv&&vv.length>2&&!/^\d/.test(vv)&&!['FALSE','TRUE','Immateriale','Materiale'].includes(vv)){lbl=vv;break;}
      }
      if(!lbl)return;
      const ceId=CE_MAP[lbl],spId=SP_MAP[lbl];
      if(!ceId&&!spId)return;
      yearCols.forEach(yc=>{
        const saldo=row[yc.colBase+2];
        const n=typeof saldo==='number'?saldo:(parseFloat(String(saldo||''))||0);
        if(n===0)return;
        if(ceId)result.ce[`ce_${ceId}_${yc.year}_i`]=n;
        if(spId){const k=`sp_${spId}_${yc.year}_i`;result.sp[k]=(result.sp[k]||0)+n;}
      });
    });
  }
  return result;
}

// ── KPI COMMENTO AUTO ────────────────────────────────────────
function genKpiComment(kpiId,vals,yrs){
  const valid=vals.map((v2,i)=>({v:v2,y:yrs[i]})).filter(x=>x.v!==null&&!isNaN(x.v));
  if(!valid.length)return '';
  const max=valid.reduce((a,b)=>a.v>b.v?a:b);
  const min=valid.reduce((a,b)=>a.v<b.v?a:b);
  const last=valid[valid.length-1];
  const first=valid[0];
  const k=tkpi(kpiId);
  const trend=last.v>first.v?
    {it:'crescente',en:'increasing',es:'creciente',fr:'croissant'}[D.lang]:
    {it:'decrescente',en:'decreasing',es:'decreciente',fr:'décroissant'}[D.lang];
  const pos=last.v>0;
  if(D.lang==='en')
    return `The ${k.title} shows a ${trend} trend. Max: ${max.y} (${max.v.toFixed(2)}), Min: ${min.y} (${min.v.toFixed(2)}). The final value of ${last.v.toFixed(2)} indicates a ${pos?'generally positive':'critical'} situation. ${k.soglie}`;
  if(D.lang==='es')
    return `El ${k.title} muestra una tendencia ${trend}. Máx: ${max.y} (${max.v.toFixed(2)}), Mín: ${min.y} (${min.v.toFixed(2)}). El valor final de ${last.v.toFixed(2)} indica una situación ${pos?'positiva':'crítica'}. ${k.soglie}`;
  if(D.lang==='fr')
    return `Le ${k.title} montre une tendance ${trend}. Max: ${max.y} (${max.v.toFixed(2)}), Min: ${min.y} (${min.v.toFixed(2)}). La valeur finale de ${last.v.toFixed(2)} indique une situation ${pos?'positive':'critique'}. ${k.soglie}`;
  return `L'indicatore ${k.title} evidenzia un andamento ${trend} nel periodo. Valore massimo nel ${max.y} (${max.v.toFixed(2)}), minimo nel ${min.y} (${min.v.toFixed(2)}). Il valore finale di ${last.v.toFixed(2)} indica una situazione ${pos?'complessivamente positiva':'che richiede attenzione'}. ${k.soglie}`;
}

// Esporta tutto globalmente
if(typeof window!=='undefined'){
  Object.assign(window,{
    D,SB,SESSION,LANG,CE_ROWS,SP_ATTIVO,SP_PASSIVO,KPI_DEFS,
    saveSession,loadSession,clearSession,loadAziende,
    recalcCE,recalcSP,recalcPrev,recalcAll,getCE,calcAutoGrowth,
    collectAppData,loadDataIntoApp,saveData,
    exportTemplate,buildCodeMap,parseWorkbook,
    t,tkpi,trep,tvar,tgrp,fmtN,fmtC,pct,esc,v,
    genKpiComment,
  });
}
