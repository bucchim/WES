// Calcoli e controlli dell'offerta. Funzioni pure: ricevono i campi (f) e restituiscono valori.

const eur = (n) => new Intl.NumberFormat('it-IT', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always'
}).format(n);

// Legge un importo scritto all'italiana ("12.500,00") o all'inglese ("12500.00").
// Restituisce null se il campo è vuoto, NaN se non è un numero.
function num(s) {
  if (s === null || s === undefined || String(s).trim() === '') return null;
  let t = String(s).replace(/[^0-9.,-]/g, '');
  if (t === '') return NaN;
  if (t.indexOf(',') > -1) t = t.replace(/\./g, '').replace(',', '.');
  else { const p = t.split('.'); if (p.length > 2) t = p.join(''); }
  const n = parseFloat(t);
  return isNaN(n) ? NaN : n;
}
const nonNumerico = (s) => { const n = num(s); return n !== null && isNaN(n); };
const numOppureNull = (s) => { const n = num(s); return (n === null || isNaN(n)) ? null : n; };
const pieno = (s) => String(s).trim() !== '';
const emailValida = (s) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(String(s).trim());

const isPacchetto = (f) => f.ogModo === 'pacchetto';
const eventi = (f) => Array.isArray(f.pkEventi) ? f.pkEventi : [];
const vociSingola = (f) => Array.isArray(f.ogVoci) ? f.ogVoci : [];
// Righe dell'oggetto nella modalità scelta: voci (Commessa singola) oppure eventi (Pacchetto commesse).
const righeOggetto = (f) => isPacchetto(f) ? eventi(f) : vociSingola(f);
// Numero in testa al documento ("Offerta n."): il Numero commessa scritto dall'utente (obbligatorio); se manca, niente.
const numeroDocumento = (f) => String(f.numCommessa || '').trim();
const condizioniCompilate =(f) => (Array.isArray(f.condizioni) ? f.condizioni : []).filter(pieno);

// Totale = somma dei corrispettivi delle righe dell'oggetto.
function totali(f) {
  const parti = righeOggetto(f).map(e => num(e.imp));
  const compilato = parti.some(p => p !== null && !isNaN(p));
  const totale = parti.reduce((a, b) => a + (b && !isNaN(b) ? b : 0), 0);
  const sconto = numOppureNull(f.ogSconto) || 0;
  const scontoPct = compilato && totale > 0 && sconto > 0 ? sconto / totale * 100 : null;
  return { totale, compilato, sconto, scontoPct, riservato: compilato ? totale - sconto : null };
}
const pctIt = (n) => n.toFixed(1).replace('.', ',') + '%';

function pagamenti(f, t) {
  const pct = [numOppureNull(f.pgPct1), numOppureNull(f.pgPct2), numOppureNull(f.pgPct3)];
  const sommaPct = pct.reduce((a, b) => a + (b || 0), 0);
  const auto = CONFIG.importiPagamentoAutomatici;
  const importi = [0, 1, 2].map(i => {
    if (!auto) return numOppureNull(f['pgMan' + (i + 1)]);
    if (t.riservato === null || pct[i] === null) return null;
    return t.riservato * pct[i] / 100;
  });
  const sommaImporti = auto
    ? (t.riservato === null ? null : t.riservato * sommaPct / 100)
    : importi.reduce((a, b) => a + (b || 0), 0);
  return { auto, pct, sommaPct, importi, sommaImporti, corretto: Math.abs(sommaPct - 100) < 0.001 };
}

// Elenco dei controlli: tono "error" blocca, "warn" avvisa, "info" informa.
function controlli(f) {
  const t = totali(f), out = [];
  const obbligatori = [
    ['cliRag', 'Ragione sociale del Cliente'], ['cliRef', 'Referente del Cliente'], ['cliMail', 'E-mail del Cliente'],
    ['numCommessa', 'Numero commessa'], ['cmEvento', 'Evento / Progetto'], ['cmData', 'Data'], ['cmLuogo', 'Luogo']
  ];
  const mancanti = obbligatori.filter(r => !pieno(f[r[0]]));
  if (mancanti.length) out.push({ tono: 'error', titolo: mancanti.length + (mancanti.length === 1 ? ' campo obbligatorio mancante' : ' campi obbligatori mancanti'), nota: mancanti.map(m => m[1]).join(' · '), sezione: 'sec-0' });
  if (pieno(f.cliMail) && !emailValida(f.cliMail)) out.push({ tono: 'error', titolo: 'E-mail non valida', nota: 'Controlla l’indirizzo del referente cliente.', sezione: 'sec-0' });

  const pacchetto = isPacchetto(f), righe = righeOggetto(f);
  const numerici = ['ogSconto', 'mpCosto', 'fee', 'pgTermini', 's0v', 's1v', 's2v', 's3v', 's4v', 's5v', 's6v', 's7v', 'pgPct1', 'pgPct2', 'pgPct3'];
  const errati = numerici.filter(k => nonNumerico(f[k])).length + righe.filter(e => nonNumerico(e.imp)).length;
  if (errati) out.push({ tono: 'error', titolo: 'Importi non numerici', nota: errati + ' campo/i contengono un valore non interpretabile come numero.', sezione: 'sec-1' });

  if (!t.compilato) out.push({ tono: 'error', titolo: 'Dati economici mancanti', nota: pacchetto ? 'Nessun evento del pacchetto ha un corrispettivo.' : 'Nessuna voce compilata nell’Oggetto dell’offerta.', sezione: 'sec-1' });
  const [uno, molti] = pacchetto ? ['evento', 'eventi'] : ['voce', 'voci'];
  const senzaDesc = righe.filter(e => !pieno(e.desc) && pieno(e.imp)).length;
  const senzaImp = righe.filter(e => pieno(e.desc) && !pieno(e.imp)).length;
  if (senzaDesc) out.push({ tono: 'warn', titolo: senzaDesc + ' ' + (senzaDesc === 1 ? uno : molti) + ' senza descrizione', nota: 'È indicato un corrispettivo ma non la descrizione corrispondente.', sezione: 'sec-1' });
  if (senzaImp) out.push({ tono: 'warn', titolo: senzaImp + ' ' + (senzaImp === 1 ? uno : molti) + ' senza corrispettivo', nota: 'Nel PDF l’importo comparirà come [●]; se la voce non serve, toglila.', sezione: 'sec-1' });

  const pg = pagamenti(f, t);
  if (!pg.corretto) out.push({ tono: 'error', titolo: 'Percentuali di pagamento pari a ' + pg.sommaPct.toFixed(0) + '%', nota: 'La somma delle tre scadenze deve essere 100%.', sezione: 'sec-4' });

  const tbd = SERVIZI.filter((_, i) => f['s' + i + 'm'] === 'tbd').length;
  if (tbd) out.push({ tono: 'info', titolo: tbd + (tbd === 1 ? ' servizio lasciato come TBD' : ' servizi lasciati come TBD'), nota: 'Corretto se l’importo non è ancora disponibile: nel PDF comparirà “TBD”.', sezione: 'sec-2' });
  if (t.compilato && t.sconto > t.totale) out.push({ tono: 'error', titolo: 'Sconto superiore al Totale', nota: 'Il Totale a voi riservato risulta negativo.', sezione: 'sec-1' });
  if (!pieno(f.s7desc) && f.s7m === 'imp' && pieno(f.s7v)) out.push({ tono: 'warn', titolo: '“Altri servizi” senza descrizione', nota: 'È indicato un importo ma non la voce corrispondente.', sezione: 'sec-2' });
  // SAL / milestone è facoltativo: si segnala solo se ha una percentuale ma non la descrizione.
  if (!pieno(f.pgLabel2) && pieno(f.pgPct2)) out.push({ tono: 'info', titolo: 'SAL / milestone senza descrizione', nota: 'È indicata una percentuale: se vuoi, specifica la milestone.', sezione: 'sec-4' });
  return out;
}

function percentualeCompilazione(f) {
  // SAL / milestone è facoltativo e non conta.
  const campi = ['cliRag', 'cliPiva', 'cliRef', 'cliMail', 'numCommessa', 'cmEvento', 'cmData', 'cmLuogo', 'cmPrev', 'cmVal', 'ogSconto', 'fee', 'mpCicli', 'mpCosto', 'pgPct1', 'pgPct3', 'pgTermini'];
  // Le righe dell'oggetto valgono 5 campi: compilate se ogni riga ha descrizione e corrispettivo.
  const righe = righeOggetto(f), righeComplete = righe.length > 0 && righe.every(e => pieno(e.desc) && pieno(e.imp));
  const totaleCampi = campi.length + 1 + 5;
  const compilati = campi.filter(k => pieno(f[k])).length + (totali(f).riservato !== null ? 1 : 0) + (righeComplete ? 5 : 0);
  return Math.round(Math.min(1, compilati / totaleCampi) * 100);
}
