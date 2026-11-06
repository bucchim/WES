# Specifiche: Scheda regolamenti fiera

Versione 1.1 del 5 novembre 2026. Stato: pronta per l'avvio dello sviluppo. Le decisioni di impostazione sono state prese da Giorgio e stanno al punto 13.

## 1. Obiettivo e utenti

Oggi un progettista o un PM legge a mano il regolamento tecnico di ogni fiera per ricavare altezze, sospensioni, soppalchi, chiusure, cielinature, adempimenti e tempi. L'app automatizza la lettura e lascia al PM il controllo. L'utente carica uno o più PDF (ente fiera e/o organizzatore) e ottiene una scheda tecnica in PDF.

Gli utenti sono i PM di WES, da due a una decina. Ogni PM lavora sul proprio file di lavoro: il server non conserva schede e non esiste uno stato condiviso tra PM.

## 2. Flusso

Il PM entra con il codice d'accesso e indica il proprio nome. All'apertura sceglie tra due strade: iniziare una scheda nuova, caricando uno o più PDF di regolamenti (ente fiera e/o organizzatore), oppure riprendere un lavoro, caricando il file di lavoro (.json) salvato in precedenza dall'app, con o senza nuovi regolamenti da aggiungere. Per riprendere si carica il file di lavoro e non il PDF, che serve solo per la consegna. L'app estrae le voci, o le ripristina dal file di lavoro, e le mostra nelle schede a colori. Una chat a lato accompagna il PM sulle voci "Da verificare" e "Non specificato", una per volta, e registra le risposte. Quando le risposte mancano perché si attende l'ente fiera, il PM salva il file di lavoro e chiude. Quando tutte le voci sono chiuse o esplicitamente parcheggiate, stampa il PDF di consegna con la dicitura "Versione del giorno". Il PDF si può produrre in ogni momento, anche con voci aperte, e in quel caso porta la dicitura "BOZZA".

## 3. Stati delle voci

Tre stati nascono dall'estrazione. "Confermato": la citazione contiene letteralmente il dato ed è stata trovata dal codice nel PDF. "Da verificare": il passaggio è ambiguo, condizionato, rimanda ad altro documento o richiede di combinare più frasi. "Non specificato": il regolamento non tratta il parametro.

Altri tre nascono dall'intervento del PM, e sono la novità rispetto alla scheda prodotta a mano. "Chiarito dal PM": il PM ha fornito il valore, indicando la fonte (per esempio "risposta dell'ente fiera via mail del 12/11") e la data; l'app registra l'autore. "Non applicabile": il parametro non riguarda il progetto. "In attesa": il PM ha una domanda aperta con un interlocutore esterno e annota chi e da quando.

Una voce "Chiarito dal PM" non diventa mai "Confermato". La differenza va resa visibile anche nel PDF, perché chi legge deve sapere quale dato viene dal regolamento e quale da una conferma successiva.

Quando due fonti caricate dicono cose diverse sullo stesso parametro (regolamento dell'ente e dell'organizzatore), l'app mostra entrambi i valori con la rispettiva fonte e porta la voce a "Da verificare". Il software non decide quale prevalga.

## 4. Sezioni

La scheda ha dieci sezioni, lettera A-J, ciascuna con un colore di fondo proprio. Titoli e colori sono già definiti nell'artifact di riferimento, che resta la fonte per l'aspetto (variabili CSS --h e --s per scheda):

A Altezze per tipo di stand. B Sospensioni e soppalchi. C Chiusure perimetrali. D Appendimenti e alimentazione dall'alto. E Cielinature, coperture e controsoffitti. F Sicurezza e antincendio. G Forma, finiture e operatività. H Adempimenti e scadenze. I Montaggio e smontaggio. J Accessi e mezzi. A queste si aggiunge una scheda neutra, "Punti da verificare", che raccoglie le voci aperte di tutte le sezioni.

Dentro ogni sezione le voci sono ordinate per stato: prima le confermate, poi le da verificare, poi le non specificate. Il verde, l'ambra e il rosso devono restare distinguibili a colpo d'occhio, con un simbolo diverso per ogni stato oltre al colore, tema chiaro e scuro, e il rosso senza righe di sfondo. Sono scelte già fatte nell'artifact.

Le otto sezioni originali (A-H nel prompt di estrazione) nascono dall'elenco delle informazioni che servono alla progettazione WES, non da un regolamento in particolare, e comprendono già una voce di raccolta per le prescrizioni non previste (ultima voce della sezione F). La riorganizzazione in dieci schede è stata fatta sul caso NPE solo per alleggerire le schede più dense: A diventa A e B, C e D confluiscono in D, F diventa F e G, H diventa I e J. Le dieci sezioni sono fisse. Il modello assegna ogni voce estratta a una sezione e le prescrizioni non previste vanno in "Altre prescrizioni" dentro la sezione più vicina. Le sezioni vuote si mostrano ridotte. In collaudo, su una seconda fiera, si controlla che titoli come "Altezze per tipo di stand" reggano anche quando il regolamento non distingue i tipi di stand; in caso contrario si rende il titolo più neutro.

## 5. Modello dati

Ogni scheda (una per fiera) è un unico documento JSON. Il server non lo conserva: vive nel browser del PM e nel file di lavoro (punto 8). Gli identificativi delle voci sono stabili: per i parametri previsti dal prompt di estrazione usano uno slug fisso (per esempio `altezza_max_inline`), per le prescrizioni aggiuntive uno slug derivato dal titolo. La ri-estrazione dopo il caricamento di un nuovo PDF fonde le voci per identificativo e non cancella mai le risposte del PM.

```json
{
  "id": "npe2027",
  "commessa": { "numero": "001-2027", "pm": "Nome Cognome" },
  "fiera": { "nome": "NPE2027", "edizione": "2027", "date": "2027-05-03/2027-05-07" },
  "creata": { "da": "Nome Cognome", "il": "2026-11-05T11:00:00Z" },
  "aggiornata": { "da": "Nome Cognome", "il": "2026-11-06T09:30:00Z" },
  "fonti": [
    { "id": "f1", "file": "NPE_Show_Rules_and_Regulations.pdf", "ruolo": "ente", "pagine": 32, "sha256": "..." }
  ],
  "voci": [
    {
      "id": "altezza_max_inline",
      "sezione": "A",
      "parametro": "Altezza max, booth inline e corner",
      "valore": "8 ft, solo nei 5 ft posteriori",
      "citazioni": [
        { "fonte": "f1", "pagina": 1, "testo": "Maximum height of 8ft. ; permitted only in the rear five feet of the booth space.",
          "verificata": true, "metodo": "testo" }
      ],
      "stato": "confermato",
      "chiarimento": null,
      "note": null
    }
  ],
  "chat": [ { "voce": "altezza_max_inline", "ruolo": "assistente", "testo": "...", "il": "..." } ]
}
```

Per le voci chiarite, `chiarimento` contiene `{ "valore", "fonte", "da", "il", "tipo": "chiarito|non_applicabile|in_attesa", "nota" }`. `metodo` della citazione vale `testo` (trovata nel livello di testo del PDF) oppure `ocr` (trovata dopo lettura ottica).

## 6. Pipeline di estrazione e verifica

**Lettura dei PDF.** Per ogni pagina il backend ricava il testo con una libreria PDF e controlla che sia leggibile (per esempio quota di parole riconoscibili e caratteri fuori alfabeto). Se non lo è, rende la pagina come immagine a 200 dpi e la passa a Tesseract. Il runtime Node standard di Render non include questi strumenti: la soluzione (tesseract.js con pdfjs, oppure deploy con Dockerfile) si sceglie e si prova in fase 1, anche rispetto alla memoria del piano gratuito. Collaudo già fatto a mano sulla pagina 1 dell'Appendice A: il livello di testo è illeggibile, la lettura ottica restituisce correttamente "Maximum height of 8ft. ; permitted only in the rear five feet of the booth space." Il metodo di lettura resta registrato su ogni citazione.

**Estrazione in più passate.** Il PDF non si invia in una sola chiamata che produce tutte le voci. Si fa una chiamata per gruppo di sezioni (due o tre sezioni per chiamata), ciascuna con output strutturato (schema JSON via tool use) e con il PDF in cache. Poiché il server non conserva nulla, il frontend rinvia i file a ogni chiamata e orchestra le chiamate gruppo per gruppo, mostrando l'avanzamento: nessuna richiesta HTTP deve durare a lungo. Motivo: la prima versione della webapp del brief troncava l'output quando eccedeva la pagina, e qui le voci sono quasi novanta. Se una risposta termina per limite di token (`stop_reason: max_tokens`), l'app divide ulteriormente il gruppo e ripete, senza mai consegnare un output troncato come completo.

**Modello.** In esercizio l'app usa la versione più aggiornata di Sonnet, scelta per contenere i token delle chiamate API. Il nome del modello sta nella variabile d'ambiente `MODELLO`, valore iniziale `claude-sonnet-5-5`. Se il collaudo dovesse mostrare una quota bassa di voci confermate, si valuta un modello più capace solo per le sezioni critiche.

**Prompt.** Il punto di partenza è `reference/prompt/Estrazione_regolamenti_fiera_NotebookLM.docx`, usato finora a mano. Va adattato: elenco dei parametri con i loro identificativi, regole di accuratezza invariate (nessuna deduzione, nessuna combinazione di frasi, citazione letterale, nel dubbio "Da verificare"), distinzione delle tre fasi dei tempi (allestimento, disallestimento, accesso espositori) e dei mezzi, divieto di confondere orario espositori e apertura al pubblico.

**Verifica deterministica.** Dopo l'estrazione il codice controlla ogni citazione: normalizza testo e citazione (minuscole, spazi, apostrofi e trattini tipografici, sillabazione a fine riga) e cerca la citazione nella pagina indicata, poi nelle pagine vicine. Se la trova, la voce resta "Confermato" con pagina corretta. Se non la trova, la voce è declassata a "Da verificare" con l'etichetta "citazione non trovata nel documento". Lo script `reference/verifica/check2.py` contiene la normalizzazione già collaudata. Questa è la parte che rende la scheda affidabile e deve avere test automatici propri.

**Audit dei non specificati (fase successiva).** Per le voci "Non specificato" si può fare una ricerca per parole chiave nel testo (per esempio "sprinkler", "mezzanine", "hanging") e segnalare al PM i punti in cui compaiono. È un miglioramento, non un requisito della prima versione.

## 7. Chat di risoluzione

La chat lavora su una voce alla volta, nell'ordine delle sezioni, partendo dalle voci aperte. Per ogni voce l'assistente mostra il parametro, la citazione trovata (se c'è), il motivo per cui è aperta, e chiede al PM una risposta. Il PM può rispondere con il valore e la fonte, scegliere "Non applicabile", oppure "In attesa" indicando chi deve rispondere. L'assistente riformula la risposta in una riga e chiede conferma prima di registrarla. Può suggerire la domanda da inoltrare all'ente fiera, in inglese o nella lingua del regolamento, utile quando la voce resta in attesa.

L'assistente non inventa valori, non propone numeri tipici del settore e non commenta la risposta del PM salvo per segnalare incoerenze con altre voci già registrate (per esempio un'altezza chiarita superiore al limite degli elementi sospesi). Ogni chiamata include solo la voce corrente, le sue citazioni e le risposte già date alle voci collegate: niente PDF intero.

## 8. Bozze: il file di lavoro

Il server non salva nulla. Per interrompere e riprendere un lavoro il PM scarica un file di lavoro in formato JSON, con nome del tipo `NPE2027_001-2027_bozza.json`, che contiene la scheda completa: voci, stati, citazioni con pagina e metodo di verifica, risposte del PM con autore e data, esito della chat. Per riprendere il lavoro lo ricarica nella webapp e ritrova la scheda identica, senza rifare l'estrazione e senza rileggere i regolamenti. Se arrivano nuovi regolamenti (per esempio quello dell'organizzatore), li carica insieme al file di lavoro: l'app estrae dai nuovi file e fonde le voci per identificativo, senza toccare le risposte del PM. Dove due fonti divergono porta la voce a "Da verificare" e mostra entrambi i valori.

Il PDF di consegna non serve a riprendere il lavoro e va spiegato ai PM. Per evitare errori l'app riconosce i PDF che ha prodotto (dalla dicitura fissa in testa alla prima pagina) e, se vengono caricati al posto del file di lavoro o come regolamento, li respinge con il messaggio "Questo è il PDF di consegna. Per riprendere il lavoro carica il file di lavoro (.json)".

La firma. Il file di lavoro contiene i dati e una firma calcolata dal server con un segreto proprio (variabile `FIRMA_SEGRETO`, mai nel repository). L'app verifica la firma al caricamento. Serve a impedire che un file modificato a mano faccia passare per verificata una citazione che non lo è. Se la firma manca o non torna, per esempio perché il file è stato modificato o il segreto è cambiato, l'app non scarta il lavoro: importa le voci, porta a "Da verificare" tutte quelle "Confermato" e chiede di ricaricare i regolamenti, sui quali la verifica deterministica delle citazioni rigira. Le risposte del PM sono mantenute.

Perdita del lavoro. La scheda si salva anche in automatico nella memoria del browser, come rete di sicurezza contro la chiusura accidentale, sul modello di quanto già fa la webapp del brief. Vale solo per quel computer e quel browser: la copia che conta è il file di lavoro.

Avviso di uscita. L'app tiene un indicatore "modifiche non salvate", che si accende a ogni intervento sulla scheda e si spegne quando il PM scarica il file di lavoro. La stampa del PDF non lo spegne. Finché è acceso, il tentativo di chiudere la scheda del browser, ricaricare la pagina o uscirne verso un altro indirizzo apre un popup di conferma (evento `beforeunload`). I browser moderni mostrano per questo evento un testo standard e non permettono di personalizzarlo: va bene così. Le azioni interne all'app che abbandonano la scheda in corso (nuova scheda, apertura di un altro file di lavoro) aprono invece un avviso proprio, con il testo scritto da noi e tre scelte: salva il file di lavoro, esci senza salvare, annulla.

## 9. Export

L'unica uscita verso l'utente è il PDF di consegna, oltre al file di lavoro del punto 8. Il PDF si ottiene come nella webapp del brief: pulsante "Stampa / PDF" che apre la finestra di stampa del browser, con foglio di stile di stampa dedicato (`@media print`, `@page`, colori forzati con `print-color-adjust: exact`). Nessuna libreria PDF. Il codice di stampa del brief, in `reference/wes-brief-ai/widget/index.html`, è il punto di partenza. Lo stile segue l'artifact di riferimento: sezioni con la propria tinta, simboli distinti per stato, rosso senza righe. Intestazione con dicitura fissa riconoscibile dall'app, fiera, date, fonti caricate, numero di commessa, nome del PM, data dell'ultimo intervento e riepilogo dei conteggi per stato. Le voci "Chiarito dal PM" e "In attesa" sono marcate in modo distinto e riportano fonte e data.

Campi obbligatori. Il nome del PM e il numero di commessa sono obbligatori sia nel PDF sia nel file di lavoro. Stanno nell'intestazione della scheda aperta, con il nome precompilato dall'accesso e modificabile. Se il PM prova a scaricare il file di lavoro senza compilarli, l'app non genera il file, apre un avviso che nomina il campo mancante e porta il cursore sul campo. Lo stesso avviene con il pulsante "Stampa / PDF" e con la scorciatoia di stampa del browser, che l'app intercetta. Poiché il browser non permette di bloccare la stampa avviata da menu o da altre vie, se i campi sono vuoti il PDF stampa in testa una dicitura rossa "Nome PM e numero di commessa mancanti", visibile a chi lo riceve. Il numero di commessa ha il formato tre cifre, trattino, anno a quattro cifre (per esempio `001-2027`), cioè l'espressione regolare `^\d{3}-\d{4}$`. Un valore che non rispetta il formato è trattato come un campo mancante e produce lo stesso avviso, con l'esempio del formato corretto.

Un PDF con voci ancora aperte porta la dicitura "BOZZA" in intestazione. Senza voci aperte, o con voci aperte esplicitamente parcheggiate dal PM, porta "Versione del giorno" con data.

## 10. Interfaccia

Una pagina sola, tre stati: apertura (scheda nuova o ripresa da file di lavoro), scheda aperta con chat laterale, anteprima di export. Il modello visivo è `reference/design/npe2027-schede.html`: schede orizzontali a tutta larghezza con binario a sinistra (lettera, titolo, conteggi) e tessere a destra, navigazione per lettera, filtro per stato che nasconde anche le schede rimaste vuote. L'artifact è generato da `reference/design/generatore/gen.js` a partire dai dati: può servire come base, ma nell'app la pagina deve costruirsi nel browser dal JSON della scheda. Layout verificato a 400 e 1320 pixel, senza scroll orizzontale. Font: Big Shoulders Display, Source Sans 3, IBM Plex Mono da Google Fonts.

## 11. Collaudo

Il caso di prova è NPE2027: due PDF in `fixtures/regolamenti/` e la scheda corretta in `fixtures/golden/NPE2027_golden_8sezioni.json`. Il file golden ha 87 voci in otto sezioni (la numerazione A-H è quella originale, antecedente alla riorganizzazione A-J): 60 confermate, 14 da verificare, 13 non specificate. Ogni voce confermata è stata ricontrollata a mano sul PDF, comprese le pagine dell'Appendice A con livello di testo corrotto.

Poiché il modello non è deterministico, il collaudo non cerca l'identità con il golden ma quattro soglie. Primo: zero citazioni "Confermato" non presenti nel PDF (verificato dal codice, quindi vale per costruzione, ma va testato con una citazione inventata di proposito). Secondo: almeno il 90 per cento delle voci confermate del golden ritrovate con stesso valore. Terzo: nessuna voce non specificata del golden trasformata in confermata. Quarto: le pagine dell'Appendice A vengono lette per via ottica e le citazioni vi trovano riscontro.

Prove aggiuntive: estrazione che termina per limite di token (simulata riducendo `max_tokens`) senza output troncato in scheda; file di lavoro salvato e ricaricato, con scheda identica e risposte del PM intatte; file di lavoro modificato a mano, che deve essere riconosciuto come non valido con le voci confermate riportate a "Da verificare"; file di lavoro ricaricato insieme a un nuovo regolamento, con fusione per identificativo; PDF di consegna caricato al posto del file di lavoro o come regolamento, che deve essere respinto con il messaggio previsto; tentativo di scaricare il file di lavoro o di stampare il PDF senza nome del PM, senza numero di commessa o con un numero nel formato sbagliato (per esempio `1-27`), che deve produrre l'avviso e, per il file di lavoro, nessun file, e per la stampa lanciata con altre vie la dicitura rossa in testa; popup di uscita acceso con modifiche non salvate e assente subito dopo il salvataggio del file di lavoro; PDF scansionato senza testo; PDF protetto da password con messaggio chiaro; file diverso da PDF.

## 12. Fasi

Fase 1, estrazione. Backend con caricamento PDF, lettura con fallback ottico, estrazione a gruppi, verifica delle citazioni, scheda JSON. Si prova da riga di comando sul caso NPE2027 e si misurano le quattro soglie. Fase 2, schede a video. Frontend dal JSON, filtri, tema chiaro e scuro, apertura di scheda nuova o di file di lavoro. Fase 3, chat e file di lavoro. Chat di risoluzione, stato "In attesa", salvataggio e ripresa del file di lavoro firmato, salvataggio automatico nel browser, popup di uscita. Fase 4, export e deploy. PDF di consegna con foglio di stile di stampa, campi obbligatori con avviso, deploy su Render con README di installazione, codice d'accesso e segreto di firma. Ogni fase termina con una demo e con l'ok di Giorgio prima della successiva.

## 13. Decisioni assunte

Prese da Giorgio il 5 novembre 2026.

1. Persistenza: nessuna sul server. Il lavoro si conserva nel file di lavoro JSON firmato (punto 8). Per riprendere una scheda il PM carica quel file e non il PDF, che serve solo alla consegna. Il servizio può restare sul piano gratuito di Render, che dopo un periodo di inattività si riavvia alla prima richiesta.
2. Accesso: codice d'accesso unico con nome del PM dichiarato a mano, come nella webapp del brief. Il nome serve ad attribuire le risposte, non è un'autenticazione.
3. Infrastruttura: repository GitHub, servizio Render e chiave API creati apposta per il Team WES AI. La chiave e il relativo credito fanno capo al Team WES AI.
4. Export con voci aperte: consentito, con dicitura "BOZZA" in intestazione.
5. Lingue dei regolamenti: inglese certo (NPE); italiano, tedesco, spagnolo e francese da prevedere nel prompt. Output sempre in italiano, citazioni nella lingua originale.
6. Conservazione dei PDF caricati: nessuna sul server. I regolamenti passano in memoria per la durata della richiesta, come nel servizio del brief. Per riverificare le citazioni dopo una ripresa il PM ricarica i regolamenti, oppure si fida della firma del file di lavoro.

7. Sezioni: dieci schede fisse A-J, uguali per ogni fiera.
8. Export: PDF ottenuto con la stampa del browser, come nella webapp del brief, senza libreria PDF.
9. Numero di commessa: formato `NNN-AAAA`, per esempio `001-2027` (punto 9).

## 14. Fuori perimetro della prima versione

Confronto automatico tra edizioni della stessa fiera, elenco condiviso delle schede aperte, notifiche, integrazioni con altri strumenti, modifica collaborativa in tempo reale, conversione di unità, ricerca del regolamento sul web, gestione di scansioni di bassa qualità oltre il fallback ottico.
