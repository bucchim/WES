// Configurazione, voci del modulo e dati di esempio.
// Per cambiare voci, testi fissi o impostazioni si interviene qui.

const CONFIG = {
  // Numero offerta: PREFISSO-ANNO-PROGRESSIVO (es. OFF-2026-0148). L'anno è quello di "Preventivo del"
  // (o l'anno in corso); il progressivo riparte ogni anno da 1, salvo i valori di partenza indicati qui.
  // Senza registro condiviso (SharePoint o Artifact) il numero è PREFISSO-ANNO-MMGG, con mese e giorno
  // della prima apertura dell'anteprima PDF (es. OFF-2026-1103); cifre e partenza valgono solo per il progressivo di SharePoint.
  numerazione: { prefisso: 'OFF', cifre: 4, partenza: { 2026: 148 } },
  datiEsempioAllAvvio: false,    // true = all'avvio (senza offerta in corso) il modulo parte con i dati di esempio
  importiPagamentoAutomatici: true, // false = gli importi delle scadenze si inseriscono a mano
  firmaWesNelPdf: false,          // true = aggiunge lo spazio "Per WES — Firma" nel PDF
  maxEventiPacchetto: 10,         // righe massime nel Pacchetto commesse (oltre, la pagina 1 del PDF non basta)
  maxVociOggetto: 12,             // righe massime nell'Oggetto della Commessa singola
  maxCondizioni: 10,              // condizioni particolari massime
  chiaveAutosalvataggio: 'wes-offerta-autosave',

  // Microsoft 365 (vedi docs/guida-configurazione-microsoft365.md). Con tenantId e clientId compilati
  // il modulo chiede l'accesso con l'account aziendale e tiene il registro offerte nella lista SharePoint.
  // Lasciati vuoti, il modulo funziona senza accesso e con un contatore locale.
  microsoft: {
    tenantId: '',                                   // ID directory (tenant) di Microsoft Entra ID
    clientId: '',                                   // ID applicazione (client) dell'app registration
    sito: 'NOMETENANT.sharepoint.com:/sites/NOMESITO', // sito SharePoint che contiene la lista
    lista: 'Registro offerte',                      // nome della lista
    colonnaNumero: 'NumeroOfferta'                  // colonna del numero (lista creata da Excel); il numero va anche in Title
  }
};

// Copia profonda dei dati (servono copie indipendenti degli eventi del pacchetto).
const copia = (o) => JSON.parse(JSON.stringify(o));
const eventoVuoto = () => ({ desc: '', imp: '' });
const LIMITI_LISTE = { pkEventi: 'maxEventiPacchetto', ogVoci: 'maxVociOggetto', condizioni: 'maxCondizioni' };

// Carta intestata: riprende testata e piè di pagina del modello Word WES dell'offerta.
const CARTA_INTESTATA = {
  titolo: 'Worldwide Exhibition System S.r.l.',
  badge: 'assets/wes-badge-color.svg',         // badge ufficiale (design system WES), in alto a destra
  logotipo: 'assets/wes-logotipo-srl.png',     // logotipo "WORLDWIDE EXHIBITION SYSTEM s.r.l." del piè di pagina
  gruppo: 'A PART OF LUCA GREGOLI GROUP',
  indirizzo: '20159 Milano | via v. Civerchio, 4 | T +39 02 63.471.046 | F +39 02 62.695.096 | info@wesint.com | www.wesint.com',
  datiSocietari: 'C.F. e P. IVA 05592110968 | REA: 1834008 | Nr. Iscr. Reg. Imprese Mi05592110968 | Capitale Sociale: euro 15.000,00 i.v.'
};

// 1. Oggetto dell'offerta (Commessa singola) — righe proposte in un'offerta nuova. Descrizione e corrispettivo
// sono modificabili e se ne possono aggiungere o togliere. Nelle versioni precedenti ogni voce era un campo fisso
// (campo): serve solo a recuperare le offerte salvate prima del cambio.
const VOCI_OGGETTO = [
  { campo: 'ogIdea',  etichetta: 'Ideazione e progettazione' },
  { campo: 'ogStand', etichetta: 'Stand a noleggio come da layout' },
  { campo: 'ogPers',  etichetta: 'Spese nostro personale on-site' },
  { campo: 'ogOrg',   etichetta: 'Organizzazione, Coordinamento e Gestione' },
  { campo: 'ogAltro', etichetta: 'Altre componenti di offerta', descrizione: 'ogAltroDesc' }
];
const vociOggettoIniziali = () => VOCI_OGGETTO.map(v => ({ desc: v.etichetta, imp: '' }));

// 2. Servizi fiera — ognuno può essere "importo" oppure "TBD" (l'ultimo ha descrizione libera).
const SERVIZI = [
  'Allacciamento e fornitura elettrica',
  'Carico-scarico mezzi, movimentazione interna fiera e stivaggio vuoti',
  'Punti appendimento, sollevamento e relazioni',
  'Servizio pulizie giornaliere',
  'Connessione Internet',
  'Hostess / Steward',
  'Catering',
  'Altri servizi'
];
const SERVIZIO_CON_DESCRIZIONE = 7;

const SEZIONI = [
  { id: 'sec-0', num: '—',  titolo: 'Cliente e commessa' },
  { id: 'sec-1', num: '01', titolo: 'Oggetto dell’offerta' },
  { id: 'sec-2', num: '02', titolo: 'Servizi fiera' },
  { id: 'sec-3', num: '03', titolo: 'Modifiche progettuali' },
  { id: 'sec-4', num: '04', titolo: 'Condizioni di pagamento' },
  { id: 'sec-5', num: '05', titolo: 'Condizioni particolari' },
  { id: 'sec-6', num: '06', titolo: 'Accettazione' }
];

// Testi contrattuali fissi, riportati identici nel modulo e nel PDF.
const TESTI = {
  oggetto: 'La presente Offerta riguarda la fornitura relativa alla commessa sopra identificata.',
  iva: 'IVA di legge esclusa.',
  // Pacchetto commesse (modello WES di offerta pluriennale)
  oggettoPacchetto: 'La presente Offerta riguarda la fornitura relativa alla commessa sopra identificata.',
  pacchettoLayout: 'I corrispettivi indicati sono riferiti ai layout di progetto trasmessi in allegato alla mail di offerta e alle metrature di stand riportate in tabella. Il preventivo di dettaglio di ciascun evento sarà fornito con documento separato in sede di approvazione finale del relativo progetto. Qualora il Cliente richieda progetti diversi da quelli approvati o una variazione della superficie o della configurazione dello spazio espositivo, i corrispettivi saranno oggetto di nuova valorizzazione.',
  pacchettoComprende: 'L’offerta comprende, per ogni evento: ideazione e progettazione; stand a noleggio come da layout, spese nostro personale on-site; organizzazione, coordinamento e gestione.',
  esclusioni: 'Eventuali attività o forniture non espressamente indicate nella presente Offerta sono escluse dal corrispettivo e, qualora richieste, saranno oggetto di separata valorizzazione.',
  importiNonDisponibili: 'Gli importi non disponibili alla data dell’Offerta saranno addebitati sulla base dei costi effettivamente applicati dai soggetti erogatori.',
  feeAnticipazione: 'In caso di anticipazione da parte di WES, i costi effettivamente sostenuti saranno riaddebitati al Cliente applicando una fee di gestione del {fee}%.',
  cicliInclusi: 'Il corrispettivo comprende n. {cicli} cicli di modifica progettuale successivi alla presentazione della proposta.',
  definizioneCiclo: 'Per ciclo di modifica progettuale si intende l’insieme coordinato delle modifiche comunicate dal Cliente a seguito della presentazione di una versione del progetto.',
  variazioneImporti: 'Gli importi indicati nella presente Offerta sono determinati sulla base del progetto e delle caratteristiche della fornitura esistenti alla data di redazione del preventivo. Qualsiasi modifica richiesta successivamente dal Cliente potrà comportare una variazione degli importi indicati qualora incida su dimensioni, quantità, materiali, componenti, lavorazioni, logistica, servizi o altri elementi che concorrono alla determinazione del costo della fornitura.',
  modalitaPagamento: 'Modalità: bonifico bancario sulle coordinate indicate in fattura.',
  condizioniIntro: 'Le Parti concordano le seguenti condizioni specifiche:',
  condizioniPrevalenza: 'Le condizioni particolari sopra riportate prevalgono sulle Condizioni Generali di Fornitura esclusivamente per gli aspetti espressamente disciplinati.',
  accettazione: 'La sottoscrizione della presente Offerta comporta per il Cliente la conferma dell’ordine e l’accettazione delle Condizioni Generali di Fornitura WES che ne costituiscono parte integrante.'
};

const VUOTO = {
  numOfferta: '', spId: '',   // spId = ID della riga nella lista SharePoint (registro offerte)
  cliRag: '', cliPiva: '', cliRef: '', cliMail: '', numCommessa: '', cmEvento: '', cmData: '', cmLuogo: '', cmPrev: '', cmVal: '',
  ogModo: 'singola', ogVoci: vociOggettoIniziali(), pkEventi: [eventoVuoto(), eventoVuoto()],
  ogSconto: '',
  s0m: 'imp', s0v: '', s1m: 'imp', s1v: '', s2m: 'imp', s2v: '', s3m: 'imp', s3v: '',
  s4m: 'imp', s4v: '', s5m: 'imp', s5v: '', s6m: 'imp', s6v: '', s7m: 'imp', s7v: '', s7desc: '',
  fee: '', mpCicli: '', mpCosto: '', pgPct1: '', pgPct2: '', pgPct3: '', pgMan1: '', pgMan2: '', pgMan3: '',
  pgLabel2: '', pgTermini: '30', condizioni: ['']   // termini: 30 giorni data fattura, modificabile
};

const ESEMPIO = {
  numOfferta: '',
  cliRag: 'Industriale S.p.A.', cliPiva: 'IT02345678901', cliRef: 'Elena Bertani', cliMail: 'e.bertani@rossi-industriale.it',
  cmEvento: 'Salone del Mobile 2027 — Pad. 7, Stand B21', cmData: '13–18 aprile 2027', cmLuogo: 'Fiera Milano Rho',
  numCommessa: 'C-2027-031', cmPrev: '20/08/2026', cmVal: '30 giorni',
  ogModo: 'singola',
  ogVoci: [
    { desc: 'Ideazione e progettazione', imp: '12.500,00' },
    { desc: 'Stand a noleggio come da layout', imp: '68.400,00' },
    { desc: 'Spese nostro personale on-site', imp: '7.200,00' },
    { desc: 'Organizzazione, Coordinamento e Gestione', imp: '9.800,00' },
    { desc: 'Altre componenti di offerta: grafiche e stampe di allestimento', imp: '4.300,00' }
  ],
  pkEventi: [ // eventi inventati, usati se nei dati di esempio si passa a "Pacchetto commesse"
    { desc: 'Salone del Mobile Milano 2027 – stand a noleggio 96 mq', imp: '128.000,00' },
    { desc: 'Maison&Objet Parigi 2028 – stand a noleggio 60 mq', imp: '84.500,00' },
    { desc: 'Salone del Mobile Milano 2029 – stand a noleggio 96 mq', imp: '128.000,00' }
  ],
  ogSconto: '5.900,00',
  s0m: 'imp', s0v: '3.400,00', s1m: 'tbd', s1v: '', s2m: 'imp', s2v: '2.150,00', s3m: 'imp', s3v: '890,00',
  s4m: 'tbd', s4v: '', s5m: 'imp', s5v: '1.600,00', s6m: 'tbd', s6v: '', s7m: 'imp', s7v: '1.200,00',
  s7desc: 'Fotografo e video timelapse allestimento',
  fee: '8', mpCicli: '2', mpCosto: '850,00',
  pgPct1: '30', pgPct2: '40', pgPct3: '30', pgMan1: '', pgMan2: '', pgMan3: '',
  pgLabel2: 'consegna progetto esecutivo', pgTermini: '30',
  condizioni: [
    'Lo smontaggio e lo sgombero dell’area sono compresi nel corrispettivo indicato al punto 1.',
    'Eventuali costi di rifacimento grafiche derivanti da nuovi file cliente sono esclusi.'
  ]
};
