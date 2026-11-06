# Scheda regolamenti fiera: pacchetto di avvio sviluppo

Questo pacchetto contiene tutto ciò che serve per far partire lo sviluppo con Claude Code: il prompt di avvio, le specifiche, il risultato grafico atteso già realizzato, un caso di prova completo con la risposta corretta e lo spazio per il codice.

## Come si usa

1. Decomprimere la cartella e aprirla come progetto in Claude Code.
2. Copiare il contenuto di PROMPT_CLAUDE_CODE.md e incollarlo nella prima sessione.
3. Claude Code leggerà i documenti e proporrà un piano per fasi. Le decisioni di impostazione sono già prese (punto 13 di docs/specifiche.md).

## Struttura

```
PROMPT_CLAUDE_CODE.md         prompt di avvio
docs/specifiche.md            requisiti, modello dati, pipeline, collaudo, decisioni assunte
backend/                      da costruire (contiene solo .env.example)
frontend/                     da costruire
reference/
  prompt/Estrazione_regolamenti_fiera_NotebookLM.docx   prompt di estrazione usato finora a mano, punto di partenza
  design/                     artifact HTML finale, screenshot e generatore che lo ha prodotto
  esempio-output/             scheda NPE2027 in Word e PDF
  verifica/                   script Python con cui sono state controllate le citazioni
  wes-brief-ai/               codice della webapp di raccolta brief, modello di struttura e deploy
fixtures/
  regolamenti/                PDF del caso di prova: NPE2027 Show Rules (32 pp.) e Appendice A (5 pp.)
  golden/                     87 voci verificate a mano su quei PDF, per il collaudo
```

## Nota sul caso di prova

L'Appendice A ha un livello di testo corrotto: i caratteri estratti dal PDF sono illeggibili, mentre la pagina si legge bene a video. È voluto. Il collaudo deve dimostrare che l'app gestisce questo caso con la lettura ottica e non lo scambia per un documento vuoto.
