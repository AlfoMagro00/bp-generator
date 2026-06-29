// _frame.js — helper per le sezioni iframe
// Ogni sezione HTML include questo file per comunicare con app.html

// Riferimento al parent (app.html)
const APP = window.parent !== window ? window.parent : null;

// Ricevi stato iniziale dal parent
window.addEventListener('message', e => {
  if (e.data?.type === 'INIT') {
    // Ripristina D dal parent
    const pd = e.data.D;
    if (!pd) return;
    Object.assign(D.ce, pd.ce || {});
    Object.assign(D.sp, pd.sp || {});
    Object.assign(D.prevGrowth, pd.prevGrowth || {});
    Object.assign(D.prevAbs, pd.prevAbs || {});
    Object.assign(D.prevMode, pd.prevMode || {});
    if (pd.loans) D.loans.splice(0, D.loans.length, ...pd.loans);
    if (pd.lav4) pd.lav4.forEach((s, i) => { if (D.lav4[i]) Object.assign(D.lav4[i], s); });
    if (pd.swot) Object.assign(D.swot, pd.swot);
    if (pd.tam) Object.assign(D.tam, pd.tam);
    if (pd.apRows) D.apRows.splice(0, D.apRows.length, ...pd.apRows);
    if (pd.mods) { D.mods.clear(); pd.mods.forEach(m => D.mods.add(m)); }
    if (pd.kpiTexts) Object.assign(D.kpiTexts, pd.kpiTexts);
    if (pd.stress) Object.assign(D.stress, pd.stress);
    if (pd.hist) D.hist.splice(0, D.hist.length, ...pd.hist);
    if (pd.prev) D.prev.splice(0, D.prev.length, ...pd.prev);
    if (pd.nPrev) D.nPrev = pd.nPrev;
    if (pd.lang) D.lang = pd.lang;
    // Ripristina anche i campi form dalla sezione corrente
    if (pd.fields) {
      Object.entries(pd.fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!val;
        else el.value = val || '';
      });
    }
    if (typeof onInit === 'function') onInit();
  }
  if (e.data?.type === 'LANG') {
    D.lang = e.data.lang;
    if (typeof onLangChange === 'function') onLangChange(e.data.lang);
  }
});

// Invia dati aggiornati al parent
function sendToParent(partialD) {
  if (!APP) return;
  APP.postMessage({ type: 'UPDATE', D: partialD }, '*');
}

// Invia richiesta di salvataggio
function requestSave() {
  if (!APP) return;
  // Prima invia i dati aggiornati
  collectAndSend();
  APP.postMessage({ type: 'SAVE' }, '*');
}

// Naviga a un'altra sezione
function navTo(page) {
  if (!APP) { window.location.href = page + '.html'; return; }
  collectAndSend();
  APP.postMessage({ type: 'NAV', page }, '*');
}

// Adatta altezza iframe al contenuto
function fitHeight() {
  if (!APP) return;
  const h = document.body.scrollHeight;
  APP.postMessage({ type: 'UPDATE', D: {}, resize: h }, '*');
}

// Raccoglie i campi form della sezione e li invia
function collectAndSend() {
  const fields = {};
  document.querySelectorAll('input[id],select[id],textarea[id]').forEach(el => {
    if (el.type === 'checkbox') fields[el.id] = el.checked;
    else fields[el.id] = el.value;
  });
  sendToParent({ fields });
}

// Registra collectAndSend come funzione globale per il parent
window.collectAndSend = collectAndSend;

// Utility: mostra messaggio di stato nella sezione
function showSectionStatus(msg, type = 'ok') {
  let el = document.getElementById('_section-status');
  if (!el) {
    el = document.createElement('div');
    el.id = '_section-status';
    el.style.cssText = 'position:fixed;bottom:16px;right:16px;padding:8px 14px;border-radius:7px;font-size:12.5px;font-weight:500;z-index:999;transition:.3s';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = type === 'ok' ? 'var(--ok-bg)' : 'var(--red-bg)';
  el.style.color = type === 'ok' ? 'var(--ok)' : 'var(--red)';
  el.style.border = '1px solid currentColor';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
}
