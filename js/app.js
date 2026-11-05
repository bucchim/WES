// Interfaccia del modulo: costruisce le righe ripetute, collega i campi allo stato,
// aggiorna i valori calcolati, gestisce autosalvataggio, anteprima e PDF.

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const stato = {
  f: copia(CONFIG.datiEsempioAllAvvio ? ESEMPIO : VUOTO),
  esempio: CONFIG.datiEsempioAllAvvio,
  validato: false,       // diventa true alla prima anteprima: da lì si mostrano gli errori dei campi
  sezioneAttiva: 'sec-0'
};

// ---------- Costruzione delle righe ripetute ----------

const campoImporto = (campo, prefisso = '€') =>
  `<div class="importo"><span>${prefisso}</span><input data-campo="${campo}" class="num" placeholder="0,00" inputmode="decimal"></div>`;

function costruisci() {
  $('#nav-sezioni').innerHTML = SEZIONI.map(s => `
    <button type="button" class="voce-indice" data-vai="${s.id}">
      <span class="voce-num">${s.num}</span><span class="voce-titolo">${s.titolo}</span><span class="voce-stato"></span>
    </button>`).join('');

  $('#voci-servizi').innerHTML = SERVIZI.map((nome, i) => `
    <div class="riga${i === SERVIZIO_CON_DESCRIZIONE ? ' chiara' : ''}" data-servizio="${i}">
      <div class="${i === SERVIZIO_CON_DESCRIZIONE ? 'con-descrizione' : ''}">
        <span>${nome}</span>
        ${i === SERVIZIO_CON_DESCRIZIONE ? '<input data-campo="s7desc" class="descrizione" placeholder="Descrizione libera">' : ''}
      </div>
      <div class="scelta">
        <button type="button" data-modo="imp">Importo</button><button type="button" data-modo="tbd">TBD</button>
      </div>
      <div>
        <div class="se-importo">${campoImporto('s' + i + 'v')}</div>
        <div class="se-tbd tbd-box">TBD</div>
      </div>
    </div>`).join('');

  const etichettePagamento = [
    '<span>Alla conferma dell’ordine</span>',
    '<span>SAL / milestone</span><input data-campo="pgLabel2" class="descrizione" placeholder="Indica la milestone">',
    '<span>Saldo</span>'
  ];
  $('#voci-pagamento').innerHTML = etichettePagamento.map((etichetta, i) => `
    <div class="riga">
      <div class="${i === 1 ? 'con-descrizione' : ''}">${etichetta}</div>
      <div><div class="importo"><input data-campo="pgPct${i + 1}" class="num" placeholder="0" inputmode="decimal"><span>%</span></div></div>
      <div>${CONFIG.importiPagamentoAutomatici
        ? `<div class="valore-calcolato mono" data-out="pagamento${i}"></div>`
        : campoImporto('pgMan' + (i + 1))}</div>
    </div>`).join('');

  $$('[data-testo]').forEach(el => { el.textContent = TESTI[el.dataset.testo]; });
}

// ---------- Stato ↔ campi ----------

// Righe ripetute (voci della Commessa singola, eventi del pacchetto, condizioni particolari): si ricostruiscono
// quando se ne aggiunge o toglie una. Ogni campo porta data-lista, data-indice e (per le righe con importo) data-prop.
const RIGHE = {
  ogVoci: { contenitore: '#voci-oggetto', nome: 'voce', segnaposto: 'Descrizione della voce' },
  pkEventi: { contenitore: '#voci-pacchetto', nome: 'evento', segnaposto: 'Es. Fiera, città, anno – stand a noleggio … mq' }
};

function costruisciRighe(lista) {
  if (lista === 'condizioni') return costruisciCondizioni();
  const r = RIGHE[lista], righe = stato.f[lista], unica = righe.length <= 1;
  $(r.contenitore).innerHTML = righe.map((e, i) => `
    <div class="riga">
      <div class="evento">
        <input class="descrizione" data-lista="${lista}" data-indice="${i}" data-prop="desc" placeholder="${r.segnaposto}" aria-label="${r.nome} ${i + 1}">
        <button type="button" class="rimuovi" data-rimuovi="${lista}" data-indice="${i}" title="Rimuovi ${r.nome}" aria-label="Rimuovi ${r.nome} ${i + 1}"${unica ? ' disabled' : ''}>×</button>
      </div>
      <div><div class="importo"><span>€</span><input data-lista="${lista}" data-indice="${i}" data-prop="imp" class="num" placeholder="0,00" inputmode="decimal" aria-label="Corrispettivo ${r.nome} ${i + 1}"></div></div>
    </div>`).join('');
  $$(`${r.contenitore} [data-lista]`).forEach(el => { el.value = righe[el.dataset.indice][el.dataset.prop] || ''; });
}

// Condizioni particolari: la prima resta sempre, le altre si aggiungono e si tolgono.
function costruisciCondizioni() {
  const c = stato.f.condizioni;
  $('#voci-condizioni').innerHTML = c.map((_, i) => `
    <div class="campo">
      <span>Condizione ${i + 1} <em>— facoltativa</em></span>
      <div class="condizione">
        <textarea data-lista="condizioni" data-indice="${i}" rows="2" placeholder="Testo libero" aria-label="Condizione ${i + 1}"></textarea>
        ${i ? `<button type="button" class="rimuovi" data-rimuovi="condizioni" data-indice="${i}" title="Rimuovi condizione" aria-label="Rimuovi condizione ${i + 1}">×</button>` : ''}
      </div>
    </div>`).join('');
  $$('#voci-condizioni [data-lista]').forEach(el => { el.value = c[el.dataset.indice] || ''; });
}

function scriviCampi() {
  $$('[data-campo]').forEach(el => { el.value = stato.f[el.dataset.campo] ?? ''; });
  Object.keys(LIMITI_LISTE).forEach(costruisciRighe);
}

// Unisce dati salvati (autosalvataggio) al modello vuoto, recuperando anche i formati precedenti:
// voci fisse dell'oggetto (ogIdea…ogAltro) e condizioni cp1…cp3.
function normalizza(dati) {
  const f = copia(VUOTO);
  const righe = (v, max) => v.slice(0, max).map(e => ({ desc: String((e && e.desc) || ''), imp: String((e && e.imp) || '') }));
  Object.keys(VUOTO).forEach(k => {
    if (k === 'pkEventi' || k === 'ogVoci') {
      if (Array.isArray(dati[k]) && dati[k].length) f[k] = righe(dati[k], CONFIG[LIMITI_LISTE[k]]);
    } else if (k === 'condizioni') {
      if (Array.isArray(dati.condizioni) && dati.condizioni.length) f.condizioni = dati.condizioni.slice(0, CONFIG.maxCondizioni).map(c => String(c || ''));
    } else if (dati[k] !== undefined) f[k] = String(dati[k]);
  });
  if (!Array.isArray(dati.ogVoci) && VOCI_OGGETTO.some(v => dati[v.campo] !== undefined)) {
    f.ogVoci = VOCI_OGGETTO.map(v => ({
      desc: v.etichetta + (v.descrizione && pieno(dati[v.descrizione] || '') ? ': ' + dati[v.descrizione] : ''),
      imp: String(dati[v.campo] || '')
    }));
  }
  if (!Array.isArray(dati.condizioni)) {
    const vecchie = ['cp1', 'cp2', 'cp3'].map(k => String(dati[k] || '')).filter(pieno);
    if (vecchie.length) f.condizioni = vecchie;
  }
  if (f.ogModo !== 'pacchetto') f.ogModo = 'singola';
  if (!pieno(f.pgTermini)) f.pgTermini = VUOTO.pgTermini;   // offerte salvate prima del valore predefinito (30)
  return f;
}

function autosalva() {
  try { localStorage.setItem(CONFIG.chiaveAutosalvataggio, JSON.stringify({ f: stato.f, sample: stato.esempio })); } catch (e) {}
}

function leggiAutosalvataggio() {
  try {
    const d = JSON.parse(localStorage.getItem(CONFIG.chiaveAutosalvataggio) || 'null');
    // I dati di esempio non sono un'offerta in corso: in quel caso si riparte come da CONFIG.
    if (d && typeof d.f === 'object' && !d.sample) {
      stato.f = normalizza(d.f);
      stato.esempio = false;
    }
  } catch (e) {}
}

function imposta(nuoviCampi, esempio) {
  stato.f = normalizza(nuoviCampi);
  stato.esempio = esempio;
  stato.validato = false;
  scriviCampi();
  aggiorna();
}

// ---------- Aggiornamento della pagina ----------

const out = (nome, valore) => $$(`[data-out="${nome}"]`).forEach(el => { el.textContent = valore; });

function aggiorna() {
  const f = stato.f, t = totali(f), pg = pagamenti(f, t), lista = controlli(f);

  // Numero in testa al documento: il Numero commessa scritto dall'utente.
  out('numeroOfferta', pieno(numeroDocumento(f)) ? numeroDocumento(f) : 'Numero commessa mancante');
  // Oggetto: Commessa singola / Pacchetto commesse
  const pacchetto = isPacchetto(f);
  $('#sec-1').classList.toggle('modo-pacchetto', pacchetto);
  out('introOggetto', pacchetto ? TESTI.oggettoPacchetto : TESTI.oggetto);
  out('intestazioneOggetto', pacchetto ? 'Evento' : 'Descrizione');
  out('etichettaTotale', pacchetto ? 'Totale pacchetto stand' : 'Totale');
  out('etichettaRiservato', pacchetto ? 'Totale finale a voi riservato' : 'Totale a voi riservato');
  const parole = { ogVoci: ['voce', 'voci'], pkEventi: ['evento', 'eventi'], condizioni: ['condizione', 'condizioni'] };
  Object.keys(LIMITI_LISTE).forEach(k => {
    const n = f[k].length, max = CONFIG[LIMITI_LISTE[k]];
    out('conto-' + k, n + ' ' + parole[k][n === 1 ? 0 : 1] + (n >= max ? ' — massimo raggiunto' : ''));
    $(`[data-azione="aggiungi-riga"][data-lista="${k}"]`).disabled = n >= max;
  });

  out('totale', t.compilato ? eur(t.totale) : '—');
  out('riservato', t.riservato === null ? '—' : eur(t.riservato));
  out('notaSconto', t.scontoPct !== null
    ? 'Condizione riservata — ' + pctIt(t.scontoPct) + ' sul Totale' + (pacchetto ? ' (nel PDF: “Sconto (' + pctIt(t.scontoPct) + ')”)' : '')
    : 'Importo a inserimento libero, sottratto dal Totale');
  out('testoFee', TESTI.feeAnticipazione.replace('{fee}', pieno(f.fee) ? f.fee.trim() : '[●]'));
  out('testoCicli', TESTI.cicliInclusi.replace('{cicli}', pieno(f.mpCicli) ? f.mpCicli.trim() : '[●]'));
  const costo = numOppureNull(f.mpCosto);
  out('testoCosto', 'Le modifiche ulteriori rispetto a quelle incluse saranno valorizzate: ' + (costo === null ? '€ [●]' : eur(costo)) +
    ' + IVA per ciclo di modifica, oppure, ove la natura o la complessità della richiesta non consentano una valorizzazione standard, mediante specifica quotazione.');
  out('ragioneSociale', pieno(f.cliRag) ? f.cliRag.trim() : '[●]');

  // Servizi: interruttore Importo/TBD
  let tbd = 0;
  $$('[data-servizio]').forEach(riga => {
    const isTbd = f['s' + riga.dataset.servizio + 'm'] === 'tbd';
    if (isTbd) tbd++;
    riga.classList.toggle('modo-tbd', isTbd);
  });
  out('contoTbd', tbd + ' su ' + SERVIZI.length + ' come TBD');

  // Pagamenti
  pg.importi.forEach((a, i) => out('pagamento' + i, a === null ? '—' : eur(a)));
  out('sommaPct', pg.sommaPct.toFixed(0) + '%');
  out('sommaImporti', pg.sommaImporti === null ? '—' : eur(pg.sommaImporti));
  out('messaggioSomma', pg.corretto ? 'Totale scadenze — corretto' : 'La somma delle percentuali deve essere 100%');
  $('#somma-pagamenti').classList.toggle('errata', !pg.corretto);

  // Errori sui campi (gli obbligatori solo dopo la prima anteprima)
  const obbligatorio = (k) => (stato.validato && !pieno(f[k])) ? 'Campo obbligatorio.' : '';
  const errori = {
    cliRag: obbligatorio('cliRag'), cliRef: obbligatorio('cliRef'), numCommessa: obbligatorio('numCommessa'),
    cliMail: pieno(f.cliMail) && !emailValida(f.cliMail) ? 'Indirizzo e-mail non valido.' : obbligatorio('cliMail'),
    cmEvento: obbligatorio('cmEvento'), cmData: obbligatorio('cmData'), cmLuogo: obbligatorio('cmLuogo'),
    oggetto: (nonNumerico(f.ogSconto) || righeOggetto(f).some(e => nonNumerico(e.imp))) ? 'Uno o più importi non sono numerici.' : ''
  };
  $$('[data-errore]').forEach(el => { el.textContent = errori[el.dataset.errore] || ''; });
  $('[data-campo="cliMail"]').classList.toggle('invalido', pieno(f.cliMail) && !emailValida(f.cliMail));

  // Indice laterale: sezione attiva e pallino di stato
  $$('.voce-indice').forEach(btn => {
    const id = btn.dataset.vai;
    const err = lista.some(c => c.sezione === id && c.tono === 'error');
    const warn = lista.some(c => c.sezione === id && c.tono === 'warn');
    btn.classList.toggle('attiva', id === stato.sezioneAttiva);
    btn.querySelector('.voce-stato').dataset.tono = err ? 'error' : (warn ? 'warn' : 'ok');
  });
  const pct = percentualeCompilazione(f);
  $('#progresso').style.width = pct + '%';
  out('completamento', pct + '% dei campi compilati');

  // Controllo dell'offerta
  const nErr = lista.filter(c => c.tono === 'error').length;
  const voci = lista.length ? lista : [{ tono: 'ok', titolo: 'Offerta completa', nota: 'Tutti i controlli sono superati: puoi generare il PDF.', sezione: 'sec-0' }];
  $('#lista-controlli').innerHTML = voci.map(c => `
    <div class="controllo" data-tono="${c.tono}">
      <span class="punto"></span>
      <div><b>${esc(c.titolo)}</b><small>${esc(c.nota)}</small></div>
      <button type="button" data-vai="${c.sezione}">Vai</button>
    </div>`).join('');
  const badge = $('#badge-controllo');
  badge.textContent = nErr ? nErr + (nErr === 1 ? ' blocco' : ' blocchi') : 'Pronta';
  badge.classList.toggle('errore', nErr > 0);
  out('suggerimento', nErr ? 'Puoi generare l’anteprima, ma i campi mancanti compariranno come [●].' : 'Il documento riprende testi e struttura del modello WES.');

  $('.interruttore').classList.toggle('acceso', stato.esempio);
  if (!$('#anteprima').hidden && !stato.generazionePdf) {   // durante la generazione i fogli non vanno ridisegnati
    const n = impaginaPdf($('#pdf-pagine'), f);
    out('numeroPagine', n + (n === 1 ? ' pagina' : ' pagine'));
  }
}

// ---------- Bozze, anteprima, PDF ----------

const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const nomeFile = () => [slug(numeroDocumento(stato.f)) || 'senza-numero', slug(stato.f.cliRag)].filter(Boolean).join('-');

// Assegna il numero d'offerta se manca: all'apertura dell'anteprima (senza registro condiviso) o a
// "Scarica PDF". Una volta assegnato, il numero resta all'offerta (anche dopo correzioni e nuovi PDF). Con i dati di esempio non si assegna. Una sola richiesta alla volta.
let richiestaNumero = null;
function assicuraNumero() {
  if (pieno(stato.f.numOfferta)) return Promise.resolve(true);
  if (msConfigurato() && !msCollegato()) { toast('Accedi con il tuo account Microsoft per ottenere il numero d’offerta'); return Promise.resolve(false); }
  if (!richiestaNumero) {
    richiestaNumero = nuovoNumeroOfferta(stato.f).then(numero => {
      richiestaNumero = null;
      if (!numero) {
        toast(msConfigurato()
          ? 'Numero non assegnato: la lista SharePoint non risponde o non hai il permesso di scriverci. Riprova o avvisa l’IT.'
          : 'Numero non assegnato: serve l’accesso da Collaboratore a questa pagina, oppure il registro non risponde. Riprova.');
        return false;
      }
      stato.f.numOfferta = numero;
      aggiorna(); autosalva();
      toast('Assegnato il numero ' + numero);
      return true;
    });
  }
  return richiestaNumero;
}

let timerToast;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(timerToast);
  timerToast = setTimeout(() => { el.hidden = true; }, 2600);
}

// Pubblicato come Artifact su claude.ai la pagina non può scaricare file né stampare da sola:
// passa dalla funzione "downloads" della piattaforma. In locale window.claude non esiste.
const inArtifact = !!(window.claude && window.claude.use);
let downloads = null;
if (inArtifact) window.claude.use('downloads').then(d => { downloads = d; }).catch(() => {});

async function salvaFile(nome, dati) {
  if (inArtifact) {
    if (!downloads) { toast('Salvataggio file non disponibile in questa visualizzazione'); return false; }
    try { await downloads.save({ filename: nome, data: dati }); return true; }
    catch (e) {
      if (e && e.code !== 'declined') toast('File non salvato (' + (e.code || 'errore') + ')');
      return false;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(dati instanceof Blob ? dati : new Blob([dati]));
  a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}

// Riporta nella lista SharePoint i dati anagrafici aggiornati (nessun importo). Un errore non blocca il lavoro.
function aggiornaRegistro(extra) {
  aggiornaRegistroSharePoint(stato.f, extra).catch(e => { console.error(e); toast('Registro SharePoint non aggiornato: riprova più tardi'); });
}

// Senza registro condiviso il numero (anno + data mmgg) non consuma nulla: si assegna già all'apertura
// dell'anteprima, così compare nel documento e resta quello anche dopo altre modifiche e nel PDF scaricato.
// Con SharePoint (o il registro dell'Artifact) assegnarlo crea una riga nel registro: lì si aspetta "Scarica PDF".
function apriAnteprima() {
  stato.validato = true;
  $('#anteprima').hidden = false;
  document.body.classList.add('anteprima-aperta');
  if (!stato.esempio && !msConfigurato() && !registroCondiviso()) assicuraNumero();
  aggiorna();
  const nErr = controlli(stato.f).filter(c => c.tono === 'error').length;
  if (nErr) toast('Anteprima aperta · ' + nErr + ' controllo/i da risolvere');
}

function chiudiAnteprima() {
  $('#anteprima').hidden = true;
  document.body.classList.remove('anteprima-aperta');
}

const caricaScript = (src) => new Promise((ok, ko) => {
  if (document.querySelector(`script[src="${src}"]`)) return ok();
  const s = document.createElement('script');
  s.src = src; s.onload = ok; s.onerror = ko;
  document.head.appendChild(s);
});

// Il PDF viene composto nella pagina: ogni foglio A4 diventa un'immagine ad alta risoluzione.
async function generaPdf() {
  await caricaScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  await caricaScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pagine = $$('.pdf-pagina');
  // Badge e logotipo devono essere caricati prima di fotografare i fogli.
  await Promise.all($$('.pdf-pagina img').map(img => img.decode().catch(() => {})));
  for (let i = 0; i < pagine.length; i++) {
    // L'ombra della pagina va tolta: html2canvas la disegnerebbe sopra il foglio.
    const canvas = await window.html2canvas(pagine[i], {
      scale: 2.5, backgroundColor: '#ffffff',
      onclone: (doc) => { doc.querySelectorAll('.pdf-pagina').forEach(p => { p.style.boxShadow = 'none'; }); }
    });
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
  }
  return pdf.output('blob');
}

// "Scarica PDF" è il momento in cui l'offerta prende il numero: lo si assegna (se manca e non sono
// dati di esempio), lo si scrive nell'anteprima e si genera il file, che il browser scarica subito.
// Se la composizione del PDF non riesce (es. librerie bloccate dalla rete) si ripiega sulla stampa del browser.
async function scaricaPdf() {
  const btn = $('[data-azione="scarica-pdf"]');
  btn.disabled = true; btn.textContent = 'Generazione…';
  try {
    if (!stato.esempio && !(await assicuraNumero())) return;   // senza numero niente PDF: il messaggio lo dà assicuraNumero
    const nome = 'offerta-' + nomeFile() + '.pdf';
    let pdf;
    try { stato.generazionePdf = true; pdf = await generaPdf(); }
    catch (e) {
      console.error(e);
      if (inArtifact) { toast('Non è stato possibile generare il PDF'); return; }
      stampaPdf();
      aggiornaRegistro({ UltimoPdf: new Date().toISOString() });
      return;
    } finally { stato.generazionePdf = false; }
    if (await salvaFile(nome, pdf)) {
      toast('PDF salvato — ' + nome);
      aggiornaRegistro({ UltimoPdf: new Date().toISOString() });
    }
  } finally {
    btn.disabled = false; btn.textContent = 'Scarica PDF';
  }
}

// Ripiego: stampa del browser ("Salva come PDF"); il titolo diventa il nome del file.
function stampaPdf() {
  toast('Scegli “Salva come PDF” nella finestra di stampa');
  const titolo = document.title;
  document.title = 'offerta-' + nomeFile();
  const ripristina = () => { document.title = titolo; window.removeEventListener('afterprint', ripristina); };
  window.addEventListener('afterprint', ripristina);
  window.print();
}

function vai(id) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
}

// ---------- Eventi ----------

function collegaEventi() {
  document.addEventListener('input', (e) => {
    const d = e.target.dataset || {};
    if (d.lista) {
      if (d.prop) stato.f[d.lista][d.indice][d.prop] = e.target.value;
      else stato.f[d.lista][d.indice] = e.target.value;   // condizioni: solo testo
    } else if (d.campo) stato.f[d.campo] = e.target.value;
    else return;
    aggiorna();
    autosalva();
  });

  document.addEventListener('click', (e) => {
    const modoOggetto = e.target.closest('[data-modo-oggetto]');
    if (modoOggetto) {
      stato.f.ogModo = modoOggetto.dataset.modoOggetto;
      aggiorna(); autosalva();
      return;
    }
    const rimuovi = e.target.closest('[data-rimuovi]');
    if (rimuovi) {
      const lista = rimuovi.dataset.rimuovi;
      if (stato.f[lista].length > 1) stato.f[lista].splice(Number(rimuovi.dataset.indice), 1);
      costruisciRighe(lista); aggiorna(); autosalva();
      return;
    }
    const modo = e.target.closest('[data-modo]');
    if (modo) {
      const i = modo.closest('[data-servizio]').dataset.servizio;
      stato.f['s' + i + 'm'] = modo.dataset.modo;
      if (modo.dataset.modo === 'tbd') { stato.f['s' + i + 'v'] = ''; $(`[data-campo="s${i}v"]`).value = ''; }
      aggiorna(); autosalva();
      return;
    }
    const destinazione = e.target.closest('[data-vai]');
    if (destinazione) { vai(destinazione.dataset.vai); return; }

    const azione = e.target.closest('[data-azione]');
    if (!azione) return;
    switch (azione.dataset.azione) {
      case 'esempio': {
        // Il tipo di offerta scelto (Commessa singola / Pacchetto commesse) resta lo stesso in entrambe le direzioni.
        const modo = stato.f.ogModo;
        imposta(Object.assign(copia(stato.esempio ? VUOTO : ESEMPIO), { ogModo: modo }), !stato.esempio); autosalva();
        break;
      }
      case 'aggiungi-riga': {
        const lista = azione.dataset.lista, righe = stato.f[lista];
        if (righe.length < CONFIG[LIMITI_LISTE[lista]]) {
          righe.push(lista === 'condizioni' ? '' : eventoVuoto());
          costruisciRighe(lista); aggiorna(); autosalva();
          const nuovo = $(`[data-lista="${lista}"][data-indice="${righe.length - 1}"]`);
          if (nuovo) nuovo.focus();
        }
        break;
      }
      case 'accedi': msAccedi(); break;
      case 'esci': msEsci(); break;
      case 'anteprima': apriAnteprima(); break;
      case 'chiudi-anteprima': chiudiAnteprima(); break;
      case 'scarica-pdf': scaricaPdf(); break;
    }
  });

  // Evidenzia nell'indice la sezione visibile
  let attesa = null;
  window.addEventListener('scroll', () => {
    if (attesa) return;
    attesa = requestAnimationFrame(() => {
      attesa = null;
      let corrente = SEZIONI[0].id;
      SEZIONI.forEach(s => { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top <= 160) corrente = s.id; });
      if (corrente !== stato.sezioneAttiva) { stato.sezioneAttiva = corrente; aggiorna(); }
    });
  }, { passive: true });
}

// ---------- Avvio ----------

// Con Microsoft 365 configurato il modulo si usa solo dopo l'accesso con l'account aziendale:
// fino ad allora resta coperto dalla schermata di accesso.
async function avviaAccesso() {
  if (!msConfigurato()) return;
  const schermata = $('#accesso');
  schermata.hidden = false;
  try {
    if (await msAvvia()) {
      schermata.hidden = true;
      $('#utente').hidden = false;
      out('nomeUtente', msNomeUtente());
    } else {
      out('statoAccesso', 'Accedi con il tuo account Microsoft aziendale per usare il modulo.');
      $('[data-azione="accedi"]').hidden = false;
    }
  } catch (e) {
    console.error(e);
    out('statoAccesso', 'Accesso non disponibile (' + e.message + '). Ricarica la pagina o avvisa l’IT.');
  }
}

leggiAutosalvataggio();
costruisci();
scriviCampi();
collegaEventi();
aggiorna();
avviaAccesso();
