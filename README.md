# Modulo Offerta WES

Modulo per compilare l'**Offerta economica e conferma d'ordine** WES e generarla in PDF su carta intestata.
HTML, CSS e JavaScript semplici: nessuna installazione, nessun passaggio di compilazione.

## Come si apre

- Doppio clic su `index.html` (Chrome o Edge), oppure
- da Claude Code, con il server di anteprima `modulo-offerta-progetto` (`.claude/launch.json`).

## Cosa fa

- **Compilazione** con calcolo automatico di totale, sconto, totale riservato e rate di pagamento.
- **Oggetto dell'offerta** in due modalità: *Commessa singola* (righe con descrizione e corrispettivo modificabili,
  precompilate con le voci del modello WES, aggiungibili fino a `CONFIG.maxVociOggetto`) oppure *Pacchetto commesse*
  (un evento per riga con corrispettivo, fino a `CONFIG.maxEventiPacchetto`; nel PDF: Totale pacchetto stand,
  Sconto con percentuale, Totale finale a voi riservato e i testi fissi del modello pluriennale).
- **Controllo dell'offerta**: campi obbligatori, importi non numerici, percentuali che non fanno 100%, ecc.
- **Numero commessa**: campo di testo libero facoltativo; nel PDF compare solo se compilato.
- **Condizioni particolari**: una condizione sempre presente, altre aggiungibili con "+ Aggiungi condizione"
  (fino a `CONFIG.maxCondizioni`); nel PDF solo quelle compilate. **SAL / milestone** è facoltativo: senza
  descrizione né percentuale non compare nel PDF e non è segnalato nel controllo.
- **Salvataggio**: non ci sono bozze da scaricare; l'ultima offerta resta memorizzata nel browser
  (solo su quel PC e in quel browser) e si ritrova riaprendo la pagina.
- **PDF**: "Anteprima PDF" mostra il documento già con il numero d'offerta; "Scarica PDF" scarica subito il file PDF
  (composto nella pagina con html2canvas e jsPDF da cdnjs; se non si caricano, ripiega sulla stampa del browser).
  Il documento è in A4 con logo WES e piè di pagina con i dati societari. Le sezioni si dispongono da sole
  sui fogli (`impaginaPdf` in `js/pdf.js`): di norma 2 pagine, di più se il pacchetto ha molti eventi.

## Dove si modifica cosa

| Cosa | File |
|---|---|
| Numero offerta, impostazioni, dati della carta intestata | `js/dati.js` (`CONFIG`, `CARTA_INTESTATA`) |
| Voci dell'oggetto, servizi fiera, testi contrattuali fissi, dati di esempio | `js/dati.js` |
| Calcoli e controlli | `js/calcoli.js` |
| Impaginazione del PDF | `js/pdf.js` + sezione "Anteprima PDF" di `css/style.css` |
| Struttura del modulo | `index.html` |
| Comportamento (righe aggiungibili, anteprima, PDF) | `js/app.js` |
| Aspetto | `css/style.css` |

## Pubblicazione per i colleghi (Microsoft 365)

Sito su Azure Static Web Apps collegato a questo repository, accesso con account Microsoft WES e registro
offerte su una lista SharePoint: passi completi in [`docs/guida-configurazione-microsoft365.md`](docs/guida-configurazione-microsoft365.md).
Codice in `js/microsoft.js`; si attiva compilando `CONFIG.microsoft` in `js/dati.js` (vuoto = come prima).

## Note

- Il PDF riproduce il modello Word WES dell'offerta: badge in alto a destra (`assets/wes-badge-color.svg`, dal design system),
  piè di pagina con logotipo (`assets/wes-logotipo-srl.png`, dal modello Word), gruppo, indirizzo e dati societari;
  titoli Cambria blu #1F3864, testo Aptos, tabelle a griglia con intestazione #D9E2F3, totale #EAF0F8, totale finale #95B3D7.
  Aptos e Cambria non sono incorporati: chi non li ha installati vede Calibri/Segoe UI e Georgia.
- Una singola sezione più lunga di un foglio intero verrebbe tagliata (non capita con i limiti attuali).
- Font del modulo (interfaccia): Helvetica Neue dal design system WES (a licenza, non incluso; ripiego Helvetica/Arial).
- Numero d'offerta automatico `OFF-ANNO-NNNN` (`js/numerazione.js`, impostazioni in `CONFIG.numerazione`):
  senza registro condiviso si assegna alla prima apertura dell'anteprima, con SharePoint/Artifact al primo
  "Scarica PDF" (lì assegnarlo crea una riga nel registro); mai con i dati di esempio; poi resta all'offerta,
  anche dopo correzioni e nuovi PDF;
  anno da "Preventivo del" al momento dell'assegnazione (altrimenti l'anno in corso);
  2026 parte da 0148, gli altri anni da 0001. Nell'Artifact il progressivo viene dal registro condiviso
  (capability `db`, collezione `offerte`, un documento per numero con numero/anno/data); con Microsoft 365 dalla lista SharePoint.
- **Senza registro condiviso** (sito pubblicato senza SharePoint, o file aperto in locale) il numero è
  **anno + data della prima anteprima in formato mmgg**: `OFF-2026-1103` per un'offerta aperta in anteprima il 3 novembre.
  L'anno resta quello di "Preventivo del" (o l'anno in corso). Due offerte create lo stesso giorno, anche da
  colleghi diversi, hanno lo stesso numero.
- Il tipo di offerta (Commessa singola / Pacchetto commesse) resta quello scelto quando si attivano o tolgono i dati di esempio.
