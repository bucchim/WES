// Documento PDF: riproduce il modello Word WES "Offerta economica e conferma d'ordine"
// (testata con badge, piè di pagina con dati societari, titoli Cambria blu, testo Aptos, tabelle a griglia).
// Il contenuto è diviso in blocchi (uno per sezione): impaginaPdf li dispone sui fogli A4,
// passando al foglio successivo quando un blocco non ci sta. I campi mancanti compaiono come [●].

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const segnaposto = '<span class="vuoto">[●]</span>';
const testo = (s) => pieno(s) ? esc(String(s).trim()) : segnaposto;
// Importi come nel modello: "€ 12.500,00"
const euroDoc = (n) => '€ ' + new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' }).format(n);
const importo = (n) => n === null ? segnaposto : esc(euroDoc(n));
const dato = (etichetta, valore) => `<p class="meta"><b>${etichetta}:</b> ${valore}</p>`;

// Foglio A4: badge in alto a destra, corpo da riempire, piè di pagina della carta intestata.
function foglioPdf(f) {
  return `
    <div class="pdf-pagina">
      <img class="pdf-badge" src="${CARTA_INTESTATA.badge}" alt="WES — We turn attention on">
      <div class="pdf-rif">
        <div>Offerta n. ${esc(numeroDocumento(f))}</div>
        <div class="pdf-num"></div>
      </div>
      <div class="pdf-corpo"></div>
      <div class="pdf-piede">
        <img class="pdf-logotipo" src="${CARTA_INTESTATA.logotipo}" alt="Worldwide Exhibition System s.r.l.">
        <div class="pdf-gruppo">${esc(CARTA_INTESTATA.gruppo)}</div>
        <div>${esc(CARTA_INTESTATA.indirizzo)}</div>
        <div>${esc(CARTA_INTESTATA.datiSocietari)}</div>
      </div>
    </div>`;
}

const riga = (etichetta, valore, classe = '') => `<tr class="${classe}"><td>${etichetta}</td><td>${valore}</td></tr>`;
const tabella = (col1, col2, righe, classe = '') => `
  <table class="${classe}">
    <thead><tr><th>${col1}</th><th>${col2}</th></tr></thead>
    <tbody>${righe.join('')}</tbody>
  </table>`;

function blocchiPdf(f) {
  const t = totali(f), pg = pagamenti(f, t), pacchetto = isPacchetto(f);

  // 1. Oggetto: una riga per voce (Commessa singola) o per evento (Pacchetto commesse); le righe vuote si saltano.
  const vociOggetto = righeOggetto(f)
    .filter(e => pieno(e.desc) || pieno(e.imp))
    .map(e => riga(testo(e.desc), importo(numOppureNull(e.imp))));
  const etichettaSconto = pacchetto && t.scontoPct !== null ? 'Sconto (' + pctIt(t.scontoPct) + ')' : 'Sconto';
  vociOggetto.push(
    riga(pacchetto ? 'Totale pacchetto stand' : 'Totale', t.compilato ? esc(euroDoc(t.totale)) : segnaposto, 'totale'),
    riga(etichettaSconto, t.compilato ? esc(euroDoc(t.sconto)) : segnaposto, 'sconto'),
    riga(pacchetto ? 'Totale finale a voi riservato' : 'Totale a voi riservato', importo(t.riservato), 'finale')
  );
  const testiOggetto = pacchetto
    ? `<p>${TESTI.pacchettoLayout}</p>
      <p>${TESTI.pacchettoComprende}</p>
      <p>${TESTI.esclusioni}</p>`
    : `<p>${TESTI.iva}</p>
      <p>${TESTI.esclusioni}</p>`;

  const vociServizi = SERVIZI.map((nome, i) => {
    const desc = i === SERVIZIO_CON_DESCRIZIONE ? ' ' + testo(f.s7desc) : '';
    const valore = f['s' + i + 'm'] === 'tbd' ? '€ TBD' : importo(numOppureNull(f['s' + i + 'v']));
    return riga(esc(nome) + desc, valore);
  });

  const scadenza = (i) => {
    const p = pg.pct[i], a = pg.importi[i];
    if (p === null || a === null) return segnaposto;
    return esc(p.toFixed(0) + '% pari a ' + euroDoc(a));
  };
  // SAL / milestone è facoltativo: senza descrizione né percentuale la riga non compare.
  const conSal = pieno(f.pgLabel2) || pieno(f.pgPct2);
  const vociPagamento = [
    riga('Alla conferma dell’ordine', scadenza(0)),
    ...(conSal ? [riga('SAL / milestone' + (pieno(f.pgLabel2) ? ' ' + esc(f.pgLabel2.trim()) : ''), scadenza(1))] : []),
    riga('Saldo', scadenza(2))
  ];

  // Condizioni particolari: elenco puntato delle sole condizioni compilate
  const cp = condizioniCompilate(f).map(c => `<li>${esc(c.trim())}</li>`);
  const condizioni = `<ul>${cp.length ? cp.join('') : `<li>${segnaposto}</li>`}</ul>`;

  const linea = '<span class="linea"></span>';
  const firmaWes = CONFIG.firmaWesNelPdf ? `
      <p class="sottoscrizione spazio-sopra"><b>Per WES</b></p>
      <p class="sottoscrizione"><b>Firma:</b> ${linea}</p>` : '';

  const costo = numOppureNull(f.mpCosto);

  return [
    `<div class="pdf-titolo">${esc(CARTA_INTESTATA.titolo)}</div>
      <div class="pdf-sottotitolo">Offerta economica e conferma d’ordine</div>
      <h3>Cliente</h3>
      ${dato('Ragione sociale', testo(f.cliRag))}
      ${dato('C.F./P.IVA', testo(f.cliPiva))}
      ${dato('Referente', testo(f.cliRef))}
      ${dato('E-mail', testo(f.cliMail))}
      <h3>Commessa</h3>
      ${dato('Numero commessa', testo(f.numCommessa))}
      ${dato('Evento / Progetto', testo(f.cmEvento))}
      ${dato('Data', testo(f.cmData))}
      ${dato('Luogo', testo(f.cmLuogo))}
      ${dato('Preventivo del', testo(f.cmPrev))}
      ${dato('Validità', testo(f.cmVal))}`,

    `<h2>1. Oggetto dell’offerta</h2>
      <p>${pacchetto ? TESTI.oggettoPacchetto : TESTI.oggetto}</p>
      ${tabella(pacchetto ? 'Evento' : 'Descrizione', 'Corrispettivo', vociOggetto)}
      ${testiOggetto}`,

    `<h2>2. Servizi fiera</h2>
      ${tabella('Servizio', 'Valore', vociServizi)}
      <p class="giust">${TESTI.importiNonDisponibili}</p>
      <p class="giust">${TESTI.feeAnticipazione.replace('{fee}', testo(f.fee))}</p>`,

    `<h2>3. Modifiche progettuali</h2>
      <p class="giust">${TESTI.cicliInclusi.replace('{cicli}', '<b>' + testo(f.mpCicli) + '</b>')}</p>
      <p class="giust">Le modifiche ulteriori rispetto a quelle incluse saranno valorizzate</p>
      <p class="giust"><b>${costo === null ? segnaposto : esc(euroDoc(costo))}</b> + IVA per ciclo di modifica</p>
      <p class="giust">oppure, ove la natura o la complessità della richiesta non consentano una valorizzazione standard, mediante specifica quotazione.</p>
      <p class="giust">${TESTI.definizioneCiclo}</p>
      <p class="giust">${TESTI.variazioneImporti}</p>`,

    `<h2>4. Condizioni di pagamento</h2>
      ${tabella('Scadenza', 'Importo', vociPagamento, 'pagamenti')}
      ${dato('Termini di pagamento', testo(f.pgTermini) + ' giorni data fattura')}
      ${dato('Modalità', TESTI.modalitaPagamento.replace(/^Modalità:\s*/, ''))}`,

    `<h2>5. Condizioni particolari concordate</h2>
      <p>${TESTI.condizioniIntro}</p>
      ${condizioni}
      <p class="giust">${TESTI.condizioniPrevalenza}</p>`,

    `<h2>6. Accettazione dell’offerta</h2>
      <p class="giust">${TESTI.accettazione}</p>
      <p class="sottoscrizione spazio-sopra"><b>Per il Cliente</b></p>
      <p class="sottoscrizione"><b>Ragione sociale:</b> ${pieno(f.cliRag) ? esc(f.cliRag.trim()) : linea}</p>
      <p class="sottoscrizione"><b>Nome e qualifica del firmatario:</b> ${linea}</p>
      <p class="sottoscrizione"><b>Luogo e data:</b> ${linea}</p>
      <p class="sottoscrizione spazio-sopra"><b>Firma e timbro per accettazione:</b> ${linea}</p>
      ${firmaWes}`
  ];
}

// Dispone i blocchi sui fogli dentro `contenitore` e numera le pagine. Restituisce il numero di fogli.
// Il contenitore deve essere visibile, perché serve misurare le altezze.
function impaginaPdf(contenitore, f) {
  contenitore.innerHTML = '';
  const nuovoFoglio = () => {
    contenitore.insertAdjacentHTML('beforeend', foglioPdf(f));
    return contenitore.lastElementChild.querySelector('.pdf-corpo');
  };
  let corpo = nuovoFoglio();
  blocchiPdf(f).forEach(html => {
    const blocco = document.createElement('div');
    blocco.className = 'pdf-blocco';
    blocco.innerHTML = html;
    corpo.appendChild(blocco);
    if (corpo.scrollHeight > corpo.clientHeight + 1 && corpo.children.length > 1) {
      corpo.removeChild(blocco);
      corpo = nuovoFoglio();
      corpo.appendChild(blocco);
    }
  });
  const fogli = contenitore.querySelectorAll('.pdf-pagina');
  fogli.forEach((foglio, i) => { foglio.querySelector('.pdf-num').textContent = 'Pag. ' + (i + 1) + ' di ' + fogli.length; });
  return fogli.length;
}
