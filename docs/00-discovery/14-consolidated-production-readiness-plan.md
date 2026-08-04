# Aura Consolidated Production Readiness Plan

## Scopo

Questo documento traduce le otto priorita residue di Aura in un unico piano di
esecuzione verso una release Android controllata e verificabile.

Il piano non sostituisce i tracker di feature. Li coordina, elimina il lavoro
fantasma causato da checkbox obsolete e rende espliciti dipendenze, owner,
evidenze ed exit gate:

- [`08-ux-simplification-progress-plan.md`](./08-ux-simplification-progress-plan.md);
- [`09-color-hierarchy-progress-plan.md`](./09-color-hierarchy-progress-plan.md);
- [`10-portable-archive-progress-plan.md`](./10-portable-archive-progress-plan.md);
- [`11-android-payment-detection-progress-plan.md`](./11-android-payment-detection-progress-plan.md);
- [`12-deterministic-transaction-import-progress-plan.md`](./12-deterministic-transaction-import-progress-plan.md);
- [`13-android-production-release-plan.md`](./13-android-production-release-plan.md).
- [`16-android-only-onboarding-backup-progress-plan.md`](./16-android-only-onboarding-backup-progress-plan.md).

In caso di conflitto:

1. le decisioni approvate in project brief, solution strategy e ADR prevalgono;
2. il tracker di feature governa il comportamento della singola feature;
3. il tracker 13 governa promozione, Play, beta e produzione whole-app;
4. questo piano governa ordine di esecuzione, riconciliazione e chiusura
   coordinata delle evidenze residue.

Ultimo aggiornamento: 2026-08-04.

Decisione corrente: **NO-GO per beta real-user e produzione**. Sono consentiti
sviluppo locale, test automatici, emulatori, fixture sintetiche e preparazione
documentale. Nessuna notifica finanziaria reale deve essere letta finche i gate
privacy, sicurezza e pilot applicabili non sono approvati.

## Baseline Consolidata

### Implementato

- React/Vite e il dominio finanziario sono incorporati nell'app Android; il
  browser resta solo un harness di regressione e la distribuzione PWA e ritirata.
- Primo accesso mobile, tour contestuali e storage backup cifrato a cinque
  versioni sono implementati con copertura automatica.
- Il portale pubblico minimo e costruibile separatamente, ma non e ancora
  pubblicato o monitorato.
- UX simplification e color hierarchy sono implementate; resta la matrice
  manuale di release.
- Portable Archive M0-M6 e hardening automatico M7 sono implementati.
- Import deterministico M0-M5 e hardening automatico principale M6 sono
  implementati.
- Il runtime, la dipendenza, la configurazione client e le superfici admin
  Gemini sono rimossi. I marker Gemini residui nel codice servono alla pulizia
  della cache storica e ai verifier di assenza.
- Payment detection M4-M8 funziona con sorgente e fixture sintetiche; hardening
  automatico ed emulatore API 36 sono sostanzialmente completi.
- Esiste un AAB firmato localmente e la build release fallisce in modo sicuro
  senza configurazione esterna.

### Ancora bloccante

- evidenze operative Play e backup owner prima della closed beta, ora governati
  da C5/C8;
- cancellazione account end-to-end sul portale pubblicato e su device;
- configurazione Play production, supply chain e audit residui;
- matrice fisica, accessibilita manuale ed evidenze redatte;
- legal baseline, data inventory, lawful basis, DPIA e Data Safety whole-app;
- pubblicazione e monitoring di landing, privacy, deletion e support, oltre
  alla store listing;
- internal testing, beta, produzione e stabilizzazione.

### Correzioni documentali da applicare

- Il tracker 13 non deve piu dichiarare Gemini presente nel runtime o nell'AAB
  dopo una nuova scansione positiva dell'artifact target.
- Il tracker 11 non deve lasciare come `Non iniziato` documenti o ADR gia
  presenti; deve distinguere documento creato da approvazione owner mancante.
- Il tracker 08 deve separare task realmente residue da task implementate o
  superate dal tracker 09.
- Le evidenze automatiche storiche devono essere etichettate con commit e data;
  non valgono automaticamente per il futuro release candidate.

## Legenda E Ownership

### Stati

| Stato | Significato |
|---|---|
| `Non iniziato` | Nessuna evidenza di esecuzione |
| `Pronto` | Decisioni e dipendenze sufficienti per iniziare |
| `In corso` | Attivita avviata, exit gate non ancora chiuso |
| `Bloccato` | Manca una decisione, approvazione o risorsa esterna |
| `Completato` | Task, evidenza, review e documentazione sono chiusi |

### Ruoli

| Codice | Ruolo | Responsabilita principale |
|---|---|---|
| PO | Product owner | Scope, mercato, monetizzazione e go/no-go prodotto |
| AO | Android owner | Runtime nativo, manifest, Gradle e signing tecnico |
| WO | Web/React owner | UI, auth, dati, import, deletion e superfici web |
| QO | QA owner | Matrice, acceptance, defect triage ed evidenze |
| SO | Security owner | Threat model, audit, logging, supply chain e risk acceptance |
| PrO | Privacy owner | Inventario dati, basi giuridiche, DPIA, diritti e Data Safety |
| RO | Release owner | Play Console, artifact, rollout, rollback e release record |
| CO | Content owner | Landing, listing, screenshot, lingua e coerenza copy |
| SuO | Support owner | Canali, FAQ, intake e incident escalation |

Una persona puo coprire piu ruoli. Ogni approvazione deve comunque registrare
nome, ruolo, data, decisione ed eventuale scadenza.

## Dashboard Delle Otto Priorita

| ID | Priorita | Stato iniziale | Dipendenza principale | Exit sintetico |
|---|---|---|---|---|
| C1 | Riallineare i tracker | Completato | Nessuna | Baseline, mapping ed evidenze registrati; F-C1-001 resta un gate C4/RC |
| C2 | Chiudere decisioni e owner | Completato | Nessuna | Decisioni approvate, owner assegnati e condizioni operative registrate |
| C3 | Completare account deletion | In corso | Allowlist/retention C6, Firebase/physical evidence e support procedure | Boundary implementata; gate esterni e privacy residui aperti |
| C4 | Consolidare QA manuale | Pronto in parte | Device, RC e C3/C5 per il run finale | Matrice unica firmata senza P0/P1 aperti |
| C5 | Chiudere production e supply chain | In corso | C2 account/distribuzione | AAB Play-installable, ripetibile e approvato |
| C6 | Chiudere privacy e compliance | Bloccato | PrO nominativo e legal baseline | Governance e dichiarazioni corrispondono alla build |
| C7 | Pubblicare superfici e listing | Bloccato | C2, C3 e C6 | URL e contenuti pubblici verificati e coerenti |
| C8 | Eseguire rollout controllato | Bloccato | C1-C7 | Internal, beta, produzione e stabilizzazione chiuse |

Il numero di checkbox non misura l'avanzamento: C8 contiene per natura molte
attivita future, mentre C1 puo chiudere numerose checkbox obsolete senza
modificare codice.

## Sequenza Di Esecuzione

```text
C1 Baseline e tracker
  |
  v
C2 Decisioni e owner
  |
  +--> C3 Account deletion --------+
  +--> C5 Production/supply chain -+--> C4 QA finale su RC
  +--> C6 Privacy/compliance ------+
  +--> C7 Landing/listing ---------+
                                      |
                                      v
                                 C8 Rollout
```

C4 puo iniziare subito sulla build corrente per chiudere gap di ergonomia e
device. La sua acceptance finale deve pero essere ripetuta sul release candidate
prodotto dopo C3, C5, C6 e C7.

## C1. Riallineare I Tracker E La Baseline

### Obiettivo

Produrre una fotografia attendibile del lavoro residuo prima di aggiungere
nuove implementazioni o usare le checklist come gate di release.

### Dipendenze

Nessuna. Questa e la prima attivita eseguibile.

### Task

- [x] Congelare commit SHA, data, branch e stato della worktree usati per la
  riconciliazione.
- [x] Eseguire la baseline automatica corrente: `npm run test:regression`,
  `npm run test:e2e`, test/lint Android e verifier applicabili.
- [x] Rieseguire `verify:gemini-retirement` sugli asset web e Android target.
- [x] Aggiornare il tracker 12 a M6/M7 con evidenza corrente, senza chiudere i
  gate manuali non eseguiti.
- [x] Aggiornare P1A e la dashboard del tracker 13: segnare la rimozione Gemini
  come implementata dove l'evidenza artifact lo dimostra.
- [x] Riconciliare il tracker 11 con ADR 0002, ADR 0003, spec, architecture
  note, processing record e runbook gia esistenti.
- [x] Riconciliare il tracker 08 con il tracker 09 e con i test correnti;
  classificare ogni checkbox come `completa`, `residua` o `superata`.
- [x] Mantenere aperti i gate manuali di Portable Archive, import, UX e payment
  detection finche non esiste evidenza fisica.
- [x] Creare nel tracker 13 un indice univoco delle evidenze con owner, data,
  commit, device/build e link all'artifact redatto.
- [x] Separare il backlog non bloccante dal percorso di release: package name,
  dipendenze inutilizzate, bundle size, category ID e follow-up prodotto non
  devono confondersi con un gate P0.
- [x] Registrare eventuali incongruenze non risolvibili come rischio con owner e
  scadenza, senza inventare uno stato `Done`.

Completion record:
[`c1-baseline-2026-08-04.md`](../07-qa/c1-baseline-2026-08-04.md).

### Evidenze Richieste

- diff documentale dei tracker 08-13;
- output datato delle suite e dei verifier;
- tabella di mapping `vecchia task -> stato/evidenza canonica`;
- nuovo progress-log nel tracker 13.

### Exit Gate

- ogni affermazione di completamento ha un'evidenza rintracciabile;
- Gemini e descritto coerentemente in codice, artifact, privacy e tracker;
- non esistono checkbox aperte per documenti gia creati senza una nota che
  distingua creazione e approvazione;
- le otto priorita sono la vista operativa corrente.

## C2. Chiudere Decisioni Di Release E Owner

### Obiettivo

Rimuovere le ambiguita fondazionali che cambiano onboarding, autorizzazioni,
privacy, supporto, Play Console e architettura di release.

### Dipendenze

C1 completato per presentare dati aggiornati ai decisori.

### Decisioni Da Approvare

| ID | Decisione | Raccomandazione corrente | Implementazione bloccata |
|---|---|---|---|
| D-REL-001 | Modello di distribuzione | Internal -> closed beta allowlisted; pubblico non autorizzato | Approvata; onboarding pubblico resta fuori scope |
| D-REL-002 | Payment detection | Beta-only; prima produzione core-only senza listener | Approvata; ADR 0004 e split build/manifest richiesti |
| D-REL-003 | Versioni Android | API 36-only per internal/beta | Approvata; reach pubblica da rivalutare |
| D-REL-004 | Mercato e lingue | Italia iniziale, inglese, 18+; Europa successiva | Approvata |
| D-REL-005 | Monetizzazione | Gratuita | Approvata; nessun billing SDK |
| D-REL-006 | Account developer | Personale, Daniele Moltisanti | Approvata; account/verifiche/package confermati dal proprietario |
| D-REL-007 | Dominio pubblico | `aura.staituned.com` | Approvata; DNS/TLS successivi |
| D-REL-008 | Supporto | `support@staituned.com`, Daniele Moltisanti; risposta entro una settimana | Approvata; single-person accettato per internal, backup pre-beta |

### Task

- [x] Preparare un decision pack per D-REL-001..008 con opzioni,
  costi, rischi, raccomandazione e conseguenze sul go-live.
- [x] Assegnare PO, AO, WO, QO, SO, PrO, RO, CO e SuO nominativi a Daniele Moltisanti; sostituti assenti e rischio registrato.
- [x] Registrare approvazione, motivazione, data e condizioni per ogni decisione.
- [x] Confermare tipo e stato dell'account Play, developer verification,
  namespace `com.staituned.aura` e controllo del dominio; le evidenze redatte
  restano deliverable C5/C8.
- [x] Confermare scope distinto per internal, beta e prima produzione.
- [x] Confermare Italia iniziale, audience 18+, inglese e modello di accesso per
  ogni track; espansione europea successiva.
- [x] Aprire ADR per la decisione hard-to-reverse sulla presenza del listener;
  le altre decisioni non modificano le boundary architetturali correnti.
- [x] Aggiornare project brief, brainstorm, strategy e tracker 13 con le
  decisioni approvate.

Decision pack:
[`15-c2-release-decision-pack.md`](./15-c2-release-decision-pack.md).

### Exit Gate

- D-REL-001..008 non sono piu `Aperta`;
- ogni ruolo ha un owner principale e un sostituto dove operativo;
- account, package, dominio e requisiti Play sono verificati;
- nessun team deve assumere implicitamente access model, mercato o scope del
  listener.

## C3. Completare Account E Data Deletion

### Obiettivo

Permettere all'utente di eliminare in modo verificabile l'account Aura e tutti i
dati controllati da Aura, distinguendo questa operazione da reset locale,
logout e cancellazione del solo backup cloud.

### Definition Of Ready

- C2 approva modello di accesso e definizione di account Aura;
- C6 produce almeno il data inventory iniziale e la retention matrix;
- sono identificati tutti i repository locali, remoti e nativi per Firebase UID;
- il privacy owner approva dati eliminati, anonimizzati o trattenuti.

### Contratto Da Congelare

- superfici coinvolte: Firebase Auth, allowlist/hash email applicabile,
  Firestore backup e dati legacy, localStorage, IndexedDB/attachment, cache,
  Room candidate store, preferenze, tombstone, journal e Keystore;
- reautenticazione recente obbligatoria prima dell'azione irreversibile;
- workflow idempotente, riprendibile e fail-closed;
- successo mostrato solo quando le superfici obbligatorie sono confermate;
- copie `.aura` gia esportate restano fuori dal controllo di Aura;
- percorso web disponibile anche a utenti disinstallati o senza accesso;
- retention legale o tecnica residua documentata con finalita e durata.

### Slice C3.1 — Inventory E Domain Contract

- [x] Mappare dati, chiavi, owner, repository, retention e delete operation nel
  record engineering C3.
- [x] Definire stati typed del workflow: preflight, reauth, deleting local,
  deleting native, deleting remote, deleting auth, partial failure, retry e
  complete.
- [x] Definire ordine delle operazioni e recovery/retry dopo crash/offline.
- [x] Stabilire quali fallimenti bloccano il successo e quali richiedono follow-up
  supportato.
- [x] Rendere gli adapter idempotenti e gli stati privi di dati sensibili; non
  persistere UID/email/token in un journal client.
- [x] Aggiungere ADR se il coordinamento cross-storage introduce una boundary
  architetturale duratura non coperta dagli ADR esistenti.

### Slice C3.2 — Data E Service Layer

- [x] Implementare adapter espliciti per cancellazione locale, attachment,
  Firebase Auth e backup; allowlist e dati legacy restano gate C6/backend.
- [x] Implementare orchestratore testabile fuori dai componenti pagina.
- [x] Rendere retry sicuro dopo errore parziale; process-kill recovery richiede
  ancora evidenza E2E.
- [x] Garantire tramite adapter current-user/UID-scoped che account switch non
  cancelli o riutilizzi dati dell'owner
  sbagliato.
- [x] Evitare wildcard distruttive e limitare ogni delete a namespace e UID
  risolti.
- [x] Preservare least privilege Firestore; la rimozione allowlist resta un gate
  backend/C6 invece di consentire delete arbitrari dal client.

### Slice C3.3 — Android Native Purge

- [x] Collegare il workflow account deletion al purge nativo gia esistente.
- [ ] Verificare cancellazione Room, preferenze, tombstone, journal e chiavi
  applicabili per il solo owner target.
- [ ] Testare database chiuso, Keystore invalidato, process recreation e doppio
  tap senza successo falso.

### Slice C3.4 — UX In-App E Web

- [x] Separare chiaramente `Delete Aura account`, `Delete local data`, logout e
  cancellazione backup.
- [x] Mostrare scope, irreversibilita, copie esportate e possibili retention
  prima della conferma.
- [x] Richiedere reautenticazione e conferma accessibile senza dark pattern.
- [x] Coprire loading, errore parziale, retry, successo e support path; evidenza
  offline E2E resta aperta.
- [x] Esporre un link stabile alla pagina pubblica `/account-deletion`.
- [ ] Completare il percorso pubblico per utenti senza app/sessione: sign-in e
  support handoff sono implementati; intake manuale privacy-safe e relativa
  verifica identita restano da definire.

### Slice C3.5 — Test, Security E Privacy

- [x] Unit test per ordering, fail-closed, retry boundary e namespace locale;
  process recreation resta nella matrice fisica.
- [ ] Integration test per Firebase emulator, storage locale e bridge nativo.
- [ ] E2E online, offline, reauth fallita, retry, doppio tap, account switch e
  crash intermedio.
- [x] Verificare staticamente che il nuovo workflow non logghi UID, email,
  token o dati finanziari; rimosso anche il log UID preesistente del backup.
- [ ] Aggiornare data inventory, retention, rights handling, processing record,
  Data Safety e account-deletion record: record C3 creato, legal baseline,
  allowlist/legacy e Data Safety restano C6.
- [ ] Eseguire review root-cause, architettura, security/privacy e test coverage
  prima del merge.

### Rollback

Il workflow non puo essere annullato dopo la cancellazione confermata. Il
rollback riguarda solo il software: disabilitare l'entrypoint o tornare al
bundle precedente in caso di difetto, senza promettere recupero dei dati gia
eliminati. Le copie `.aura` controllate dall'utente non vengono cancellate.

### Exit Gate

- cancellazione completa provata su web/PWA e Android;
- nessuna superficie remota obbligatoria rimane silenziosamente attiva;
- retry e recovery non producono commistione account o successo falso;
- pagina pubblica, informativa e risposte Play corrispondono al comportamento;
- evidenza approvata da WO, AO, QO, SO e PrO.

## C4. Consolidare La QA Manuale In Una Matrice Unica

### Obiettivo

Chiudere una volta sola, con evidenze riutilizzabili, i gate manuali condivisi
da UX, archive, import, payment detection e release Android.

### Ambienti Minimi

- browser desktop Chromium e WebKit supportati;
- browser mobile fisico e PWA installata;
- Android 16/API 36 stock;
- Android 16/API 36 OEM con gestione processi aggressiva;
- build installata da Play per l'acceptance finale;
- account sintetico non privilegiato e file/notification fixture sintetiche.

### Matrice C4.1 — UX E Accessibilita

- [ ] 320, 360, 390, 430 e 768 px; portrait e landscape applicabili.
- [ ] Light/dark, contrasto, font scaling e reduced motion.
- [ ] Tastiera, switch access, focus order, focus restore e focus trap.
- [ ] TalkBack e almeno uno screen reader browser.
- [ ] Loading, empty, error, offline, permission denied e success states.
- [ ] Bottom navigation, header, dialog, bottom sheet, category picker e toast.
- [ ] Acquisire screenshot baseline corrente; non ricreare retroattivamente una
  baseline pre-implementazione inesistente.

### Matrice C4.2 — Portable Archive

- [ ] Export cifrato e plaintext esplicitamente confermato su device fisico.
- [ ] Export -> wipe -> import -> replace -> reload con equivalenza completa.
- [ ] File picker e download nella PWA installata e nella WebView Android.
- [ ] Wrong password, tampering, safety copy, interruption e resume.
- [ ] Archivio circa 32 MiB sul device meno capace, con memoria e tempo misurati.
- [ ] Confermare che copie esportate non sono cancellate da account deletion.

### Matrice C4.3 — Import Deterministico

- [ ] Template CSV/XLSX, picker, review, batch category, commit e reload.
- [ ] File invalido, grande, formula, duplicato e persistence failure.
- [ ] 20.000 righe sul device target con DOM limitato e UI responsiva.
- [ ] Zero richieste provider durante import e corretta separazione `.aura`/CSV.

### Matrice C4.4 — Payment Detection

- [ ] Process kill, reboot, rebind, revoca/ripristino e battery restriction.
- [ ] Package-before-extras, package non selezionati e negative rules.
- [ ] Dedupe, acceptance idempotente, ignore, delete pending e purge.
- [ ] Lock screen privata/pubblica secondo opt-in.
- [ ] Android Auto Backup/D2D e restore con transazioni confermate.
- [ ] Network capture con zero richieste dal detection path.
- [ ] Logcat release senza raw notification, importo, merchant, UID o token.
- [ ] Sorgenti reali soltanto dopo autorizzazione PrO/SO e processo fixture
  approvato; altrimenti usare esclusivamente sorgente sintetica.

### Gestione Evidenze E Difetti

- [ ] Usare un acceptance record unico con build, commit, device, OS, tester,
  esito e link a screenshot/video/log redatti.
- [ ] Non allegare dati finanziari reali, notification raw, token o email.
- [ ] Classificare difetti P0/P1/P2 con owner, riproduzione e release impact.
- [ ] Rieseguire casi impattati dopo ogni fix e la smoke matrix sul RC finale.
- [ ] Collegare la stessa evidenza ai tracker 08-13 invece di duplicarla.

### Exit Gate

- matrice obbligatoria completata su PWA e device Android dichiarati;
- nessun P0/P1 aperto o accettato informalmente;
- accessibilita manuale e memoria archive hanno evidenza;
- QO firma l'acceptance e SO/PrO approvano le evidenze sensibili applicabili.

## C5. Chiudere Production Configuration E Supply Chain

### Obiettivo

Produrre un AAB Play-installable ripetibile, attribuibile, privo di configurazioni
debug/test, segreti e dipendenze non approvate.

### Dipendenze

C2 per account, scope listener e modello di accesso. C3 deve chiudere prima del
release candidate, ma la configurazione tecnica puo avanzare in parallelo.

### Task

- [ ] Registrare l'app in Play Console e attivare Play App Signing.
- [ ] Conservare upload key, password, alias e recovery fuori da repository,
  log e ticket; registrare custodi e backup owner.
- [ ] Registrare fingerprint Play App Signing in Firebase/Google OAuth e
  verificare Google Sign-In da installazione Play.
- [ ] Rendere `versionCode` monotono e documentare versioning e release naming.
- [ ] Spostare la sorgente sintetica in `debug`/`androidTest` e provarne
  l'assenza nel manifest release merged.
- [ ] Limitare package visibility alle sole sorgenti production approvate.
- [ ] Verificare exported components, intent filter, FileProvider e URI grant.
- [ ] Applicare D-REL-002: listener incluso oppure assente dalla variante della
  prima produzione.
- [ ] Eseguire `npm audit --omit=dev` e audit Gradle sul commit candidato.
- [ ] Rimuovere dipendenze runtime inutilizzate; per ogni advisory residua
  registrare reachability, severita, owner, scadenza e risk acceptance SO.
- [ ] Riesaminare lockfile e provenance; vietare download dinamico di codice.
- [ ] Riesaminare Firestore rules per allowlist/self-service e aggiungere test
  emulator.
- [ ] Valutare App Check/Play Integrity senza rompere la PWA; nessun enforcement
  prima di rollout e fallback documentati.
- [ ] Verificare R8 mapping, resource shrinking, secret scan, config debug e
  contenuto AAB.
- [ ] Provare build da checkout pulito con sole istruzioni versionate.
- [ ] Archiviare AAB, mapping, checksum, commit SHA, versioni toolchain, release
  notes e output verifier nel release record.

### Gate Automatico Minimo Per RC

- `npm run lint`;
- `npm run test`;
- `npm run build`;
- `npm run test:e2e`;
- `npm run android:test`;
- `npm run android:test:instrumentation`;
- `npm run android:lint`;
- `npm run android:verify:release-readiness`;
- `npm run android:bundle:release`;
- verifier Gemini/artifact e audit dipendenze.

### Exit Gate

- login dalla build Play e Play App Signing funzionano;
- AAB non contiene Gemini runtime, segreti, config debug o sorgenti sintetiche;
- artifact e mapping sono riproducibili e rintracciabili;
- audit, manifest e regole backend sono approvati dal SO;
- rollback tecnico e sostituzione artifact sono provati.

## C6. Chiudere Privacy, GDPR, AI Governance E Play Compliance

### Obiettivo

Rendere verificabile la corrispondenza tra dati realmente trattati, build,
informative, diritti utente e dichiarazioni Play, senza implicare certificazione
legale.

### Blocco Legale Corrente

`docs/legal/legal-source-register.md` non esiste. Finche non viene creato e
approvato, il repository non dispone della baseline legale richiesta dalle
istruzioni di progetto. Questioni controverse o non risolte richiedono review
umana competente; non devono essere concluse per inferenza tecnica.

### Task C6.1 — Baseline E Inventory

- [ ] Creare `docs/legal/legal-source-register.md` e applicare la legal update
  policy del repository.
- [ ] Identificare titolare, eventuali responsabili/subprocessori, ruoli e
  trasferimenti applicabili.
- [ ] Creare data inventory/RoPA whole-app per auth, allowlist, backup,
  archive/import, attachment, deletion, payment detection, support e Play.
- [ ] Registrare finalita, base giuridica, categorie dati, destinatari,
  retention e misure per ogni attivita.
- [ ] Mappare Firebase/Google e ogni vendor con contratto, regione e trasferimenti.
- [ ] Definire processo di accesso, export, rettifica, cancellazione, opposizione
  e supporto per gli interessati.

### Task C6.2 — DPIA E Security Approval

- [ ] Completare screening DPIA per notification access e monitoraggio locale.
- [ ] Escalare a DPIA completa se lo screening o la baseline lo richiedono.
- [ ] Approvare threat model whole-app: auth, bridge, backup, archive, import,
  deletion, logs, network e support.
- [ ] Approvare retention dei candidati, tombstone, journal, dati legacy e copie
  controllate dall'utente.
- [ ] Registrare risk acceptance con owner e scadenza; nessuna approvazione
  implicita per silenzio.

### Task C6.3 — AI Governance

- [ ] Creare `docs/10-ai-governance/no-ai-production-decision.md`.
- [ ] Registrare che import, payment detection e reporting production sono
  deterministici e non usano AI.
- [ ] Documentare dati Firestore Gemini storici, accesso negato, retention e
  futura cancellazione senza eseguire delete non autorizzate.
- [ ] Richiedere nuova discovery, privacy/subprocessor review, AI governance e
  FinOps prima di reintrodurre modelli o remote categorization.

### Task C6.4 — Play Data Safety E App Content

- [ ] Creare `android-whole-app-data-safety-record.md` dalla build finale e
  dall'inventario SDK/rete verificato.
- [ ] Allineare Data Safety, privacy policy, permission list, account deletion e
  listing alla stessa versione AAB.
- [ ] Preparare prominent disclosure immediatamente prima di notification access
  con azioni Agree/Decline distinte.
- [ ] Preparare video review con soli dati sintetici.
- [ ] Completare ads, app access, target audience, content rating, financial
  features, data deletion, permission ed export-law declarations applicabili.
- [ ] Rieseguire policy review usando le fonti ufficiali correnti al momento
  della submission, secondo il legal source register.

### Evidenze Privacy-Sensitive

- personal data touched: UID/email auth, dati finanziari locali, attachment,
  backup cifrati, notification candidate temporanei e support request;
- retention/deletion/export: devono essere coperti da inventory, matrix e
  account deletion record;
- vendor: Firebase/Google e hosting/support scelti in C2/C7;
- nessun nuovo vendor o analytics puo essere aggiunto senza nuova review.

### Exit Gate

- legal register, inventory, retention, rights e DPIA sono approvati dal PrO;
- threat model e risk acceptance sono approvati dal SO;
- Data Safety e App Content corrispondono alla build candidata;
- decisione no-AI e dati legacy Gemini sono documentati;
- nessuna copy afferma conformita o certificazione non approvata.

## C7. Pubblicare Landing, Supporto E Store Listing

### Obiettivo

Fornire superfici pubbliche accessibili, coerenti con la build e sufficienti per
utente, supporto, privacy e review Play.

### Dipendenze

C2 per identita, dominio, mercato, lingua e supporto; C3 per deletion; C6 per
privacy, Data Safety e copy consentita.

### Information Architecture Minima

- [ ] `/` — valore, audience, funzioni reali, PWA/Android e limiti.
- [ ] `/privacy` — informativa HTML pubblica e versionata.
- [ ] `/account-deletion` — procedura in-app e alternativa web.
- [ ] `/support` — FAQ, contatto, app supportate, permessi, backup/import e
  incident intake.
- [ ] `/terms` — responsabilita, limiti, account, contenuti e legge applicabile
  approvati.
- [ ] `/security` — sintesi controlli e canale di responsible disclosure, se
  approvato.
- [ ] `security.txt` — solo se esiste un canale security realmente monitorato.

### Requisiti Di Implementazione

- [ ] HTTPS, dominio controllato, pagine senza auth wall e URL stabili.
- [ ] Nome app/developer identico a launcher, login e Play.
- [ ] Copy local-first qualificata: auth e backup opzionale sono eccezioni
  esplicite; evitare `all data stays on device`.
- [ ] Nessun analytics per default; ogni analytics futuro richiede privacy e
  FinOps review.
- [ ] Dati e screenshot esclusivamente sintetici.
- [ ] Mobile/desktop, tastiera, screen reader, light/dark e link check.
- [ ] Email support verificata, monitorata e dotata di backup owner.
- [ ] Hosting, deploy, backup e rollback documentati.

### Store Listing

- [ ] App name, short description e full description coerenti con lo scope.
- [ ] Icona 512x512 e feature graphic 1024x500.
- [ ] Almeno due screenshot phone validi; target quattro o piu ad alta qualita.
- [ ] Screenshot di Home, Add, Reports, privacy/backup e detection solo se inclusa.
- [ ] Alt text per ogni asset e localizzazioni solo per lingue supportate.
- [ ] Support email, website, privacy URL e deletion URL verificati.
- [ ] Reviewer instructions, account sintetico e disclosure walkthrough.
- [ ] Release notes coerenti con il track; video marketing separato dal video
  policy se prodotto.

### Exit Gate

- tutte le URL P0 sono pubbliche, accessibili e monitorate;
- privacy, deletion, support e listing corrispondono a build e decisioni;
- asset non contengono dati reali o claim non dimostrati;
- CO, PrO, SuO e RO approvano contenuto ed evidenza.

## C8. Eseguire Rollout Controllato E Stabilizzazione

### Obiettivo

Promuovere lo stesso artifact approvato attraverso internal testing, beta e
produzione mantenendo stop condition, containment e rollback operativi.

### C8.1 — Release Candidate

- [ ] Congelare commit, versionCode/versionName, scope, decisioni e known issues.
- [ ] Chiudere C1-C7 e tutti i B-REL applicabili.
- [ ] Eseguire gate automatici C5 e acceptance finale C4 sullo stesso artifact.
- [ ] Eseguire recovery/containment rehearsal e archiviare evidenza.
- [ ] Confermare zero P0/P1, oppure risk acceptance formale dove consentita.
- [ ] Firmare GO internal con PO, QO, SO, PrO e RO.

### C8.2 — Play Internal Testing

- [ ] Caricare AAB nel track Internal Testing.
- [ ] Verificare certificato App Signing e OAuth dopo installazione Play.
- [ ] Limitare account e tester ai nominativi approvati.
- [ ] Provare first run, auth, deletion, backup, archive, import e update path.
- [ ] Mantenere payment detection sintetico finche PrO/SO non autorizzano il
  perimetro reale.
- [ ] Verificare pre-launch report, App Bundle Explorer, Play Vitals e policy
  alert.
- [ ] Eseguire un ticket support sintetico e il rollback/replacement rehearsal.
- [ ] Registrare exit decision internal.

### C8.3 — Closed Beta

- [ ] Definire partecipanti, paesi, durata e requisiti Play applicabili.
- [ ] Fornire informativa beta, supporto e canale diritti/recesso.
- [ ] Tenere detection off finche ogni utente non accetta la disclosure.
- [ ] Limitare il pilot a 1-2 sorgenti approvate ed exact templates.
- [ ] Raccogliere precisione, falsi positivi/negativi, duplicati e modifiche con
  feedback volontario redatto, senza notification raw.
- [ ] Applicare stop condition per leakage, cross-account, doppia transazione,
  crash critici o policy alert.
- [ ] Monitorare Play Vitals e support burden senza candidate telemetry.
- [ ] Registrare exit decision beta e risposte production-access Play.

### C8.4 — Produzione Controllata

- [ ] Confermare tutti i B-REL chiusi e GO finale firmato.
- [ ] Usare managed publishing se serve separare approvazione Play e lancio.
- [ ] Definire percentuali, finestre, owner e stop condition per ogni step.
- [ ] Eseguire smoke test post-publish da device/account puliti.
- [ ] Monitorare install failure, auth, deletion, backup, support, crash/ANR e
  policy alert.
- [ ] Applicare containment al primo trigger: stop rollout, deactivate artifact,
  build core-only o nuova release secondo il caso.
- [ ] Pubblicare comunicazioni e release notes soltanto quando artifact e URL
  sono effettivamente disponibili.

### C8.5 — Stabilizzazione

- [ ] Review operative a 24 ore, 72 ore, 7 giorni e 30 giorni.
- [ ] Riconciliare Vitals, recensioni, ticket, privacy request e regressioni.
- [ ] Aggiornare FAQ, runbook, changelog e risk register da evidenze reali.
- [ ] Chiudere o rinnovare risk acceptance con scadenza.
- [ ] Registrare versioni supportate, hotfix ed end-of-support.
- [ ] Rivalutare mercati, lingue, minSdk, sorgenti payment e monetizzazione solo
  dopo stabilizzazione.

### Exit Gate

- l'app e pubblicata nel mercato e perimetro approvati;
- build, store, privacy, Data Safety e supporto descrivono la stessa realta;
- rollback, containment e hotfix sono stati provati;
- nessun rischio residuo e privo di owner o scadenza;
- tracker, project brief, strategy, changelog e runbook sono aggiornati allo
  stato production.

## Deliverable E Artifact Matrix

| Artifact | Priorita | Owner | Stato corrente |
|---|---|---|---|
| Tracker 08-13 riconciliati | C1 | RO/QO | Completato; baseline C1 pubblicata |
| Decision log D-REL-001..008 | C2 | PO | Completato nel decision pack 15 |
| Owner matrix nominativa | C2 | PO | Owner primari completati; backup obbligatorio prima della beta |
| `docs/04-privacy-gdpr/android-account-deletion-record.md` | C3/C6 | WO/PrO | Creato; approvazioni/evidenze residue aperte |
| Account deletion in-app e web | C3 | WO/AO | Implementato; integrazione Firebase e QA fisica aperte |
| Acceptance record consolidato | C4 | QO | Da creare/aggregare |
| Final AAB, mapping, checksum e release record | C5/C8 | AO/RO | Finale mancante |
| `docs/legal/legal-source-register.md` | C6 | PrO | Mancante |
| `docs/04-privacy-gdpr/android-whole-app-data-safety-record.md` | C6 | PrO/RO | Mancante |
| `docs/10-ai-governance/no-ai-production-decision.md` | C6 | PrO/PO | Mancante |
| Privacy, deletion, support e terms pubblici | C7 | CO/PrO/SuO | Mancanti |
| `docs/specs/android-public-distribution.md` | C2/C7 | PO/CO | Mancante |
| `docs/07-qa/android-production-release-acceptance.md` | C4 | QO | Mancante |
| `docs/03-operations/android-production-release-runbook.md` | C5/C8 | RO | Mancante |
| Play Console/App Content/listing evidence | C7/C8 | RO/CO | Mancante |

## Quality Gates Trasversali

### Test

- nuova logica: unit test;
- workflow cross-storage e Firebase: integration test;
- flussi critici: E2E e Android instrumentation;
- bug fix: regression che riproduce la root cause;
- release: suite automatica completa e QA manuale sullo stesso RC.

### Sicurezza E Privacy

- least privilege per auth, Firestore, Play e supporto;
- nessun secret, token, UID/email, notification raw o dato finanziario nei log;
- dati sintetici per fixture, screenshot, video e reviewer account;
- ogni nuova raccolta, vendor, trasferimento o retention richiede aggiornamento
  degli artifact prima del merge/promozione.

### UX E Accessibilita

- semantics, label, focus, tastiera/switch, TalkBack e contrasto;
- loading, empty, error, offline, permission denied e success;
- shared tokens/components, light/dark e reduced motion;
- nessun gate chiuso soltanto con viewport emulato quando e richiesto un device
  fisico.

### Osservabilita E FinOps

Consentiti: Play Vitals generici, error code/phase redatti, feedback volontario
redatto e metriche aggregate Play. Vietati senza nuova review: analytics con
dati finanziari o candidate, raw notification, UID/email, remote config e
breadcrumb sensibili.

Non serve un admin cost panel per il go-live attuale. PO/RO devono pero
registrare budget, alert e owner per Play, Firebase, hosting, dominio, device QA
e supporto. AI, analytics o servizi usage-based futuri riaprono la valutazione
FinOps e admin cost visibility.

## Definition Of Ready Globale

- C1 ha prodotto una baseline coerente;
- le decisioni che cambiano la slice sono approvate prima dell'implementazione;
- owner, ambiente, fixture e acceptance evidence sono identificati;
- data/security/privacy impact e rollback sono definiti;
- nessuna task richiede dati reali prima dell'autorizzazione applicabile.

## Definition Of Done Globale

- C1-C8 e i relativi exit gate sono completati;
- tutti i B-REL applicabili sono chiusi;
- account deletion, auth, backup, archive, import e payment scope incluso sono
  provati su artifact Play-installed e device fisici;
- non esistono P0/P1 o policy alert aperti;
- privacy, Data Safety, deletion, listing e build sono coerenti;
- rollback, containment, incident escalation e supporto sono operativi;
- documenti, ADR, tracker, changelog ed evidenze descrivono la realta;
- ogni rischio residuo ha owner, scadenza e approvazione.

## Rischi Principali

| Rischio | Impatto | Mitigazione | Owner |
|---|---|---|---|
| Tracker obsoleti guidano lavoro duplicato | Alto | C1 prima di nuove slice | RO/QO |
| Access model deciso tardi richiede rework | Alto | Chiudere D-REL-001 prima di C3/C5/C7 | PO |
| Delete parziale mostra successo falso | Critico | State machine, journal, read-back e fail-closed | WO/AO/SO |
| Evidenza emulata nasconde difetti OEM/PWA | Alto | Device stock+OEM e PWA fisica in C4 | QO |
| AAB contiene test source o config debug | Critico | Variant isolation e artifact scan C5 | AO/SO |
| Informativa non corrisponde alla build | Critico | Inventory build-to-declaration C6 | PrO/RO |
| Supporto raccoglie dati sensibili | Alto | Intake redatto, no allegati automatici | SuO/PrO |
| Rollout senza containment praticabile | Critico | Rehearsal prima di ogni promozione | RO/QO |

## Change Control E Progress Log

Aggiornare questo piano quando:

- una priorita cambia stato;
- viene approvata una D-REL;
- cambia una dipendenza o un owner;
- viene prodotto o invalidato un artifact;
- un gate fallisce o viene chiuso;
- cambia il GO/NO-GO.

Non marcare una priorita `Completato` soltanto perche il codice e stato scritto.
Servono exit gate, evidenza, documentazione e approvazioni applicabili.

| Data | Priorita | Evento | Evidenza/decisione |
|---|---|---|---|
| 2026-08-04 | C1-C8 | Creato piano consolidato delle otto priorita residue | Baseline derivata dai tracker 08-13 e dalla strategia approvata |
| 2026-08-04 | C1 | Riconciliazione completata | Baseline `8684652`: 482/482, build, Gemini scan, Android unit/lint e 34/34 instrumentation verdi; full E2E 47/48 con F-C1-001 aperto |
| 2026-08-04 | C2 | Direzione preliminare e owner primari registrati | Decision pack 15 e ADR 0004; conferme finali registrate nella voce successiva |
| 2026-08-04 | C2 | Priorita completata | Italia iniziale, inglese, 18+, Play/account/package confermati e supporto entro una settimana; backup pre-beta registrato come gate C8 |
| 2026-08-04 | C3 | Boundary account deletion implementata | ADR 0005, spec V1, pagina pubblica, reauth e orchestratore fail-closed; allowlist/retention, support procedure ed evidenze reali restano aperti |
