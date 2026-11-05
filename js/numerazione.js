// Numero d'offerta automatico: PREFISSO-ANNO-PROGRESSIVO (CONFIG.numerazione).
// Pubblicato come Artifact, il progressivo viene da un registro condiviso (capability "db",
// collezione "offerte": un documento per numero, con numero, anno e data — nessun dato del cliente).
// Senza registro (sito pubblicato senza SharePoint, o file in locale) il numero è PREFISSO-ANNO-MMGG, con la data in cui si apre la prima volta l'anteprima del PDF.
// Con Microsoft 365 configurato (CONFIG.microsoft) il numero viene dalla lista SharePoint (js/microsoft.js).

const annoOfferta = (f) => {
  const m = String(f.cmPrev || '').match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : new Date().getFullYear();
};
const progressivo = (n) => String(n).padStart(CONFIG.numerazione.cifre, '0');
const formattaNumero = (anno, n) => CONFIG.numerazione.prefisso + '-' + anno + '-' + progressivo(n);
const partenzaAnno = (anno) => CONFIG.numerazione.partenza[anno] || 1;
const registroCondiviso = () => !!(window.claude && window.claude.use);

// Prenota il primo numero libero dell'anno nel registro condiviso.
// Ogni numero è un documento "offerte/ANNO-NNNN": per prenotarlo si prende un lease breve sul documento,
// si controlla che non esista e lo si crea; se un collega lo sta prendendo si passa al successivo.
async function numeroDaRegistro(anno) {
  const db = await window.claude.use('db');
  if (!db) throw new Error('registro non disponibile');
  const ultimo = await db.collection('offerte').where('anno', '==', anno).orderBy('n', 'desc').limit(1).get();
  let n = Math.max(partenzaAnno(anno), ultimo.empty ? 0 : Number(ultimo.docs[0].data().n) + 1);
  const holder = 'scheda-' + Math.random().toString(36).slice(2);
  for (let tentativi = 0; tentativi < 25; tentativi++, n++) {
    const ref = db.doc('offerte/' + anno + '-' + progressivo(n));
    const lease = await ref.acquire({ holder, ttlMs: 5000 });
    if (!lease.acquired) continue;
    if ((await ref.get()).exists) continue;
    const numero = formattaNumero(anno, n);
    await ref.set({ numero, anno, n, assegnato: new Date().toISOString() });
    return numero;
  }
  throw new Error('nessun numero libero trovato');
}

// Numero dalla data di assegnazione (prima anteprima), in formato mmgg (es. 3 novembre → OFF-2026-1103).
// Due offerte create lo stesso giorno hanno lo stesso numero.
function numeroDaDataLocale(anno) {
  const oggi = new Date(), due = (n) => String(n).padStart(2, '0');
  return CONFIG.numerazione.prefisso + '-' + anno + '-' + due(oggi.getMonth() + 1) + due(oggi.getDate());
}

// Restituisce il numero assegnato, oppure null se il registro non risponde.
// Ordine: lista SharePoint (se configurata) → registro dell'Artifact su claude.ai → contatore locale.
async function nuovoNumeroOfferta(f) {
  const anno = annoOfferta(f);
  if (msConfigurato()) {
    if (!msCollegato()) return null;
    try { const r = await numeroDaSharePoint(f); f.spId = r.id; return r.numero; }
    catch (e) { console.error(e); return null; }
  }
  if (!registroCondiviso()) return numeroDaDataLocale(anno);
  try { return await numeroDaRegistro(anno); }
  catch (e) { return null; }
}
