# Aura Deterministic Transaction Import V1 Progress Plan

## Scopo

Questo documento e il tracker vivo per l'iniziativa **Importazione deterministica
locale delle transazioni V1**.

L'obiettivo e sostituire il flusso generico che oggi invia fogli CSV/XLSX a
Gemini con un'importazione locale, prevedibile e verificabile. L'utente prepara
un file con colonne fisse, controlla le righe estratte, assegna manualmente le
categorie anche in blocco e conferma soltanto dopo un'anteprima completa.

La V1 deve:

- funzionare nella PWA e nella UI React inclusa nell'app Android Capacitor;
- leggere CSV e XLSX interamente sul dispositivo;
- richiedere le colonne `date`, `description`, `amount`;
- derivare entrata o spesa dal segno dell'importo;
- inizializzare le righe senza categoria come `Uncategorized`;
- permettere l'assegnazione di categoria a una selezione manuale o a tutte le
  righe con la stessa descrizione normalizzata;
- segnalare possibili duplicati senza eliminarli automaticamente;
- mantenere l'archivio `.aura` e il CSV Aura legacy su percorsi separati;
- rimuovere il percorso runtime, la UI e la configurazione client di Gemini
  dallo scope corrente;
- non aggiungere metadati di importazione permanenti a `Transaction`.

Aggiornare questo file quando:

- una task inizia o termina;
- una decisione viene modificata;
- emerge un blocco;
- cambia lo scope;
- viene prodotto un test, un documento o un'evidenza di release;
- un rischio cambia probabilita, impatto o mitigazione.

## Legenda degli stati

| Stato | Significato |
|---|---|
| `Non iniziato` | Nessun lavoro di implementazione e iniziato |
| `In corso` | Il milestone o la task e attivamente in lavorazione |
| `Bloccato` | Serve una decisione, un'approvazione o un cambiamento esterno |
| `Completato` | Codice, test, verifiche e documentazione richiesti sono completi |

Per le checklist:

- `[ ]` non completato;
- `[x]` completato.

Un milestone non puo essere marcato `Completato` soltanto perche il codice e
stato scritto. Devono essere soddisfatti anche gli exit criteria, i test, la
review privacy/security e la documentazione applicabile.

## Dashboard di avanzamento

Ultimo aggiornamento: 2026-08-03

| Milestone | Stato | Nota di avanzamento |
|---|---|---|
| M0. Contratto, decisioni e baseline | Completato | Contratto, fixture e review chiusi; due root cause baseline corretti; regression 411/411 verde |
| M1. Lettura file e validazione strutturale locale | Completato | Boundary data/domain/service, resource gate, template e 29 nuovi test; regression 440/440 verde |
| M2. Modello di review, matching e duplicati | Completato | Review pura, matching/duplicati separati, fingerprint, mapping UUID e undo; regression 459/459 verde |
| M3. Wizard locale e categorizzazione in blocco | Completato | Wizard locale a 5 step, review paginata, scope categoria, warning/undo e 11 nuovi test; regression 470/470 verde |
| M4. Commit verificato e correzione batch in cronologia | Completato | Commit transaction-only con rollback/read-back, undo effimero, history batch e 2 E2E Chromium; regression 482/482 verde |
| M5. Rimozione del runtime Gemini e delle superfici collegate | Completato | SDK/runtime/env/admin rimossi, cache V6 ritirata, asset web/Android verificati; regression 472/472 e 2/2 E2E verdi |
| M6. Hardening, accessibilita e QA web/Android | In corso | Gate automatici web/PWA/Android verdi; picker Android e screen reader manuale restano release-blocking |
| M7. Documentazione, release e chiusura | Non iniziato | Viaggia con tutti i milestone; chiusura dopo M6 |

Focus corrente: **M6 - completare acceptance manuale del picker Android e
screen reader dopo la chiusura dei gate automatici**.

## Direzione approvata

### Problema da risolvere

Il wizard generico attuale usa Gemini sia per identificare le colonne sia per
classificare le transazioni. Quando la chiave non e configurata, l'utente puo
comunque raggiungere il flusso, accettare l'informativa e caricare un file per
poi ricevere un errore. Quando la chiave e configurata, descrizioni e importi
possono lasciare il dispositivo.

Questo comportamento non e coerente con la strategia corrente `no AI`, con il
principio local-first e con la build Android debug che gia disabilita Gemini.
Inoltre la review permette modifiche riga per riga, ma non offre ancora una
funzione completa per assegnare una categoria a transazioni equivalenti.

### Decisioni di prodotto approvate

| ID | Decisione | Stato | Data | Nota |
|---|---|---|---|---|
| D-001 | Usare un import locale deterministico come percorso generico V1 | Approvata | 2026-08-03 | Nessuna analisi remota o AI |
| D-002 | Supportare `.csv` e `.xlsx` con lo stesso contratto a tre colonne | Approvata | 2026-08-03 | CSV resta il formato canonico; XLSX e una comodita |
| D-003 | Richiedere `date`, `description`, `amount` | Approvata | 2026-08-03 | La data e necessaria per cronologia e report affidabili |
| D-004 | Derivare il tipo dal segno e salvare l'importo assoluto | Approvata | 2026-08-03 | Positivo = entrata; negativo = spesa |
| D-005 | Inizializzare le righe come `Uncategorized` | Approvata | 2026-08-03 | La categoria resta una decisione dell'utente |
| D-006 | Consentire import con righe non categorizzate dopo un avviso esplicito | Approvata | 2026-08-03 | Evita di obbligare a completare grandi file in una sola sessione |
| D-007 | Applicare una categoria a righe selezionate o con descrizione normalizzata uguale | Approvata | 2026-08-03 | Il matching iniziale e conservativo e spiegabile |
| D-008 | Non salvare regole merchant-categoria permanenti nella V1 | Approvata | 2026-08-03 | Le categorie usano ancora nomi stringa, non ID stabili |
| D-009 | Distinguere matching di categoria e rilevamento duplicati | Approvata | 2026-08-03 | Le due funzioni hanno chiavi e conseguenze diverse |
| D-010 | Segnalare i duplicati senza eliminarli automaticamente | Approvata | 2026-08-03 | Due addebiti uguali possono essere entrambi legittimi |
| D-011 | Non aggiungere `importBatchId`, merchant fingerprint o source metadata a `Transaction` | Approvata | 2026-08-03 | Il ledger canonico resta semplice e interoperabile |
| D-012 | Rendere Gemini irraggiungibile e rimuovere la configurazione client nello scope corrente | Approvata | 2026-08-03 | Una futura reintroduzione richiede nuova discovery e governance |
| D-013 | Usare `Uncategorized` come label fallback nel ledger senza aggiungerla automaticamente alle categorie attive | Approvata | 2026-08-03 | Resta filtrabile e puo essere sostituita con una categoria attiva |

### Default V1 congelati in M0

Queste scelte sono reversibili in una futura versione, ma sono vincolanti per
la V1:

- CSV massimo 10 MiB;
- XLSX massimo 5 MiB compresso, 32 MiB dichiarati non compressi e 1.000 entry;
- massimo 20.000 transazioni oltre all'header;
- esattamente tre colonne e prima worksheet soltanto per XLSX;
- review paginata a 100 righe, mai rendering non limitato dell'intero file;
- valuta EUR implicita e importi massimi EUR 999.999.999,99;
- `Bank Transfer` come metodo di pagamento predefinito;
- titolo derivato dai primi 80 code point della descrizione, con descrizione
  completa preservata fino a 2.000 code point;
- staging della review solo in memoria e warning esplicito alla chiusura;
- undo dell'ultimo import disponibile per 10 secondi nella sessione corrente,
  senza persistere un identificatore di batch nel ledger;
- preflight ZIP XLSX prima di ExcelJS e rifiuto di tutte le formule nelle
  colonne richieste, anche se hanno un risultato cached.

Il contratto definitivo, i codici issue e il protocollo di commit sono in
[`deterministic-transaction-import-v1.md`](../specs/deterministic-transaction-import-v1.md).

## Contratto del file V1

### Intestazione

Il file strutturato contiene esattamente queste tre colonne e in questo ordine:

```text
date,description,amount
```

Il parser puo rimuovere un BOM UTF-8, spazi esterni e differenze di
maiuscole/minuscole nell'intestazione. Non deve accettare alias come `data`,
`descrizione`, `value`, `debit` o `credit`: l'assenza di mappatura arbitraria e
parte della prevedibilita V1. Colonne duplicate, mancanti o aggiuntive bloccano
il file con un messaggio preciso e un link al template.

Esempio canonico:

```csv
date,description,amount
2026-08-01,Supermercato,-42.70
2026-08-02,Stipendio,2500.00
```

### CSV

- codifica UTF-8;
- delimitatore virgola o punto e virgola, rilevato localmente;
- tutte le righe devono usare lo stesso delimitatore;
- il template canonico usa virgola e punto decimale;
- con delimitatore virgola, l'importo usa il punto decimale;
- con delimitatore punto e virgola, l'intero file puo usare punto oppure
  virgola decimale, ma non formati misti;
- i separatori delle migliaia non sono accettati nella V1;
- descrizioni contenenti il delimitatore devono rispettare il quoting CSV;
- righe completamente vuote possono essere ignorate;
- righe parziali producono un errore associato al numero di riga.

### XLSX

- estensione `.xlsx`; `.xls` e `.xlsm` non sono supportati;
- viene letta soltanto la prima worksheet;
- l'intestazione deve essere la prima riga non vuota;
- le celle importo devono essere numeriche o stringhe conformi alle regole CSV;
- le celle data devono rappresentare un giorno valido o una stringa ISO;
- tutte le formule nelle celle richieste vengono rifiutate, anche con risultato
  cached valido;
- macro, collegamenti e contenuti esterni non vengono eseguiti;
- worksheet aggiuntive vengono ignorate e questa limitazione e mostrata prima
  della conferma.

### Validazione delle righe

Ogni riga deve rispettare tutte le regole seguenti:

- `date`: data di calendario reale in formato `YYYY-MM-DD`;
- `description`: testo non vuoto dopo il trim, massimo 2.000 caratteri;
- `amount`: numero finito, diverso da zero, con massimo due decimali;
- importo positivo: `income`;
- importo negativo: `expense`;
- date future: accettate soltanto con warning esplicito nella review;
- date o importi ambigui: errore, mai correzione silenziosa;
- righe invalide: non vengono trasformate in transazioni di fallback.

La UI mostra separatamente:

- righe valide;
- righe con warning;
- righe bloccanti con numero di riga, campo e motivo;
- conteggio totale, entrate, spese, importo netto e possibili duplicati.

Il commit resta disabilitato finche esiste almeno un errore bloccante. L'utente
puo correggere il file e ricaricarlo; la V1 non include un editor di celle
generico.

### Template

Data & Privacy e il wizard espongono:

- `Scarica template CSV`;
- `Scarica template Excel`;
- istruzioni brevi su segno, data e intestazione;
- un esempio valido e uno non valido;
- il chiarimento che CSV/XLSX importa soltanto transazioni e non e un backup
  completo.

I template sono generati localmente, non scaricati da una risorsa remota.

## Mapping al ledger canonico

Una riga valida diventa una normale `Transaction`:

| Campo `Transaction` | Origine/regola V1 |
|---|---|
| `id` | UUID locale crittograficamente casuale e controllato per collisioni nel batch e nel ledger |
| `amount` | Valore assoluto arrotondato e validato a due decimali |
| `type` | `income` se il segno e positivo, `expense` se negativo |
| `category` | Categoria scelta dall'utente o `Uncategorized` |
| `date` | Giorno ISO convertito nel formato UTC-midnight gia usato dal form canonico |
| `title` | Versione compatta della descrizione, senza perdere la descrizione completa |
| `description` | Testo completo validato |
| `paymentMethod` | `Bank Transfer` nella V1 |
| `reportingClass` | Regolare/assente; nessuna inferenza di extra o rimborso |
| `verified` | Non impostato; l'import non dichiara verifica bancaria |

Non vengono valorizzati attachment, ricorrenza, note di reporting o metadati di
provenienza. Dopo il commit, le righe seguono le stesse regole di modifica,
backup e archivio di ogni altra transazione Aura.

`Uncategorized` e una label fallback della transazione, non una categoria che
la V1 inserisce automaticamente in `AppData.categories`. Resta visibile nei
report e nei filtri derivati dal ledger; le azioni di correzione propongono le
categorie attive dell'utente. L'eventuale introduzione di una categoria di
sistema con identita stabile resta parte della futura migrazione a category ID.

## Categorizzazione manuale e matching

### Stati distinti della review

La UI non deve confondere:

- inclusione/esclusione della riga dal commit;
- selezione temporanea per un'azione batch;
- categoria assegnata;
- stato di possibile duplicato.

Se la review mantiene un controllo di inclusione, la selezione batch usa una
modalita esplicita e separata. Un unico checkbox non puo rappresentare entrambi
gli stati.

### Chiave per transazioni simili

La chiave V1 per proporre la stessa categoria e:

```text
versione-normalizzazione + tipo + descrizione-normalizzata
```

La normalizzazione V1:

1. applica Unicode NFKC;
2. esegue trim;
3. converte in minuscolo in modo locale-indipendente;
4. comprime sequenze di whitespace a uno spazio;
5. preserva cifre e punteggiatura significativa.

Non rimuove numeri di riferimento, codici esercente o frammenti variabili e non
usa fuzzy matching. Questa scelta riduce i falsi positivi; una normalizzazione
piu aggressiva richiede un corpus approvato e una nuova decisione.

L'importo non fa parte della chiave di categoria: acquisti con importi diversi
presso lo stesso esercente possono condividere la categoria. Il tipo fa parte
della chiave per evitare che una descrizione usata sia per entrate sia per
spese venga propagata senza controllo.

### Azioni disponibili

Per una categoria scelta l'utente puo applicare:

- soltanto alla riga corrente;
- alle righe selezionate manualmente;
- a tutte le righe incluse con la stessa chiave di matching.

Prima dell'applicazione multipla, la UI mostra il numero di righe interessate.
L'azione modifica la review in memoria e resta annullabile prima del commit.
Le corrispondenze sono marcate come `Applicata manualmente` o `Applicata a N
simili`; non vengono presentate come una previsione intelligente.

La V1 non modifica automaticamente transazioni storiche gia presenti e non
memorizza una regola per file futuri.

## Contratto dei possibili duplicati

La chiave di confronto V1 e:

```text
giorno + importo firmato in centesimi + descrizione-normalizzata
```

Il controllo confronta:

- righe del file tra loro;
- righe del file con il ledger canonico corrente.

Il risultato e un warning `possible_duplicate`, non una prova di duplicazione.
La UI mostra la transazione esistente o la riga in conflitto e permette di:

- mantenere la nuova riga;
- escluderla dal commit;
- escludere in blocco tutti i possibili duplicati, con conferma e undo.

Il sistema non elimina transazioni esistenti e non deduplica automaticamente.
Il confronto usa il tipo implicito nel segno, mentre il matching di categoria
non usa l'importo: i due contratti devono rimanere implementati in funzioni pure
separate e con test distinti.

## Architettura obiettivo

Le responsabilita devono essere separate secondo i boundary del repository:

```text
src/data/import/
  spreadsheetFileReader        lettura browser File, CSV e XLSX
  importTemplateBuilder        generazione locale dei template

src/domain/import/
  structuredImportTypes        contratti e codici errore/warning
  structuredImportValidation   intestazione, righe, date e importi
  transactionMapping           draft valido -> Transaction
  descriptionMatching          normalizzazione e gruppi simili
  duplicateDetection           confronto batch/ledger

src/services/import/
  prepareTransactionImport     orchestra parse, validazione e preview
  commitTransactionImport      validazione finale, persistenza e read-back

src/components/import/
  ImportWizardDialog           composizione degli step
  FileUploadStep               scelta file e template, senza consenso AI
  ValidationSummary            errori e warning per riga
  ReviewStep                   review, categorie, gruppi e duplicati
  ImportSummary                esito e accesso alle righe non categorizzate

src/components/history/
  BatchToolbar                 cambio categoria batch realmente collegato
  TransactionHistoryList       modalita selezione accessibile

src/state/ e src/context/
  azioni atomiche per commit e cambio categoria multiplo

src/pages/
  entrypoint, routing e composizione soltanto
```

Il lettore di file non contiene regole di business. I componenti non
costruiscono direttamente `Transaction` e non scrivono `localStorage`. Matching,
duplicati e mapping sono funzioni pure. Il servizio di commit usa il repository
canonico, valida il prossimo `AppData`, persiste, rilegge e verifica prima di
mostrare successo.

### Pipeline

```text
Riconosci firma .aura
-> se archivio: indirizza al restore dedicato e interrompi
-> leggi CSV/XLSX localmente entro i limiti
-> se CSV Aura legacy: usa il parser legacy locale
-> altrimenti valida lo schema strutturato V1
-> prepara righe, gruppi simili e warning duplicati
-> review e categorizzazione manuale
-> validazione finale
-> persistenza canonica verificata
-> riepilogo, undo di sessione e link a Uncategorized
```

L'ordine di classificazione e un requisito di sicurezza e regressione: un file
`.aura` rinominato non deve mai raggiungere ExcelJS, PapaParse o un eventuale
provider esterno.

## Milestone plan

### M0. Contratto, decisioni e baseline

Obiettivo: rendere l'iniziativa pronta per l'implementazione senza cambiare il
runtime.

Stato: **Completato**

Task:

- [x] Approvare l'import locale deterministico come direzione V1.
- [x] Approvare `date`, `description`, `amount` come colonne obbligatorie.
- [x] Approvare il segno dell'importo come sorgente del tipo.
- [x] Approvare categorizzazione manuale, propagazione conservativa e duplicati
  solo segnalati.
- [x] Approvare l'assenza di regole persistenti e metadati di import nel ledger.
- [x] Creare il tracker vivo e collegarlo ai documenti discovery.
- [x] Creare `docs/specs/deterministic-transaction-import-v1.md` con il
  contratto comportamentale definitivo.
- [x] Congelare limiti di file, righe, lunghezze, precisione e memoria mobile.
- [x] Congelare codici errore/warning e copy utente per ogni caso.
- [x] Definire la gestione di chiusura/riapertura della review session-only.
- [x] Definire il protocollo di persistenza verificata e undo senza
  `importBatchId` persistente.
- [x] Creare fixture CSV comma, CSV punto e virgola, CSV europeo, XLSX,
  malformed, oversized, mixed decimal, duplicate, future-date, Aura legacy e
  archivio rinominato.
- [x] Registrare la baseline con `npm run test:regression` e test import mirati.
- [x] Eseguire review architettura, privacy/security, UX e test coverage sul
  contratto prima di M1.

Exit criteria:

- specifica e fixture sono revisionabili e non ambigue;
- nessun limite o comportamento di errore e lasciato implicito;
- il protocollo di commit non puo mostrare successo senza read-back valido;
- la baseline corrente e registrata;
- non restano decisioni fondazionali aperte.

### Evidenza finale baseline M0 - 2026-08-03

| Check | Esito | Evidenza |
|---|---|---|
| TypeScript | Passato | `npm run test:regression` ha completato `tsc --noEmit` |
| Import test mirati | Passato | 3 file, 18/18 test |
| Root-cause test mirati | Passato | 4 file, 41/41 test |
| Production build | Passato | Vite, 2.948 moduli trasformati |
| Full Vitest | Passato | 87 file, 411/411 test |
| Full regression chain | Passato | TypeScript, Vitest e production build completati |

La prima esecuzione ha esposto due root cause preesistenti e non causate dai
documenti/fixture M0:

1. `InsightsPage.test.tsx` si aspetta che i range `3M` e `6M` siano ancorati a
   `selectedMonth`, mentre `InsightsPage` usa `new Date()` per i range non
   custom. Il test non trova `1 May - 31 Jul` con il clock corrente.
2. `archiveCodec.test.ts` confronta due chiamate separate a
   `normalizeAppData(TEST_APP_DATA)`. La sincronizzazione della ricorrenza di
   agosto genera ogni volta un ID con `Math.random()`, quindi il read-back e il
   valore atteso divergono pur rappresentando la stessa occorrenza.

Correzioni approvate ed eseguite prima di chiudere M0:

- `InsightsPage` usa ora `selectedMonth` per i preset e per i default del range
  custom invece di ancorarsi implicitamente al clock reale;
- le nuove occorrenze ricorrenti usano ID deterministici, bounded e
  collision-safe; la riconciliazione preserva gli ID storici gia persistiti.

La seconda esecuzione completa e verde. M1 puo iniziare dalla baseline 411/411.

### Review M0

#### Architettura - Approve with required boundaries

Finding:

- `ImportWizardDialog` oggi miscela classificazione file, mapping, chiamata AI e
  commit; `parseAuraExportRows` vive nel componente.
- `transactionCategorizer.ts` miscela parsing locale, prompt, provider e usage
  logging.
- `addTransactions` aggiorna lo stato ma non offre un commit con read-back.
- `BatchToolbar` esiste ma non e collegato alla cronologia.

Decisione:

- M1-M4 devono usare le boundary `data/import`, `domain/import`,
  `services/import`, repository/state e UI definite nella spec.
- Il commit scrive soltanto la chiave transazioni, verifica il read-back e
  idrata React soltanto dopo successo.
- Non serve un ADR in M0: schema, tenancy, runtime e storage technology non
  cambiano. Rivalutare un ADR se il protocollo transaction-only diventa una
  boundary riusata da altri workflow.

#### Security e privacy - Approve with release follow-up

Finding:

- Il target locale rimuove un destinatario esterno e non cambia auth/authz.
- XLSX compresso richiede un limite expanded prima di ExcelJS.
- Testo importato con prefissi formula potrebbe diventare attivo in un futuro
  export CSV.
- Le collection Firestore Gemini storiche non hanno una decisione di retention
  o cancellazione in questa iniziativa.

Decisione:

- Preflight ZIP 5 MiB/32 MiB/1.000 entry, formule XLSX rifiutate e CSV export
  formula-escaped sono requisiti bloccanti di release.
- File, review e undo restano memory-only; log e issue non contengono valori
  finanziari o filename.
- Nessuna cancellazione Firestore implicita. Il privacy owner mantiene la
  decisione separata sui dati storici e sulle dichiarazioni di conformita.

#### UX e design system - Approve contract; implementation review required

Finding:

- 20.000 righe rendono non accettabile la lista non limitata attuale.
- Il checkbox corrente rappresenta inclusione e non puo essere riusato per la
  selezione batch.
- Il flusso deve coprire errori, warning, empty filter, commit failure e close
  con modifiche non salvate.

Decisione:

- Review paginata a 100 righe con filtri e selezione persistente tra pagine.
- Inclusione e batch selection hanno controlli e semantica separati.
- Riutilizzare primitive e token condivisi; nessun nuovo visual system.
- M3 richiede review visuale light/dark, narrow width, tastiera e screen reader.

#### Test coverage - Approved after root-cause remediation

Finding:

- I test correnti coprono parsing CSV/XLSX di base, helper AI e isolamento
  `.aura`, ma non il nuovo contratto, commit, pagination o batch history.
- Il corpus M0 copre dialect, malformed, mixed decimal, formula-like text, Aura
  legacy e casi XLSX dichiarativi; boundary grandi saranno generati a runtime.
- La prima full regression ha esposto due fallimenti indipendenti dall'import,
  poi corretti al causal layer con test mirati.

Decisione:

- La matrice in `docs/testing-strategy.md` e nella spec e il minimo obbligatorio
  per M1-M6.
- Test-first per parser, issue model, matching e duplicate detection.
- M1 parte dalla baseline verde di 87 file e 411 test.

### M1. Lettura file e validazione strutturale locale

Obiettivo: trasformare file supportati in un risultato tipizzato senza UI e
senza rete.

Dipendenze: M0.

Stato: **Completato**

Task:

- [x] Spostare la lettura file dietro `src/data/import/` e mantenere gli import
  dinamici di PapaParse ed ExcelJS.
- [x] Applicare limiti prima e durante il parsing, non soltanto dopo aver
  materializzato tutte le righe.
- [x] Implementare classificazione `.aura` -> Aura CSV legacy -> schema V1.
- [x] Validare intestazione, numero colonne, date, descrizioni e importi con
  errori tipizzati e numero di riga.
- [x] Gestire BOM, UTF-8, quoting, delimitatori ammessi e decimal format coerente.
- [x] Rifiutare precisione oltre due decimali, zero, NaN, infinito, date
  impossibili e formati ambigui.
- [x] Rifiutare XLSX senza worksheet, formule con o senza risultato, limiti
  superati e formati non supportati.
- [x] Generare localmente template CSV e XLSX conformi allo stesso contratto.
- [x] Eliminare dal parser condiviso commenti e nomi che attribuiscono all'AI il riconoscimento delle
  colonne.
- [x] Aggiungere test unitari per fixture e boundary M1, generando a runtime i
  payload grandi e i container XLSX ostili.

Exit criteria:

- un file valido produce sempre lo stesso risultato tipizzato offline;
- un file invalido produce errori precisi senza transazioni fallback;
- archivi Aura e CSV legacy mantengono i loro percorsi separati;
- nessun test del parser effettua una richiesta di rete.

Evidenza M1 - 2026-08-03:

- `src/domain/import/` possiede contratti, codici issue e validazione pura;
- `src/data/import/` possiede lettura browser, parsing incrementale, preflight
  ZIP e builder dei template;
- `src/services/import/` possiede l'ordine di classificazione fail-closed;
- il vecchio `domain/excelParser.ts` e soltanto un adapter temporaneo verso la
  nuova boundary, necessario finche il wizard non viene sostituito in M3/M5;
- sono stati aggiunti due codici file mancanti al contratto M0:
  `invalid_csv_encoding` e `invalid_csv_syntax`, necessari per non riciclare
  messaggi fuorvianti su errori UTF-8 o quoting;
- test mirati: 5 file, 33/33 test;
- full regression: TypeScript, 90 file Vitest, 440/440 test e build Vite verdi.

### M2. Modello di review, matching e duplicati

Obiettivo: preparare una review completa e spiegabile prima di toccare il
ledger.

Dipendenze: M1.

Stato: **Completato**

Task:

- [x] Definire `PreparedImport`, `PreparedImportRow`, `ImportIssue`,
  `DuplicateMatch` e stati separati di inclusione/selezione.
- [x] Implementare mapping puro a draft canonico con UUID sicuri e collision
  check.
- [x] Implementare normalizzazione descrizione versionata e test con Unicode,
  whitespace, case, cifre e punteggiatura.
- [x] Implementare gruppi simili per descrizione normalizzata + tipo.
- [x] Implementare rilevamento duplicati batch e ledger con centesimi firmati.
- [x] Garantire che matching e duplicate detection non condividano per errore la
  stessa chiave.
- [x] Calcolare riepiloghi di entrate, spese, netto, righe escluse,
  Uncategorized, warning e duplicati.
- [x] Implementare comandi puri per categoria singola, categoria a selezione,
  categoria al gruppo, exclude/include e undo pre-commit.
- [x] Coprire categorie archiviate o cancellate durante una review aperta:
  invalidare la scelta e richiedere una categoria attiva.
- [x] Aggiungere test di proprieta/invarianti per conservazione conteggi e
  assenza di mutazioni dell'input.

Exit criteria:

- ogni cambiamento della review e deterministico, annullabile e testato;
- le transazioni storiche non vengono modificate dal matching;
- nessuna regola merchant-categoria viene persistita;
- il risultato pronto al commit contiene soltanto transazioni valide e incluse.

Evidenza M2 - 2026-08-03:

- chiavi branded e versionate mantengono distinti matching categoria e
  rilevamento duplicati;
- i gruppi duplicati conservano un riferimento opaco e un conteggio per riga,
  mantenendo memoria lineare anche con 20.000 collisioni;
- il fingerprint SHA-256 usa una proiezione canonica ordinata del ledger e non
  viene loggato o persistito;
- comandi review puri separano inclusione e selezione, registrano delta undo e
  sanitizzano gli stati undo quando una categoria non e piu attiva;
- il mapping finale usa soltanto `crypto.randomUUID()` con retry collision-safe
  e produce esclusivamente i campi canonici previsti;
- test M2 mirati: 4 file, 19/19 test;
- full regression: TypeScript, 94 file Vitest, 459/459 test e build Vite verdi.

### M3. Wizard locale e categorizzazione in blocco

Obiettivo: sostituire il percorso Gemini con un'esperienza mobile-first locale.

Dipendenze: M2.

Stato: **Completato**

Task:

- [x] Sostituire copy, step e CTA AI con `Carica -> Verifica file -> Categorizza
  -> Importa`.
- [x] Rimuovere consenso Gemini, force-refresh cache, confidence AI e stato
  `Analyzing with Gemini`.
- [x] Mostrare privacy locale, schema richiesto, limiti e download template
  prima della selezione file.
- [x] Mostrare errori bloccanti per riga e consentire il caricamento di un file
  corretto senza chiudere il dialog.
- [x] Separare visivamente inclusione e selezione batch.
- [x] Aggiungere azioni `Solo questa`, `Righe selezionate`, `N transazioni
  simili` con conteggio prima dell'applicazione.
- [x] Evidenziare Uncategorized, date future e possibili duplicati senza
  etichette di confidence.
- [x] Consentire esclusione/riammissione singola e batch con undo.
- [x] Mostrare un warning di conferma se restano righe Uncategorized.
- [x] Avvisare che la chiusura prima del commit perde la review session-only.
- [x] Conservare il focus trap, Escape, semantica dialog, tastiera, touch target,
  reduced motion e layout 320-430 px.
- [x] Aggiornare il riepilogo finale con importate, escluse, Uncategorized e
  duplicate mantenute.
- [x] Aggiungere test React per tutti gli stati upload/loading/error/review/
  warning/success.

Exit criteria:

- nessuna schermata del wizard promette AI o invio a Google;
- l'utente puo categorizzare un gruppo senza aprire ogni riga;
- l'utente comprende quali righe saranno importate prima del commit;
- il flusso e utilizzabile da tastiera e screen reader.

Evidenza M3 - 2026-08-03:

- il wizard usa cinque step locali e non importa piu
  `transactionCategorizer` o `excelParser`;
- upload e Data & Privacy dichiarano elaborazione sul dispositivo e offrono
  template CSV/XLSX senza consenso o controllo cache AI;
- la review rende al massimo 100 righe per pagina, limita il riepilogo categorie
  alle prime cinque e copre filtri/empty state;
- inclusione e selezione batch hanno controlli separati, target touch da 44 px,
  nomi accessibili e undo in memoria;
- chiusura o ritorno all'upload dopo la preparazione richiede conferma esplicita;
- il build production non contiene piu il chunk `google-genai`, pur mantenendo
  dipendenza, codice morto e superfici admin da rimuovere formalmente in M5;
- test M3 mirati: 5 file, 15/15 test, di cui 11 nuovi;
- full regression M3: TypeScript, 97 file Vitest, 470/470 test e build Vite
  verdi.

Esito M4:

- il wizard usa un comando provider tipizzato che persiste soltanto la chiave
  transazioni, rilegge il ledger e aggiorna React solo dopo verifica esatta;
- write/quota, mismatch di read-back e collisioni UUID non producono falso
  successo; il valore serializzato precedente viene ripristinato e verificato,
  con errore di recovery bloccante se anche il rollback fallisce;
- review e file restano in memoria dopo un errore e l'utente puo ritentare;
- l'undo import conserva nella sessione solo UUID e proiezioni immutabili,
  rimuove solo righe non modificate e segnala quelle modificate o gia eliminate;
- History collega `BatchToolbar` e `TransactionHistoryList` con modalita
  selezione, select-visible, clear, cambio categoria atomico e undo per ID;
- il riepilogo apre History filtrata su `Uncategorized`, con intervallo all-time
  ripristinabile anche dopo reload;
- test M4: 12 nuovi Vitest su service/reducer/component e 2 Playwright E2E
  Chromium (happy path completo e header invalido);
- full regression: TypeScript, 99 file Vitest, 482/482 test, build Vite e 2/2
  E2E Chromium verdi.

### M4. Commit verificato e correzione batch in cronologia

Obiettivo: rendere il salvataggio affidabile e permettere di completare la
categorizzazione dopo l'import.

Dipendenze: M2 e M3.

Task:

- [x] Aggiungere un servizio `commitTransactionImport` che riceve il ledger
  corrente e le righe incluse, costruisce il prossimo `AppData`, valida,
  persiste, rilegge e verifica.
- [x] Non chiamare `addTransactions` direttamente dal componente come unico
  indicatore di successo.
- [x] Esporre nel provider/context un comando bulk atomico e tipizzato.
- [x] Gestire quota, serializzazione, read-back mismatch e collisione UUID senza
  mostrare un falso successo.
- [x] Lasciare la review intatta dopo un errore di commit per consentire retry o
  export diagnostico privo di dati sensibili.
- [x] Offrire undo dell'ultimo import nella sessione usando l'elenco effimero di
  UUID, senza modificare `Transaction`.
- [x] Collegare realmente `BatchToolbar` a `HistoryPage` e
  `TransactionHistoryList`.
- [x] Aggiungere modalita selezione, select-visible, clear e cambio categoria
  multiplo atomico.
- [x] Rendere `Uncategorized` filtrabile e offrire dal riepilogo il link alla
  cronologia gia filtrata.
- [x] Garantire che il cambio categoria batch non modifichi importo, data,
  reporting class, ricorrenza o attachment.
- [x] Implementare undo batch limitato agli ID coinvolti, senza ripristinare
  l'intero array e sovrascrivere modifiche non correlate.
- [x] Aggiungere test reducer/service/component per commit, rollback logico,
  undo e cambio categoria batch.

Exit criteria:

- il successo viene mostrato soltanto dopo persistenza e read-back validi;
- un errore non produce commit parziali visibili come completati;
- le righe Uncategorized possono essere corrette in blocco dalla cronologia;
- il ledger canonico e lo schema `.aura` restano invariati.

### M5. Rimozione del runtime Gemini e delle superfici collegate

Obiettivo: chiudere il percorso provider e ridurre dipendenze, superficie di
attacco, configurazione e documentazione non piu necessarie.

Dipendenze: M1-M4 completi e verificati.

Task:

- [x] Rimuovere l'uso runtime di `extractAndCategorizeTransactions` e il relativo
  codice AI non piu raggiungibile.
- [x] Rimuovere `@google/genai` dalle dipendenze quando nessun altro flusso lo
  usa.
- [x] Rimuovere `VITE_GEMINI_API_KEY` da esempio env, config Vite e profili
  Android.
- [x] Rimuovere selettore modello e dashboard Gemini dall'admin corrente.
- [x] Decidere in una migrazione separata delle regole Firestore se negare ogni
  nuovo accesso a `geminiConfig` e `geminiUsage`; non cancellare dati remoti
  storici senza autorizzazione esplicita.
- [x] Rimuovere cache locali Gemini note senza usare una wildcard distruttiva e
  documentare la chiave esatta; la pulizia e best-effort e non deve toccare
  altri dati.
- [x] Verificare che bundle web e Android non contengano chiavi, model ID,
  prompt, endpoint o CTA Gemini.
- [x] Aggiungere un test strutturale che fallisce se il percorso import importa
  provider AI, Firebase, analytics, `fetch` o `XMLHttpRequest`.
- [x] Mantenere i dati Firestore storici fuori dalla UI e registrarne la
  retention/governance come follow-up owner, senza dichiararne la cancellazione.

Exit criteria:

- l'import strutturato non ha dipendenze provider o rete;
- nessuna configurazione client puo riattivare accidentalmente Gemini;
- il bundle non espone una API key Gemini;
- la rimozione non cambia autenticazione, backup o allowlist admin.

Esito M5:

- eliminati SDK Google GenAI, categorizer/provider prompt, configurazione modelli,
  client usage Firestore e test del runtime ritirato;
- rimossi variabile client da `.env.example`, override Android, manual chunk
  Vite, selettore modello e dashboard usage; l'admin mantiene solo la allowlist;
- introdotta pulizia startup best-effort limitata al namespace esatto
  `gemini_import_cache_v6_`, con test che preserva chiavi non correlate;
- aggiunti test strutturali sull'intero boundary import e un gate che sincronizza
  e scansiona artifact web/Android per SDK, env, endpoint, model ID e CTA;
- nessun documento remoto e stato letto, modificato o cancellato. La migrazione
  Firestore deny-all e la retention storica restano follow-up separati del
  product/privacy owner e Firebase operator;
- verifica finale: 100 file Vitest, 472/472 test, TypeScript, build production,
  scan artifact e 2/2 E2E Chromium verdi.

### M6. Hardening, accessibilita e QA web/Android

Obiettivo: dimostrare che il flusso e affidabile sui target supportati e non
regredisce archive, backup o cronologia.

Dipendenze: M1-M5.

Task:

- [x] Eseguire `npm run lint`, test mirati, `npm run test:regression` e build di
  produzione.
- [x] Aggiungere E2E per template -> upload CSV -> categoria a simili -> commit
  -> reload -> filtro Uncategorized -> cambio categoria batch.
- [x] Aggiungere E2E di errore per header errato senza mutazione del ledger.
- [x] Estendere gli E2E di errore a riga invalida, file oltre limite, duplicati,
  close/reopen e persistenza fallita simulata.
- [x] Mantenere il test che un `.aura` rinominato non raggiunge il parser
  spreadsheet.
- [x] Verificare import Aura CSV legacy e export transaction CSV esistente,
  inclusa la protezione formula-safe di tutti i campi stringa.
- [x] Intercettare ogni richiesta di rete durante il flusso e fallire il test se
  compare una destinazione non necessaria.
- [x] Testare 20.000 righe o il limite definitivo su desktop, mobile emulato e
  Android WebView; Pixel 9 Pro API 36 completa la validazione in 1.607 ms con
  100 righe DOM e 200 pagine.
- [ ] Verificare modalita chiara/scura, 320/360/390/430 px, desktop, tastiera,
  screen reader, focus restore e reduced motion; automazione e focus restore
  unitario sono verdi, screen reader manuale resta aperto.
- [ ] Verificare file picker e download template nella PWA installata e nella
  build Android bundled; PWA automatica verde, Android bundled resta aperto.
- [x] Eseguire build Android debug e smoke test del percorso condiviso; build,
  JVM test, lint, 34/34 instrumentation e WebView runtime sono verdi su
  `aura_api_36`; Google Sign-In e import WebView sono verdi su Pixel 9 Pro.
- [x] Eseguire dependency audit e registrare advisory residue con owner e
  mitigazione.

Evidenza e checklist ripetibile:
[`deterministic-transaction-import-m6-acceptance.md`](../07-qa/deterministic-transaction-import-m6-acceptance.md).

Esito automatico M6 al 2026-08-03: `test:regression` verde su 102 file e
482/482 test; 7/7 E2E funzionali Chromium e 10/10 quality test cross-browser,
mobile e PWA; Android JVM test, lint, `assembleDebug`, 34/34 instrumentation e
WebView runtime verdi su `aura_api_36`; Google Sign-In e import bundled da
20.000 righe verdi su Pixel 9 Pro API 36. La regression finale sale a 102 file
e 482/482 test.

Exit criteria:

- tutte le fixture e i flussi critici passano sui target dichiarati;
- nessun dato finanziario appare in log, error tracking o richieste di rete;
- i limiti dichiarati sono verificati, non soltanto documentati;
- archivio, CSV legacy, report e cloud backup non regrediscono.

### M7. Documentazione, release e chiusura

Obiettivo: distribuire documentazione che descrive il comportamento reale e un
rollback operativo chiaro.

Dipendenze: viaggia con M0-M6; chiusura dopo M6.

Task:

- [ ] Allineare project brief, brainstorm, strategy e delivery plan allo stato
  implementato.
- [ ] Completare la feature spec V1 e aggiungere un ADR se il protocollo di
  import verificato introduce una nuova boundary architetturale duratura.
- [ ] Aggiornare `docs/04-privacy-gdpr/privacy-notes.md` e creare un processing
  record locale se richiesto dal privacy owner.
- [ ] Aggiornare documentazione Data & Privacy, template, errori e limiti.
- [ ] Aggiornare la testing strategy e aggiungere una checklist browser/PWA/
  Android ripetibile.
- [ ] Aggiornare `CHANGELOG.md` soltanto quando il comportamento e realmente
  implementato.
- [x] Documentare rimozione Gemini, dipendenza, env, superfici admin e stato dei
  documenti Firestore storici.
- [ ] Registrare baseline finale, artifact Android verificato, evidenze manuali
  e decisione go/no-go.
- [ ] Definire monitoraggio post-release basato su errori tecnici redatti e
  feedback utente, senza telemetria finanziaria.

Exit criteria:

- documenti e UI descrivono il comportamento effettivamente distribuito;
- i gate manuali e automatici hanno evidenza ripetibile;
- rollback e ownership dei follow-up sono chiari;
- nessuna affermazione implica certificazione GDPR o AI Act.

## Piano di test minimo

### Unit test dominio

- header valido, case/trim/BOM e ordine colonne;
- header mancante, duplicato, alias e colonna extra;
- CSV comma, punto e virgola, quoting e newline in descrizione;
- punto/comma decimale coerente e formati misti rifiutati;
- importi positivi, negativi, zero, precisione e overflow;
- date valide, leap day, fine mese, date impossibili e future;
- XLSX numerico, serial date, string date e formula rifiutata con o senza
  risultato cached;
- normalizzazione Unicode, whitespace, case, punteggiatura e cifre;
- matching categoria che ignora l'importo ma non il tipo;
- duplicate detection che include data e centesimi firmati;
- UUID collision retry;
- mapping completo ai campi `Transaction`;
- limiti di file, righe e lunghezza.

### Test di stato e servizi

- commit bulk in un solo comando logico;
- validazione del prossimo `AppData` prima della scrittura;
- read-back esatto degli ID importati;
- quota/write/read-back failure senza falso successo;
- undo import limitato agli ID del batch effimero;
- cambio categoria batch senza perdita di altri campi;
- undo categoria che non sovrascrive transazioni non coinvolte;
- categoria archiviata durante review;
- import concorrente a una modifica locale simulata.

### Test componenti

- upload e template;
- progress locale senza copy AI;
- error summary con focus sul primo errore;
- separazione include/bulk select;
- apply to similar con conteggio e undo;
- warning Uncategorized e duplicati;
- conferma finale e retry dopo errore;
- link alla history filtrata;
- selezione batch accessibile nella cronologia;
- responsive, dark mode, keyboard e reduced motion.

### Test E2E e target

- Chromium, WebKit, mobile viewport e installed-PWA path;
- Android bundled WebView su API 36;
- CSV e XLSX reali generati dalle fixture del repository;
- reload dopo commit e confronto con preview;
- isolamento `.aura` e Aura CSV legacy;
- nessuna richiesta Gemini/Google GenAI/Firebase usage durante import;
- grande fixture entro il limite e rifiuto oltre limite.

## Privacy, GDPR, sicurezza e AI governance

### Dati trattati

Il flusso elabora localmente:

- data della transazione;
- descrizione o merchant testuale;
- importo e tipo derivato;
- categoria scelta;
- possibili corrispondenze con transazioni gia presenti.

Sono dati finanziari personali gia compatibili con il ledger Aura. La V1 non
aggiunge un nuovo destinatario o backend. Se il cloud backup cifrato e abilitato
dall'utente, le transazioni importate entrano successivamente nel normale
`AppData` cifrato come ogni transazione manuale.

### Controlli richiesti

- parsing, matching, duplicati e template soltanto sul dispositivo;
- nessun contenuto di riga in log, console, telemetry o messaggi di errore
  inviati;
- errori tecnici limitati a codice, fase e conteggi non finanziari;
- nessuna cache del file o della review dopo chiusura/refresh nella V1;
- file input e object URL rilasciati quando non servono;
- nessuna persistenza di regole descrizione-categoria;
- nessun accesso admin ai file o alle transazioni;
- nessuna cancellazione di dati remoti Gemini storici senza owner e
  autorizzazione separata.

La rimozione del provider riduce destinatari, trasferimenti, costi e superficie
di rischio, ma non costituisce certificazione GDPR. Il repository segnala ancora
gap di governance legale generali; il privacy owner deve confermare gli artifact
richiesti prima di una dichiarazione commerciale di conformita.

### AI Act

La V1 non usa un sistema AI, non produce classificazione automatica e non prende
decisioni finanziarie. Non introduce un nuovo caso d'uso AI Act. Una futura
reintroduzione di Gemini, fuzzy matching modellistico o suggerimenti automatici
richiede nuova decision discovery, privacy/subprocessor review, AI governance,
valutazioni e consenso appropriato prima dell'implementazione.

## Osservabilita, performance e FinOps

- Nessun admin cost panel e richiesto: il percorso non usa API a consumo,
  backend, storage gestito o modello AI.
- Gli unici indicatori tecnici ammessi sono locali e aggregati: fase fallita,
  durata, numero righe, issue count e superamento limiti. Non includere
  descrizioni, importi, date, categorie, nomi file o email.
- Parsing e matching devono essere O(n) o O(n log n) con mappe indicizzate;
  evitare confronti all-pairs O(n^2).
- L'UI pagina la review a 100 righe e mantiene conteggi, filtri e selezione sul
  dataset completo; non e ammesso il rendering non limitato di 20.000 righe.
- PapaParse ed ExcelJS restano import dinamici; misurare il bundle principale e
  impedire che ExcelJS entri nel percorso iniziale.
- La rimozione di `@google/genai` e delle dashboard usage elimina un driver di
  costo e configurazione; documentare la riduzione nel changelog di release.

## Rischi e mitigazioni

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Il formato fisso richiede preparazione manuale | Abbandono import | Template CSV/XLSX, errori precisi, esempio visibile; mappatura colonne resta follow-up |
| Date o decimali locali sono ambigui | Dati finanziari errati | Contratto stretto, formati misti rifiutati, preview obbligatoria |
| Matching troppo aggressivo assegna categorie sbagliate | Report fuorvianti | Normalizzazione conservativa, conteggio, conferma e undo |
| Matching troppo conservativo crea lavoro manuale | Attrito | Selezione batch; valutare regole persistenti solo dopo category IDs |
| Duplicati legittimi vengono rimossi | Perdita dati | Warning soltanto, decisione umana, nessuna auto-delete |
| Grandi XLSX saturano memoria mobile | Crash o blocco UI | Limiti pre-parse, benchmark, paginazione/virtualizzazione, lazy import |
| Persistenza fallisce dopo la review | Falso successo o perdita lavoro | Validazione, strict write, read-back, retry con review intatta |
| Undo globale sovrascrive modifiche concorrenti | Perdita di aggiornamenti | Undo limitato agli UUID coinvolti, mai replace dell'intero array |
| Rimozione Gemini lascia configurazione raggiungibile | Rischio privacy e secret | Rimozione dipendenza/env/UI, test strutturale e bundle inspection |
| Documenti descrivono il target prima della release | Disallineamento operativo | Etichettare l'iniziativa come pianificata fino ai gate M6-M7 |

## Rollback

L'iniziativa non modifica lo schema persistito `AppData` e non richiede una
migrazione delle transazioni. Il rollback applicativo consiste nel distribuire
il bundle precedente.

Vincoli:

- le transazioni gia importate sono normali transazioni e non vengono eliminate
  dal rollback;
- l'undo di import e deliberatamente effimero e non disponibile dopo reload;
- la dismissione delle regole Firestore Gemini deve essere una modifica separata
  e reversibile;
- nessun documento `geminiUsage` o `geminiConfig` viene cancellato come parte
  automatica del rollback o della release;
- il bundle precedente potrebbe ri-esporre il vecchio flusso Gemini: una release
  rollback deve quindi usare configurazione senza chiave e una decisione di
  sicurezza esplicita.

## Definition of Ready

- [x] Direzione prodotto e scope V1 approvati e registrati.
- [x] Specifica V1 completa e senza decisioni fondazionali aperte.
- [x] Limiti e formati definitivi approvati.
- [x] Fixture e baseline automatica disponibili.
- [x] Protocollo di commit/read-back e undo definito.
- [x] Review architettura, UX, privacy/security e test coverage completate.
- [x] Copy privacy locale e messaggi errore approvati.
- [x] Nessuna dipendenza da dati reali o provider esterno per iniziare M1.
- [x] `npm run test:regression` verde: 87 file e 411/411 test.

## Definition of Done

- CSV e XLSX conformi vengono elaborati interamente in locale sui target
  supportati.
- File non conformi falliscono con errori precisi e senza scritture parziali.
- Categoria singola, selezione batch e matching esatto funzionano con undo.
- Possibili duplicati batch/ledger sono spiegati e mai eliminati
  automaticamente.
- Import con Uncategorized richiede conferma e puo essere completato in history
  con cambio categoria batch.
- Il commit e validato, persistito, riletto e verificato prima del successo.
- `.aura` e Aura CSV legacy mantengono isolamento e compatibilita.
- Gemini, API key client, UI admin e dipendenza runtime non sono raggiungibili
  nello scope corrente.
- Nessun dato finanziario compare in log o rete.
- Typecheck, unit/component test, regression build, E2E, accessibilita,
  performance, PWA e Android bundled smoke passano.
- Brief, brainstorm, strategy, plan, spec, privacy notes, QA docs e changelog
  descrivono il comportamento realmente rilasciato.

## Fuori scope V1 e follow-up

- mappatura manuale di colonne bancarie arbitrarie;
- import `.xls`, `.xlsm`, PDF, immagini o OCR;
- riconoscimento fuzzy del merchant;
- classificazione AI o suggerimenti automatici;
- regole descrizione-categoria persistenti;
- modifica automatica delle transazioni storiche;
- import multi-valuta o conversione cambio;
- riconciliazione bancaria/Open Banking;
- salvataggio persistente di draft import;
- `importBatchId` o source metadata nel ledger;
- merge dell'archivio `.aura`;
- telemetria finanziaria o admin visibility sui file importati.

Follow-up candidati, subordinati a evidenza d'uso:

1. Category IDs stabili e gestione rename/archive per regole persistenti.
2. Mapping manuale colonne con profili banca salvati localmente.
3. Normalizzazione merchant piu robusta basata su fixture redatte e testate.
4. Persistenza cifrata di draft molto grandi con retention e cancellazione
   esplicite.
5. Import multi-valuta con valuta obbligatoria e nessuna conversione implicita.
