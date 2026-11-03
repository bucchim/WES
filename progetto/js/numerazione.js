// Numero d'offerta automatico: PREFISSO-ANNO-PROGRESSIVO (CONFIG.numerazione).
// Pubblicato come Artifact, il progressivo viene da un registro condiviso (capability "db",
// collezione "offerte": un documento per numero, con numero, anno e data — nessun dato del cliente).
// In locale non c'è registro: il numero viene da un contatore del browser ed è modificabile a mano.

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

function numeroDaContatoreLocale(anno) {
  const chiave = 'wes-offerta-contatore-' + anno;
  let ultimo = 0;
  try { ultimo = Number(localStorage.getItem(chiave)) || 0; } catch (e) {}
  const n = Math.max(partenzaAnno(anno), ultimo + 1);
  try { localStorage.setItem(chiave, String(n)); } catch (e) {}
  return formattaNumero(anno, n);
}

// Restituisce il numero assegnato, oppure null se il registro non risponde.
async function nuovoNumeroOfferta(f) {
  const anno = annoOfferta(f);
  if (!registroCondiviso()) return numeroDaContatoreLocale(anno);
  try { return await numeroDaRegistro(anno); }
  catch (e) { return null; }
}
