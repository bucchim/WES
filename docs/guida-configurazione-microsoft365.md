# Modulo Offerta WES — configurazione Microsoft 365

Guida per l'IT: pubblicare il modulo come sito web aziendale, con accesso tramite account Microsoft WES
e registro offerte su una lista SharePoint.

## Come funziona, in breve

- **Sito**: Azure Static Web Apps (piano gratuito), collegato al repository GitHub `bucchim/WES`.
  Ogni modifica caricata su GitHub viene pubblicata da sola in un paio di minuti.
- **Accesso**: chi apre il sito entra con l'account Microsoft aziendale (libreria ufficiale MSAL).
  Senza accesso il modulo resta coperto dalla schermata "Accedi con Microsoft".
- **Registro**: al primo "Scarica PDF" di un'offerta il modulo aggiunge una riga alla lista SharePoint
  "Registro offerte", **con i permessi dell'utente collegato** (Microsoft Graph). Il numero d'offerta
  `OFF-ANNO-NNNN` si ricava dalla lista, quindi non si ripete anche se due colleghi lavorano insieme.
  La riga si aggiorna a ogni PDF scaricato.
- **Cosa va nel registro**: solo dati anagrafici e di avanzamento (numero, cliente, evento, luogo,
  date, tipo di offerta, stato, data dell'ultimo PDF; autore e data di creazione li aggiunge SharePoint).
  **Nessun importo.** Le offerte complete restano nel PDF di chi le compila.
- **Nessuna password o chiave nel codice**: un'app a pagina singola non usa client secret.

Tempo stimato: circa un'ora. Servono: amministratore Entra ID (o almeno Application Administrator,
più un Global/Privileged Role Administrator per il consenso), proprietario del sito SharePoint,
una sottoscrizione Azure (il piano gratuito di Static Web Apps non ha costi, ma la sottoscrizione deve esistere).

---

## Passo 1 — Lista SharePoint

1. Scegli il sito SharePoint che ospiterà la lista (ad esempio un sito "Commerciale" o un nuovo sito "Offerte").
   Annota il suo indirizzo, es. `https://wesint.sharepoint.com/sites/Offerte`.
2. **Modo rapido, da Excel**: nel sito **Nuovo → Elenco → Da Excel**, carica `docs/registro-offerte-sharepoint.xlsx`
   e scegli la tabella `RegistroOfferte`. Controlla i tipi proposti (Anno e Progressivo = Numero, UltimoPdf = Data e ora,
   Tipo e Stato = Scelta), chiama l'elenco **`Registro offerte`** e crea. Poi **cancella la riga di esempio** gialla
   e prosegui dal punto 4. Il foglio "Istruzioni" del file riporta gli stessi passi.
   Il numero d'offerta va nella colonna `NumeroOfferta` (e anche in `Title`): in `js/dati.js` lascia `colonnaNumero: 'NumeroOfferta'`.

   **Modo manuale**: **Nuovo → Elenco → Elenco vuoto**, nome **`Registro offerte`**, poi crea le colonne come al punto 3
   (in questo caso puoi usare la colonna `Title` per il numero e impostare `colonnaNumero: 'Title'`).
3. Colonne **con esattamente questi nomi** (senza spazi né accenti: il modulo usa i nomi interni,
   che SharePoint fissa alla creazione). Dopo puoi cambiare il nome visualizzato come preferisci.

   | Nome (da scrivere così) | Tipo | Note |
   |---|---|---|
   | `Title` (esiste già) | Una riga di testo | Il modulo ci scrive sempre il numero; nel modo manuale rinominala "Numero offerta" |
   | `NumeroOfferta` | Una riga di testo | Solo se crei la lista da Excel (è la colonna del numero) |
   | `Anno` | Numero | 0 decimali |
   | `Progressivo` | Numero | 0 decimali |
   | `Cliente` | Una riga di testo | |
   | `Evento` | Una riga di testo | |
   | `Luogo` | Una riga di testo | |
   | `DateEvento` | Una riga di testo | Testo libero, es. "13–18 aprile 2027" |
   | `PreventivoDel` | Una riga di testo | |
   | `Tipo` | Scelta | Valori: `Commessa singola`, `Pacchetto commesse` |
   | `Stato` | Scelta | Valori: `Bozza`, `Inviata`, `Accettata`, `Rifiutata`, `Annullata`; predefinito `Bozza` |
   | `UltimoPdf` | Data e ora | Includi l'ora |

   Puoi aggiungere altre colonne tue: il modulo le ignora. Se vuoi che il modulo le compili, va aggiunto nel codice
   (`campiRegistro` in `js/microsoft.js`).
4. **Indice su Anno** (serve al calcolo del numero): Impostazioni elenco → **Colonne indicizzate** →
   Crea nuovo indice → `Anno`.
5. **Permessi senza eliminazione.** Il numero si calcola contando le righe dell'anno: una riga cancellata
   farebbe ripetere un numero. Quindi chi usa il modulo può aggiungere e modificare, ma non cancellare
   (per annullare un'offerta si mette Stato = `Annullata`).
   - Impostazioni sito → **Autorizzazioni sito** → **Livelli di autorizzazione** → apri "Collaborazione"
     → **Copia livello di autorizzazione** → nome `Collabora senza eliminare` → togli **Elimina elementi**
     e **Elimina versioni** → Crea.
   - Nella lista: Impostazioni elenco → **Autorizzazioni per questo elenco** → **Interrompi ereditarietà**
     → concedi al gruppo dei colleghi che useranno il modulo il livello `Collabora senza eliminare`.
     I proprietari del sito mantengono il controllo completo.

## Passo 2 — Registrazione dell'app in Microsoft Entra ID

1. Vai su **https://entra.microsoft.com** → Identità → Applicazioni → **Registrazioni app** → **Nuova registrazione**.
2. Compila:
   - Nome: `Modulo Offerta WES`
   - Tipi di account supportati: **Solo account in questa directory organizzativa** (single tenant)
   - URI di reindirizzamento: piattaforma **Applicazione a pagina singola (SPA)**, valore `http://localhost:8766/`
     (serve per le prove in locale; l'indirizzo del sito lo aggiungi al Passo 4).
3. Registra, poi dalla pagina **Panoramica** copia:
   - **ID applicazione (client)** → andrà in `clientId`
   - **ID directory (tenant)** → andrà in `tenantId`
4. **Autorizzazioni API** → Aggiungi un'autorizzazione → **Microsoft Graph** → **Autorizzazioni delegate** →
   cerca e seleziona **`Sites.ReadWrite.All`** (`User.Read` c'è già) → Aggiungi →
   **Concedi consenso amministratore per WES** → Sì.
   - "Delegate" significa che il modulo agisce sempre con i permessi dell'utente collegato: può scrivere
     solo dove quell'utente può già scrivere (quindi, per il modulo, la lista del Passo 1).
   - Più restrittivo, se preferisci: `Sites.Selected`, che limita l'app ai soli siti autorizzati uno per uno.
     Richiede un passaggio in più via Graph; si può fare in un secondo momento.
5. Non creare client secret né certificati: un'app a pagina singola non ne usa.
6. (Consigliato) **Limita chi può accedere**: Applicazioni aziendali → `Modulo Offerta WES` → Proprietà →
   **Assegnazione obbligatoria: Sì** → Salva; poi **Utenti e gruppi** → aggiungi il gruppo dei colleghi.

## Passo 3 — Sito su Azure Static Web Apps

1. Vai su **https://portal.azure.com** → Crea una risorsa → cerca **Static Web App** → Crea.
2. Scheda Informazioni di base:
   - Sottoscrizione: quella aziendale; Gruppo di risorse: nuovo, es. `rg-modulo-offerta`
   - Nome: `modulo-offerta-wes`
   - Tipo di piano: **Gratuito**
   - Area per l'API di Azure Functions e gli ambienti di gestione temporanea: **West Europe**
   - Origine distribuzione: **GitHub** → Accedi con GitHub e autorizza Azure →
     Organizzazione `bucchim`, Repository `WES`, Ramo `main`
3. Dettagli di compilazione:
   - Set di impostazioni: **Custom**
   - Percorso dell'app: **`/`** (i file `index.html`, `css/`, `js/`, `assets/` sono nella radice del repository;
     se li hai messi in una sottocartella, indica quella)
   - Percorso dell'API: vuoto
   - Percorso di output: vuoto
4. **Rivedi e crea** → Crea. Azure aggiunge al repository un file `.github/workflows/azure-static-web-apps-….yml`
   e avvia la prima pubblicazione (su GitHub, scheda **Actions**: deve diventare verde in 1–2 minuti).
5. Nella risorsa creata, pagina **Panoramica**, copia l'**URL**, es. `https://nome-casuale.azurestaticapps.net`.
   Aprendolo vedi il modulo (ancora senza accesso Microsoft: lo attivi al Passo 4).

## Passo 4 — Collegare tutto

1. **Indirizzo del sito nell'app registration**: Entra → Registrazioni app → `Modulo Offerta WES` →
   **Autenticazione** → nella piattaforma "Applicazione a pagina singola" → Aggiungi URI →
   l'URL del Passo 3 **con la barra finale**, es. `https://nome-casuale.azurestaticapps.net/` → Salva.
2. **Configurazione del modulo**: su GitHub apri `js/dati.js` → icona matita (Modifica) → compila il blocco
   `microsoft` in `CONFIG`:

   ```js
   microsoft: {
     tenantId: 'ID directory (tenant) del Passo 2',
     clientId: 'ID applicazione (client) del Passo 2',
     sito: 'wesint.sharepoint.com:/sites/Offerte',   // nome host + ":" + percorso del sito del Passo 1
     lista: 'Registro offerte',
     colonnaNumero: 'NumeroOfferta'                   // 'Title' se hai creato la lista a mano
   }
   ```

   Scrivi un messaggio (es. "Configurazione Microsoft 365") → **Commit changes**. Dopo 1–2 minuti il sito è aggiornato.
   Questi due ID non sono segreti: identificano l'app, ma senza un account WES autorizzato non danno accesso a nulla.
3. **Numerazione**: in `js/dati.js`, `CONFIG.numerazione.partenza` dice da quale progressivo parte ogni anno
   (oggi 2026 → 148). Se sono già state emesse offerte reali con il modulo su claude.ai o a mano,
   imposta la partenza dopo l'ultimo numero usato, per non avere doppioni.

## Passo 5 — Prova

1. Apri l'URL del sito in una finestra anonima → **Accedi con Microsoft** → entra con il tuo account WES.
2. Compila il nome di un cliente: il numero resta da assegnare e nella lista non compare nessuna riga.
3. Premi **Anteprima PDF → Scarica PDF**: si scarica il PDF con il numero `OFF-2026-0148` (o la partenza
   impostata) e nella lista "Registro offerte" compare una riga con quel numero, Stato `Bozza` e `UltimoPdf`.
   Riscaricando il PDF il numero non cambia e si aggiorna solo `UltimoPdf`.
4. Ripeti con un secondo collega nello stesso momento: i due numeri devono essere diversi.
5. Prova con un utente che **non** ha permessi sulla lista: l'accesso funziona, ma il numero non viene
   assegnato e compare l'avviso "la lista SharePoint non risponde o non hai il permesso di scriverci".

## Passo 6 — Condividere con i colleghi

- Manda l'URL del sito. Servono solo: account Microsoft WES, il livello `Collabora senza eliminare` sulla lista
  e, se hai attivato l'assegnazione obbligatoria, l'appartenenza al gruppo dell'app.
- (Facoltativo) **Dominio aziendale**, es. `offerte.wesint.com`: Static Web App → Domini personalizzati;
  poi aggiungi anche quell'indirizzo (con barra finale) nell'Autenticazione dell'app registration.
- (Facoltativo) Con il piano Gratuito i file del sito sono raggiungibili da chi ha l'indirizzo
  (contengono solo il modello e i testi, nessuna offerta). Per nascondere l'intero sito a chi non è WES
  serve il piano **Standard** di Static Web Apps con un file `staticwebapp.config.json` che richiede
  l'accesso Entra ID a ogni pagina: si può preparare in seguito.

## Il registro in Excel

- Dalla lista: **Esporta → Esporta in Excel**. Il file resta collegato alla lista: in Excel,
  Dati → **Aggiorna tutto** riporta le righe nuove.
- In alternativa, da Excel: Dati → Recupera dati → Da elenco SharePoint Online.

## Manutenzione

- **Modifiche al modulo**: si caricano su GitHub (`main`); la pubblicazione è automatica.
- **Righe del registro**: non cancellarle; per annullare un'offerta usa Stato = `Annullata`.
- **Stato dell'offerta** (`Inviata`, `Accettata`, …): si aggiorna a mano nella lista; il modulo imposta solo
  `Bozza` quando crea la riga (primo PDF) e non lo sovrascrive.

## Problemi frequenti

| Sintomo | Causa probabile | Cosa fare |
|---|---|---|
| Errore `AADSTS50011` dopo l'accesso | L'indirizzo del sito non è tra gli URI di reindirizzamento | Passo 4.1, con la barra finale e la piattaforma "SPA" |
| Errore `AADSTS65001` / richiesta di consenso | Consenso amministratore non concesso | Passo 2.4 |
| Avviso "la lista SharePoint non risponde…" | Permessi mancanti sulla lista, oppure `sito`/`lista` scritti male | Controlla Passo 1.5 e il blocco `microsoft` in `js/dati.js`; F12 → Console mostra il dettaglio (es. Graph 403 o 404) |
| La schermata dice "libreria di accesso Microsoft non caricata" | Un filtro di rete blocca `cdn.jsdelivr.net` | Consenti il dominio, oppure si può copiare la libreria MSAL nel repository |
| Il sito non si aggiorna dopo un commit | Pubblicazione fallita | GitHub → Actions → apri l'esecuzione in rosso |
