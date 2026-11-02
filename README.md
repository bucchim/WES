# Modulo Offerta WES

Modulo per compilare l'**Offerta economica e conferma d'ordine** WES e generarla in PDF su carta intestata.
HTML, CSS e JavaScript semplici: nessuna installazione, nessun passaggio di compilazione.

## Come si apre

- Doppio clic su `index.html` (Chrome o Edge), oppure
- da Claude Code, con il server di anteprima `modulo-offerta-progetto` (`.claude/launch.json`).

## Cosa fa

- **Compilazione** con calcolo automatico di totale, sconto, totale riservato e rate di pagamento.
- **Oggetto dell'offerta** in due modalità: *Commessa singola* (voci fisse) oppure *Pacchetto commesse*
  (un evento per riga con corrispettivo, fino a `CONFIG.maxEventiPacchetto`; nel PDF: Totale pacchetto stand,
  Sconto con percentuale, Totale finale a voi riservato e i testi fissi del modello pluriennale).
- **Controllo dell'offerta**: campi obbligatori, importi non numerici, percentuali che non fanno 100%, ecc.
- **Bozze**: "Salva bozza" scarica un file `.json`, "Apri bozza" lo ricarica. L'ultima offerta resta inoltre
  memorizzata nel browser (solo su quel PC e in quel browser).
- **PDF**: "Anteprima PDF" → "Scarica PDF" apre la stampa del browser; scegliere **Salva come PDF**.
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
| Comportamento (bozze, anteprima, eventi) | `js/app.js` |
| Aspetto | `css/style.css` |

## Note

- Il PDF riproduce il modello Word WES dell'offerta: badge in alto a destra (`assets/wes-badge-color.svg`, dal design system),
  piè di pagina con logotipo (`assets/wes-logotipo-srl.png`, dal modello Word), gruppo, indirizzo e dati societari;
  titoli Cambria blu #1F3864, testo Aptos, tabelle a griglia con intestazione #D9E2F3, totale #EAF0F8, totale finale #95B3D7.
  Aptos e Cambria non sono incorporati: chi non li ha installati vede Calibri/Segoe UI e Georgia.
- Una singola sezione più lunga di un foglio intero verrebbe tagliata (non capita con i limiti attuali).
- Font del modulo (interfaccia): Helvetica Neue dal design system WES (a licenza, non incluso; ripiego Helvetica/Arial).
- Numero d'offerta automatico `OFF-ANNO-NNNN` (`js/numerazione.js`, impostazioni in `CONFIG.numerazione`):
  assegnato alla creazione dell'offerta ("Nuova offerta", uscita dai dati di esempio, apertura del modulo con
  un'offerta in corso senza numero; non con i dati di esempio), altrimenti al primo "Salva bozza" o "Scarica PDF";
  anno da "Preventivo del" al momento dell'assegnazione (altrimenti l'anno in corso);
  2026 parte da 0148, gli altri anni da 0001. Nell'Artifact il progressivo viene dal registro condiviso
  (capability `db`, collezione `offerte`, un documento per numero con numero/anno/data); in locale da un
  contatore del browser, quindi va verificato a mano. "Nuova offerta" svuota il modulo per un nuovo numero.
