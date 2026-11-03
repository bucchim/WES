// Microsoft 365: accesso con l'account aziendale (MSAL) e registro offerte su una lista SharePoint
// (Microsoft Graph, con i permessi dell'utente collegato). Si attiva solo se CONFIG.microsoft ha
// tenantId e clientId: altrimenti il modulo funziona come prima, senza accesso.
// Nel registro vanno solo dati anagrafici e di avanzamento, mai importi.

const MS = { app: null, account: null, sitoId: null, listaId: null };
const SCOPE_GRAPH = ['User.Read', 'Sites.ReadWrite.All'];
const GRAPH = 'https://graph.microsoft.com/v1.0';

const msConfigurato = () => !!(CONFIG.microsoft && CONFIG.microsoft.tenantId && CONFIG.microsoft.clientId);
const msCollegato = () => msConfigurato() && !!MS.account;

// Prepara MSAL e completa un eventuale ritorno dalla pagina di accesso Microsoft.
// Restituisce true se c'è un utente collegato.
async function msAvvia() {
  if (!msConfigurato()) return false;
  if (!window.msal) throw new Error('libreria di accesso Microsoft non caricata');
  MS.app = new window.msal.PublicClientApplication({
    auth: {
      clientId: CONFIG.microsoft.clientId,
      authority: 'https://login.microsoftonline.com/' + CONFIG.microsoft.tenantId,
      redirectUri: location.origin + location.pathname   // va registrato identico nell'app registration
    },
    cache: { cacheLocation: 'localStorage' }
  });
  if (MS.app.initialize) await MS.app.initialize();
  const ritorno = await MS.app.handleRedirectPromise();
  MS.account = (ritorno && ritorno.account) || MS.app.getAllAccounts()[0] || null;
  return !!MS.account;
}

const msAccedi = () => MS.app.loginRedirect({ scopes: SCOPE_GRAPH });
const msEsci = () => MS.app.logoutRedirect({ account: MS.account });
const msNomeUtente = () => MS.account ? (MS.account.name || MS.account.username) : '';

async function msToken() {
  try {
    return (await MS.app.acquireTokenSilent({ scopes: SCOPE_GRAPH, account: MS.account })).accessToken;
  } catch (e) {
    if (e instanceof window.msal.InteractionRequiredAuthError) await MS.app.acquireTokenRedirect({ scopes: SCOPE_GRAPH, account: MS.account });
    throw e;
  }
}

async function graph(metodo, percorso, corpo, intestazioni = {}) {
  const risposta = await fetch(percorso.startsWith('http') ? percorso : GRAPH + percorso, {
    method: metodo,
    headers: Object.assign({ Authorization: 'Bearer ' + await msToken(), 'Content-Type': 'application/json' }, intestazioni),
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  if (!risposta.ok) throw new Error('Graph ' + risposta.status + ': ' + (await risposta.text()).slice(0, 300));
  return risposta.status === 204 ? null : risposta.json();
}

// Percorso Graph della lista; sito e lista si risolvono una volta sola.
async function msLista() {
  if (!MS.sitoId) MS.sitoId = (await graph('GET', '/sites/' + CONFIG.microsoft.sito)).id;
  if (!MS.listaId) MS.listaId = (await graph('GET', '/sites/' + MS.sitoId + '/lists/' + encodeURIComponent(CONFIG.microsoft.lista))).id;
  return '/sites/' + MS.sitoId + '/lists/' + MS.listaId;
}

// Colonne del registro scritte dal modulo (nomi interni delle colonne SharePoint).
function campiRegistro(f) {
  return {
    Cliente: f.cliRag.trim(), Evento: f.cmEvento.trim(), Luogo: f.cmLuogo.trim(),
    DateEvento: f.cmData.trim(), PreventivoDel: f.cmPrev.trim(),
    Tipo: isPacchetto(f) ? 'Pacchetto commesse' : 'Commessa singola'
  };
}

// Il numero va nella colonna Title (sempre presente) e, se diversa, in CONFIG.microsoft.colonnaNumero.
function campiNumero(valore) {
  const campi = { Title: valore }, colonna = CONFIG.microsoft.colonnaNumero;
  if (colonna && colonna !== 'Title') campi[colonna] = valore;
  return campi;
}

// Crea la riga dell'offerta (al primo "Scarica PDF") e ne ricava il numero. Progressivo = partenza dell'anno + righe dello
// stesso anno create prima di questa: gli ID SharePoint crescono e non vengono riusati, quindi due
// colleghi che creano un'offerta nello stesso istante ottengono numeri diversi. Le righe non vanno
// cancellate (si usa Stato "Annullata"), altrimenti il conteggio scenderebbe.
async function numeroDaSharePoint(f) {
  const lista = await msLista(), anno = annoOfferta(f);
  const riga = await graph('POST', lista + '/items', { fields: Object.assign(campiNumero('in assegnazione'), { Anno: anno, Stato: 'Bozza' }, campiRegistro(f)) });
  const id = Number(riga.id);
  let precedenti = 0;
  let pagina = lista + '/items?$expand=fields($select=Anno)&$select=id&$filter=fields/Anno eq ' + anno + '&$top=999';
  while (pagina) {
    const p = await graph('GET', pagina, null, { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' });
    precedenti += p.value.filter(v => Number(v.id) < id).length;
    pagina = p['@odata.nextLink'] || null;
  }
  const n = partenzaAnno(anno) + precedenti;
  const numero = formattaNumero(anno, n);
  await graph('PATCH', lista + '/items/' + id + '/fields', Object.assign(campiNumero(numero), { Progressivo: n }));
  return { numero, id: String(id) };
}

// Aggiorna la riga dell'offerta (al salvataggio della bozza e a ogni PDF scaricato).
async function aggiornaRegistroSharePoint(f, extra) {
  if (!msCollegato() || !f.spId) return;
  const lista = await msLista();
  await graph('PATCH', lista + '/items/' + f.spId + '/fields', Object.assign(campiRegistro(f), extra || {}));
}
