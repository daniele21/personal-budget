# Aura Android Production Release Plan

## Scopo

Questo documento e il tracker operativo unico per portare **l'intera
applicazione Aura Android** da artifact tecnico a pubblicazione Google Play in
produzione.

Il piano non sostituisce i tracker di feature. Li usa come dipendenze:

- [`10-portable-archive-progress-plan.md`](./10-portable-archive-progress-plan.md)
  governa Aura Portable Archive V1;
- [`11-android-payment-detection-progress-plan.md`](./11-android-payment-detection-progress-plan.md)
  governa il payment detection Android;
- [`12-deterministic-transaction-import-progress-plan.md`](./12-deterministic-transaction-import-progress-plan.md)
  governa la sostituzione del runtime Gemini con l'import locale;
- questo documento governa scope di release, account Play, configurazione
  production, compliance whole-app, landing page, store listing, QA fisica,
  internal testing, beta, rollout, rollback e stabilizzazione post-lancio.

Una task e completa soltanto quando esiste l'evidenza richiesta. Una build
firmata o un test automatico verde non autorizzano da soli l'accesso a
notifiche finanziarie reali, una beta con utenti reali o la produzione.

## Stato Del Programma

Ultimo aggiornamento: 2026-08-04

Decisione corrente: **NO-GO per produzione e per beta real-user**.

La repository dispone di un AAB release firmato, il verificatore di
configurazione Android passa e la firma dell'artifact e verificabile. C1
conferma inoltre che runtime, SDK, env e superfici client Gemini sono rimossi e
che gli asset web/Android non contengono marker del runtime ritirato. L'AAB
corrente non e ancora un release candidate caricabile perche la sorgente
sintetica resta nella package visibility production e non sono chiusi account
deletion, privacy whole-app, QA fisica e Play Console.

### Dashboard

| Milestone | Stato | Gate principale |
|---|---|---|
| P0. Decisioni, owner e account Play | Completato | Decisioni C2 approvate; evidenze Console e backup pre-beta proseguono nei gate successivi |
| P1. Blocker di prodotto, dati e sicurezza | Bloccato | Runtime Gemini rimosso; acceptance finale import e cancellazione account restano incompleti |
| P2. Configurazione production e supply chain | In corso | AAB firmato presente; Play App Signing, hardening finale e audit aperti |
| P3. Feature acceptance whole-app | Bloccato | Dipende da tracker 10, 11 e 12 e dalla matrice fisica |
| P4. Privacy, compliance e Play declarations | Bloccato | Privacy owner, legal baseline, DPIA e Data Safety aperti |
| P5. Landing, supporto e store listing | Non iniziato | Nessuna superficie legale/support pubblica |
| P6. Release candidate e QA fisica | Bloccato | Dipende da P1-P5 |
| P7. Play Internal Testing | Bloccato | Dipende dal release candidate P6 |
| P8. Closed beta | Bloccato | Dipende da internal acceptance e approvazioni real-user |
| P9. Produzione controllata | Bloccato | Dipende dalla beta e dal GO finale |
| P10. Stabilizzazione e chiusura | Non iniziato | Inizia dopo il primo rollout production |

Focus corrente: **P0 e P1 - chiudere decisioni, completare l'acceptance
dell'import, rendere completa la cancellazione account e definire la
distribuzione**.

## Legenda

| Stato | Significato |
|---|---|
| `Non iniziato` | Nessuna attivita eseguita |
| `In corso` | Attivita avviata, exit gate non ancora soddisfatto |
| `Bloccato` | Dipendenza, decisione, approvazione o evidenza esterna mancante |
| `Completato` | Task, test, evidenza, review e documentazione chiusi |

Priorita:

- `P0`: impedisce qualsiasi upload o uso real-user;
- `P1`: impedisce la produzione, ma puo consentire un internal test limitato se
  il rischio e escluso dalla build;
- `P2`: hardening o miglioramento necessario entro il rollout completo.

Ruoli:

| Codice | Ruolo | Responsabilita |
|---|---|---|
| `PO` | Product owner | Scope, pubblico, mercati, pricing, go/no-go prodotto |
| `AO` | Android owner | Gradle, manifest, runtime nativo, signing tecnico |
| `WO` | Web/React owner | UI condivisa, auth, dati, import, landing tecnica |
| `QO` | QA owner | Test matrix, device evidence, regression e acceptance |
| `SO` | Security owner | Threat model, dipendenze, logging, supply chain, risk acceptance |
| `PrO` | Privacy owner | Informativa, data inventory, base giuridica, DPIA, diritti |
| `RO` | Release owner | Play Console, artifact, rollout, rollback, release record |
| `CO` | Content/brand owner | Store listing, screenshot, localizzazione, landing copy |
| `SuO` | Support owner | Canali di supporto, SLA, FAQ, incident intake |

Una persona puo coprire piu ruoli, ma ogni approvazione deve indicare ruolo,
nome, data e decisione.

## Principi Non Negoziabili

- PWA e Android restano due distribuzioni dello stesso prodotto.
- Il ledger React/AppData resta l'unica fonte di verita finanziaria.
- Il runtime Android production usa asset web locali, mai `server.url` remoto.
- Il payment detection resta off di default, locale, deterministico e soggetto
  a conferma umana.
- Nessuna notifica grezza, importo, merchant o identificatore di pagamento entra
  in log, analytics, Firebase, Gemini, backup o support attachment automatico.
- L'import generico production diventa locale e deterministico; Gemini e
  rimosso dalla target architecture.
- Le dichiarazioni Play, la landing e la privacy policy descrivono il
  comportamento dell'intera build, non soltanto il payment detection.
- Nessuna promessa di conformita legale o certificazione viene pubblicata senza
  approvazione competente.

## Decisioni Di Release

Queste decisioni bloccano il GO pubblico. Devono essere registrate in questa
tabella e, quando modificano strategia o architettura, nei documenti/ADR
applicabili.

| ID | Decisione | Opzioni | Raccomandazione | Owner | Stato |
|---|---|---|---|---|---|
| D-REL-001 | Modello di distribuzione | allowlist/closed beta; pubblico self-service; private managed app | Internal, poi closed beta allowlisted; pubblico non ancora autorizzato | Daniele Moltisanti (PO) | Approvata 2026-08-04 |
| D-REL-002 | Payment detection nella prima produzione | incluso; beta-only; release core senza listener | Beta-only; prima produzione core-only senza listener | Daniele Moltisanti (PO/PrO/SO) | Approvata 2026-08-04; ADR 0004 |
| D-REL-003 | Versioni Android supportate | API 36-only; minSdk inferiore con matrice ampliata | API 36-only per internal/beta; reach pubblica da rivalutare | Daniele Moltisanti (PO/AO/QO) | Approvata 2026-08-04 |
| D-REL-004 | Mercati e lingue | Italia; Europa; globale | Italia iniziale, inglese, audience 18+; Europa in una fase successiva | Daniele Moltisanti (PO/CO) | Approvata 2026-08-04 |
| D-REL-005 | Monetizzazione | gratuita; paid download; acquisti/subscription futuri | Gratuita | Daniele Moltisanti (PO) | Approvata 2026-08-04 |
| D-REL-006 | Account sviluppatore | personale; organizzazione | Personale, nome pubblico Daniele Moltisanti, nessuna societa/P.IVA/D-U-N-S | Daniele Moltisanti (PO/RO) | Approvata; account, verifiche applicabili e package confermati dal proprietario |
| D-REL-007 | Dominio pubblico | stesso host PWA; sottodominio app; sito separato | `aura.staituned.com`, controllo dominio dichiarato dal PO | Daniele Moltisanti (PO/WO/RO) | Approvata 2026-08-04; DNS/TLS da verificare |
| D-REL-008 | Supporto operativo | email owner; casella condivisa; form/ticketing | `support@staituned.com`, gestita da Daniele Moltisanti; risposta entro una settimana | Daniele Moltisanti (SuO/PO) | Approvata; rischio single-person accettato per internal, backup obbligatorio pre-beta |

Decision pack e conseguenze:
[`15-c2-release-decision-pack.md`](./15-c2-release-decision-pack.md).

## Gate Bloccanti Di Programma

| ID | Gate | Evidenza richiesta | Owner | Stato |
|---|---|---|---|---|
| B-REL-001 | Decisioni D-REL-001..008 approvate | Decision log datato | PO | Chiuso 2026-08-04 |
| B-REL-002 | Owner nominativi assegnati | Tabella ruoli compilata | PO | Chiuso per owner primario; rischio single-person accettato solo per internal |
| B-REL-003 | Namespace/package Play disponibile e registrato | Screenshot/export Play Console redatto | RO | Confermato dal proprietario; evidenza redatta aperta |
| B-REL-004 | Play App Signing e upload-key custody attivi | Release record senza segreti | RO/SO | Aperto |
| B-REL-005 | Import deterministico completo e Gemini rimosso | Exit gate M7 tracker 12 + bundle inspection | WO/SO/QO | Aperto |
| B-REL-006 | Account deletion completa in-app e via web | Test end-to-end + URL pubblica | WO/PrO/QO | Aperto |
| B-REL-007 | Legal/privacy baseline approvata | Legal register, data inventory, lawful basis, DPIA | PrO | Aperto |
| B-REL-008 | Data Safety whole-app approvata | Mapping build-to-declaration datato | PrO/RO | Aperto |
| B-REL-009 | Security/dependency gate chiuso | Audit verde o risk acceptance datata | SO | Aperto |
| B-REL-010 | Feature tracker 10/11/12 ai rispettivi release gate | Link alle acceptance evidence | QO | Aperto |
| B-REL-011 | QA fisica stock/OEM completa | Android production acceptance record | QO | Aperto |
| B-REL-012 | Landing, privacy, deletion e support pubblici | URL HTTPS verificate senza login | CO/PrO/SuO | Aperto |
| B-REL-013 | Store listing e App content completi | Export/screenshot Play Console | RO/CO | Aperto |
| B-REL-014 | Reviewer access verificato | Account/instructions testate da clean device | RO/QO | Aperto |
| B-REL-015 | Recovery/containment rehearsal riuscito | Runbook eseguito e firmato | RO/QO | Aperto |

## Percorso Critico

```text
P0 decisioni e owner
  |
  +--> P1 import locale + deletion + access model
  |      |
  |      +--> P2 config production e supply chain
  |             |
  +--> P4 privacy/compliance ----------------+
  |                                           |
  +--> P5 landing/store ----------------------+--> P6 release candidate fisico
                                                  |
                                                  v
                                             P7 internal
                                                  |
                                                  v
                                             P8 closed beta
                                                  |
                                                  v
                                             P9 rollout production
                                                  |
                                                  v
                                             P10 stabilizzazione
```

P3 feature acceptance viaggia in parallelo, ma deve chiudere prima di P6.

## P0. Decisioni, Owner E Account Play

Goal: rendere esplicite identita, responsabilita, pubblico e vincoli prima di
produrre il release candidate.

Dipendenze: nessuna.

### Checklist

- [x] `[P0][PO]` Chiudere D-REL-004 e D-REL-008: Italia iniziale,
  inglese, audience 18+, supporto entro una settimana e rischio single-person
  accettato solo per internal; backup obbligatorio pre-beta.
- [x] `[P0][PO]` Assegnare PO, AO, WO, QO, SO, PrO, RO, CO e SuO nominativi a Daniele Moltisanti; sostituti non assegnati e rischio continuita aperto.
- [x] `[P0][RO]` Registrare tipo, owner e stato creato dell'account Play,
  confermati dal proprietario; allegare evidenza redatta al release record C5/C8.
- [x] `[P0][RO]` Confermare verifica identita, email, telefono, payment profile e
  device verification applicabile; evidenza redatta resta richiesta in C5/C8.
- [x] `[P0][RO]` Confermare lo stato Android developer verification e la
  registrazione di `com.staituned.aura`; il requisito Play entra in vigore il
  2026-09-30 e non va confuso con la sola creazione dell'app in Console;
  evidenza redatta resta richiesta in C5/C8.
- [ ] `[P0][RO]` Verificare se l'account personale richiede closed test con 12
  tester opt-in per 14 giorni prima dell'accesso production.
- [x] `[P0][RO]` Confermare disponibilita e registrazione di
  `com.staituned.aura`; acquisire evidenza Console prima della promozione.
- [x] `[P0][PO]` Confermare nome pubblico developer Daniele Moltisanti e dominio
  `aura.staituned.com`; nome finale app e coerenza con privacy policy restano da
  verificare prima del listing.
- [x] `[P0][RO]` Confermare controllo del dominio; accesso di recovery resta da
  registrare nel release record privato per
  `staituned.com`.
- [x] `[P0][PO]` Congelare Italia come paese iniziale, audience 18+, inglese e
  pricing gratuito; espansione europea soggetta a decisione successiva.
- [x] `[P0][PO]` Congelare lo scope: internal/closed beta allowlisted con
  detection beta-only dopo i gate; prima produzione core-only senza listener.
- [x] `[P0][SuO]` Usare `support@staituned.com`, gestita da Daniele Moltisanti,
  con risposta entro una settimana; rischio single-person accettato per
  Internal Testing e backup owner obbligatorio prima della closed beta.
- [ ] `[P0][RO]` Aprire un release record con versione prevista, owner, scope,
  branch/commit, target date interna e link alle evidenze.

### Exit Gate

- nessuna decisione della tabella e `Aperta`;
- ogni ruolo richiesto ha un owner e un sostituto;
- account, package, dominio e requisiti di testing Play sono verificati;
- beta e produzione hanno scope distinti e approvati.

## P1. Blocker Di Prodotto, Dati E Sicurezza

Goal: rimuovere dalla build production i comportamenti incompatibili con una
pubblicazione sicura e rendere completi accesso, cancellazione ed export.

Dipendenze: P0 per access model e scope pubblico.

### P1A. Import Deterministico E Rimozione Gemini

- [ ] `[P0][WO]` Completare M1-M7 del
  [`12-deterministic-transaction-import-progress-plan.md`](./12-deterministic-transaction-import-progress-plan.md).
- [x] `[P0][WO]` Rimuovere `@google/genai` dal runtime production e dal bundle.
- [x] `[P0][WO]` Rimuovere `VITE_GEMINI_API_KEY` da build, CI, docs operative e
  superfici admin.
- [x] `[P0][WO]` Rimuovere `geminiConfig` e `geminiUsage` dal percorso
  applicativo. Retention/deletion dei record Firestore storici resta una task
  separata C6 e non autorizza cancellazioni remote implicite.
- [x] `[P0][SO]` Aggiungere una verifica che fallisce se l'AAB contiene il client
  Gemini, endpoint Gemini o marker di chiave AI.
- [x] `[P0][QO]` Provare automaticamente che CSV/XLSX e `.aura` non eseguano
  richieste Gemini.
- [ ] `[P0][QO]` Verificare import locale su PWA e WebView Android con file
  validi, invalidi, grandi e malevoli; automazione, 20.000 righe e WebView sono
  verdi, mentre picker Android e screen reader manuale restano aperti.
- [ ] `[P1][PrO]` Aggiornare data inventory, privacy e Data Safety rimuovendo il
  flusso AI soltanto dopo l'effettiva rimozione production.

### P1B. Account E Data Deletion

- [x] `[P0][PrO]` Definire cosa costituisce l'account Aura e quali dati sono
  associati a Firebase UID/email.
- [x] `[P0][WO]` Implementare `Delete Aura account` separato da `Delete local
  data`.
- [x] `[P0][WO]` Richiedere reautenticazione recente prima della cancellazione
  Firebase Auth.
- [ ] `[P0][WO]` Eliminare o rendere anonimi, secondo decisione approvata:
  backup Firestore, dati di usage legacy, allowlist/hash email applicabile e
  configurazioni user-scoped.
- [x] `[P0][AO]` Collegare database, preferenze, tombstone, journal e chiavi
  Android native applicabili.
- [x] `[P0][WO]` Eliminare dati locali e namespace IndexedDB/attachment gestiti;
  la cache applicativa contiene solo shell statica, non dati account.
- [x] `[P0][WO]` Rendere il workflow idempotente, retryable e fail-closed in
  caso di errore parziale.
- [x] `[P0][WO]` Non mostrare successo se Firebase Auth o una superficie remota
  prevista non e stata eliminata.
- [x] `[P0][PrO]` Documentare dati trattenuti/residui; durata allowlist e legacy
  resta una decisione C6 aperta.
- [x] `[P0][WO]` Esporre nell'app un link alla risorsa web di account deletion.
- [ ] `[P0][SuO]` Completare il percorso per utenti che non possono accedere o
  hanno gia disinstallato l'app: pagina pubblica, sign-in e support handoff sono
  implementati; intake manuale, verifica identita e retention ticket restano
  aperti.
- [ ] `[P0][QO]` Coprire cancellazione online, offline, retry, account switch,
  reauth fallita e doppio tap.
- [x] `[P0][QO]` Verificare nel contratto e nella UI che copie `.aura` gia esportate restino esplicitamente
  fuori dal controllo Aura.

### P1C. Accesso E Onboarding

- [ ] `[P0][PO]` Implementare la decisione D-REL-001 senza lasciare un listing
  pubblico che rifiuta utenti non allowlisted dopo il login.
- [ ] `[P0][WO]` Se pubblico: definire self-service onboarding e rimuovere il
  vincolo allowlist dal percorso ordinario.
- [ ] `[P0][WO]` Se invite-only: spiegare l'accesso prima del Google Sign-In e
  limitare la distribuzione al track appropriato.
- [ ] `[P0][RO]` Creare un account reviewer non privilegiato con dati sintetici
  e accesso stabile.
- [ ] `[P0][QO]` Verificare first run, login, logout, account switch, session
  expiry, offline e access denied.
- [ ] `[P1][WO]` Correggere le promesse assolute come `Your data stays on this
  device` affinche descrivano auth e backup opzionale reali.

### P1D. Manifest E Superfici Production

- [ ] `[P0][AO]` Spostare `com.staituned.aura.syntheticnotifications` in un
  manifest/source set debug/androidTest; non deve apparire nel manifest
  production.
- [ ] `[P0][AO]` Verificare che solo le package query delle sorgenti realmente
  supportate siano presenti.
- [ ] `[P0][AO]` Verificare exported components, intent filter, FileProvider e
  URI grant nel manifest release merged.
- [ ] `[P0][SO]` Verificare assenza di raw notification, token, UID, email,
  importi e merchant nei log JavaScript e nativi release.
- [ ] `[P1][AO]` Rendere il payment listener assente dalla build se D-REL-002
  sceglie una prima produzione core-only.

### Exit Gate

- Gemini e la sorgente sintetica non sono presenti nell'AAB production;
- cancellazione account e dati e completa, provata e accessibile anche via web;
- onboarding e distribuzione sono coerenti;
- nessuna copy privacy/store contraddice il comportamento della build.

## P2. Configurazione Production, Signing E Supply Chain

Goal: produrre artifact ripetibili, attribuibili e recuperabili senza segreti in
repository.

Dipendenze: P0; P1 deve chiudere prima del release candidate.

### Checklist

- [x] `[AO]` Package release `com.staituned.aura` e debug suffix `.debug` separati.
- [x] `[AO]` `compileSdk` e `targetSdk` 36 configurati.
- [x] `[AO]` Build release fail-closed senza upload-key esterna.
- [x] `[AO]` Firebase/OAuth debug e production separati nel verificatore.
- [x] `[AO]` Asset WebView production locali e senza `server.url` remoto.
- [x] `[AO]` AAB release firmato prodotto e firma verificata localmente.
- [ ] `[P0][RO]` Registrare l'app in Play Console e accettare Play App Signing.
- [ ] `[P0][RO]` Salvare separatamente upload key, password, alias e procedura di
  recovery; nessun segreto in repository, CI log o ticket.
- [ ] `[P0][RO]` Registrare fingerprint del certificato Play App Signing in
  Firebase/Google OAuth, distinta dalla upload key.
- [ ] `[P0][QO]` Verificare Google Sign-In da installazione Play, non soltanto da
  APK locale.
- [ ] `[P0][AO]` Rendere `versionCode` monotono e documentare versioning/release
  naming.
- [ ] `[P0][SO]` Eseguire `npm audit --omit=dev` e audit Gradle/dependency
  aggiornati sul commit release.
- [ ] `[P0][SO]` Correggere le vulnerabilita sfruttabili; per ogni residuo creare
  risk acceptance con package, advisory, reachability, owner, scadenza e fix
  plan.
- [ ] `[P0][SO]` Verificare lockfile, provenance delle dipendenze e assenza di
  package non necessari nel runtime.
- [ ] `[P0][SO]` Valutare Firebase App Check/Play Integrity e protezione
  anti-abuso per Firestore; documentare rollout e fallback PWA prima di
  enforcement.
- [ ] `[P0][SO]` Riesaminare Firestore rules per il modello pubblico/allowlist
  approvato e aggiungere emulator regression tests.
- [ ] `[P1][AO]` Verificare R8 mapping, resource shrinking e assenza di segreti
  o config debug nell'App Bundle Explorer.
- [ ] `[P1][RO]` Archiviare AAB, mapping, commit SHA, checksums, release notes e
  output dei verifier nel release record.
- [ ] `[P1][RO]` Provare la build da checkout pulito con istruzioni ripetibili.

### Exit Gate

- Play App Signing e OAuth da build Play funzionano;
- artifact e mapping sono riproducibili e rintracciabili;
- nessun segreto o marker debug entra nell'AAB;
- audit e regole backend sono approvati dal security owner.

## P3. Feature Acceptance Whole-App

Goal: provare che la build Android mantiene il valore del prodotto condiviso e
che tutte le feature incluse sono davvero release-ready.

Dipendenze: P1-P2; tracker 10-12.

### Core Journeys

- [ ] `[P0][QO]` First install da Play, login e scelta iniziale blank/demo/restore.
- [ ] `[P0][QO]` Creare, modificare, eliminare e cercare transazioni.
- [ ] `[P0][QO]` Budget, recurring, planning, report, categories e year review.
- [ ] `[P0][QO]` Allegare, aprire, sostituire ed eliminare receipt supportate.
- [ ] `[P0][QO]` Backup cloud opt-in, rotazione, restore specifico e deletion.
- [ ] `[P0][QO]` `.aura` export, wipe, import, replace, reload e recovery.
- [ ] `[P0][QO]` CSV/XLSX import deterministico e CSV export.
- [ ] `[P0][QO]` Logout, cambio account, reset locale e account deletion.
- [ ] `[P0][QO]` Deep link, cold start, resume, back stack e process recreation.

### Payment Detection

- [ ] `[P0][QO]` Chiudere gli exit gate M9 e M10 applicabili del tracker 11.
- [ ] `[P0][PrO]` Autorizzare esplicitamente l'uso di notifiche finanziarie reali.
- [ ] `[P0][QO]` Verificare Intesa Sanpaolo e Google Wallet soltanto con template
  approvati e dati sintetici/redatti.
- [ ] `[P0][QO]` Provare package-before-extras, app non selezionate, OTP,
  rifiuti, annullamenti, saldo, promozioni e valuta non supportata.
- [ ] `[P0][QO]` Provare dedupe, acceptance idempotente, recovery e assenza di
  doppie transazioni.
- [ ] `[P0][QO]` Provare pausa, deselection, revoca OS, delete pending e purge.
- [ ] `[P0][QO]` Provare notifica privata/pubblica su lock screen.
- [ ] `[P0][QO]` Misurare i gate pilot: precisione exact almeno 95%, falsi
  positivi exact massimo 2%, duplicati 0, leakage 0.

### UX, Accessibilita E Localizzazione

- [ ] `[P0][QO]` 320/360/390/430 px in portrait e landscape senza overflow.
- [ ] `[P0][QO]` Light/dark, font scaling, reduced motion e contrasto.
- [ ] `[P0][QO]` TalkBack, switch/keyboard, focus order, dialog e bottom sheet.
- [ ] `[P0][QO]` Error, loading, empty, offline, permission denied e success
  states per i flussi critici.
- [ ] `[P0][CO]` Verificare coerenza tra lingua UI, store listing, screenshot,
  privacy, supporto e target market.
- [ ] `[P1][QO]` Testare tablet/foldable e multi-window secondo lo scope
  dispositivi approvato.

### Performance E Affidabilita

- [ ] `[P0][QO]` Cold/warm start, resume e navigazione sui device baseline.
- [ ] `[P0][QO]` Import e archive sul device meno capace supportato con limiti
  memory approvati.
- [ ] `[P0][QO]` Process kill, reboot, low storage, quota e database failure.
- [ ] `[P0][QO]` Android background/battery restriction su stock e OEM.
- [ ] `[P1][QO]` Verificare dimensione download/install nell'App Bundle Explorer.

### Exit Gate

- tracker 10, 11 e 12 hanno chiuso i gate inclusi nello scope release;
- ogni journey critico passa da installazione Play su device fisico;
- accessibility e performance hanno evidenza manuale e automatica;
- non esistono P0/P1 feature bug aperti.

## P4. Privacy, GDPR, AI Governance E Play Compliance

Goal: allineare comportamento, artefatti legali/operativi e dichiarazioni Play
della build completa.

Dipendenze: scope P0 e comportamento P1/P3 sufficientemente congelati.

### Baseline Policy Google Play - Verifica 2026-08-03

Questa baseline documenta policy di piattaforma, non sostituisce il registro
legale GDPR mancante. Va ricontrollata alla data di ogni submission.

- [Target API level](https://developer.android.com/google/play/requirements/target-sdk):
  dal 2026-08-31 nuove app e update devono targettizzare Android 16/API 36; la
  configurazione Aura corrente e gia API 36.
- [Testing per nuovi account personali](https://support.google.com/googleplay/android-developer/answer/14151465):
  per account personali creati dopo il 2023-11-13 sono richiesti almeno 12
  tester opt-in continuativi per 14 giorni nel closed test prima della domanda
  di accesso production.
- [Android developer verification e package registration](https://support.google.com/googleplay/android-developer/answer/16984799):
  identita e package Play devono risultare registrati; il requisito entra in
  vigore il 2026-09-30.
- [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
  e [prominent disclosure](https://support.google.com/googleplay/android-developer/answer/11150561):
  privacy policy pubblica e in-app, disclosure prima dell'accesso inatteso a
  dati sensibili e consenso tramite azione affermativa distinta.
- [Account deletion](https://support.google.com/googleplay/android-developer/answer/13327111):
  se l'app consente la creazione dell'account servono sia un percorso in-app
  sia una risorsa web funzionante per richiedere account e data deletion.
- [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469):
  dichiarazione whole-app e SDK obbligatoria per closed, open e production;
  un'app esclusivamente in Internal Testing e esente dal form, non dagli altri
  gate privacy/security di questo piano.
- [Financial features declaration](https://support.google.com/googleplay/android-developer/answer/13849271):
  il form va completato anche quando l'app dichiara di non offrire feature
  finanziarie; per Aura va selezionata la classificazione coerente con il
  personal financial management effettivo.
- [Preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151):
  dimensioni, formati e metadata vanno validati sulla Console corrente.
- [Staged rollout](https://support.google.com/googleplay/android-developer/answer/6346149):
  le percentuali sono disponibili per gli update, non per la prima release
  production.

### Governance Privacy/GDPR

- [ ] `[P0][PrO]` Creare `docs/legal/legal-source-register.md` e applicare la
  gerarchia legale richiesta da `AGENTS.md`.
- [ ] `[P0][PrO]` Identificare titolare, eventuali responsabili/subprocessori e
  contatti privacy.
- [ ] `[P0][PrO]` Creare data inventory/RoPA whole-app per auth, allowlist,
  backup, supporto e payment detection.
- [ ] `[P0][PrO]` Registrare finalita e base giuridica per ogni attivita.
- [ ] `[P0][PrO]` Approvare retention, cancellazione, export, accesso,
  rettifica, limitazione/opposizione ed end-of-use.
- [ ] `[P0][PrO]` Mappare Google/Firebase e ogni altro vendor, contratto,
  subprocessor e trasferimento applicabile.
- [ ] `[P0][PrO]` Completare screening DPIA per monitoraggio delle notifiche
  finanziarie e registrare l'esito.
- [ ] `[P0][PrO]` Preparare una privacy policy pubblica, specifica per Aura,
  coerente con la build e accessibile dall'app.
- [ ] `[P0][PrO]` Preparare processo e template di risposta per richieste diritti
  e incidenti privacy.
- [ ] `[P0][PrO]` Dichiarare chiaramente che copie `.aura` esportate sono sotto
  controllo dell'utente e non cancellabili da Aura.

### Data Safety Whole-App - Inventario Di Lavoro

Questa tabella e input engineering, non la risposta finale al form Play.

| Flusso | Dati | Off-device | Obbligatorio/opzionale | Gate |
|---|---|---|---|---|
| Google/Firebase Auth | UID, email, nome, foto/token transienti | Si | Obbligatorio nel modello attuale | Mappare collection, purpose, retention e deletion |
| Access control | hash/masked email e allowlist, se mantenuta | Si | Dipende da D-REL-001 | Allineare rules e modello pubblico |
| Cloud backup | payload finanziario cifrato e metadata versione | Si | Opt-in | Verificare dichiarazione, cifratura e deletion |
| Import deterministico | file e transazioni | No | Opzionale | Provare assenza rete e rimuovere Gemini |
| Payment detection | package selezionati e candidati | No | Opt-in | Provare rete/log/backup zero |
| Portable archive | dati e attachment esportati | No, salvo azione utente esterna | Opzionale | Informare sul controllo della copia esportata |
| Supporto | email/form e contenuto scelto dall'utente | Si | Opzionale | Minimizzazione, retention e access control |

- [ ] `[P0][PrO]` Compilare il form Data Safety dalla build finale e dagli SDK
  effettivamente inclusi.
- [ ] `[P0][RO]` Verificare che privacy policy, Data Safety, permission list e
  store copy non si contraddicano.
- [ ] `[P0][QO]` Allegare network capture e bundle inspection al mapping.
- [ ] `[P0][PrO]` Verificare account deletion e data deletion answers.

### Payment Detection E User Data Policy

- [ ] `[P0][PrO]` Approvare prominent disclosure immediatamente prima delle
  impostazioni notification access.
- [ ] `[P0][QO]` Provare azioni distinte Agree/Decline e feature off dopo
  decline/back/dismiss.
- [ ] `[P0][CO]` Spiegare nel listing lo scopo senza affermare che Android
  concede accesso soltanto alle app selezionate.
- [ ] `[P0][RO]` Preparare video review con dati sintetici che mostra disclosure,
  grant, app selection, candidate review, pausa, delete e revoke.
- [ ] `[P0][RO]` Ripetere la policy review User Data/Spyware/Permissions alla
  data di submission.

### AI Governance

- [ ] `[P0][WO]` Chiudere la rimozione Gemini prima del release candidate.
- [ ] `[P0][PrO]` Registrare in `docs/10-ai-governance/` che la release
  production non usa AI per import, detection, reporting o financial advice.
- [ ] `[P0][SO]` Provare che non esistano client, endpoint, model config, usage
  logger o API key AI nell'AAB.
- [ ] `[P1][PO]` Richiedere nuova discovery e governance prima di una futura
  reintroduzione AI.

### Play App Content

- [ ] `[P0][RO]` Privacy policy URL.
- [ ] `[P0][RO]` Data Safety e Data deletion.
- [ ] `[P0][RO]` Ads declaration accurata.
- [ ] `[P0][RO]` App access/reviewer credentials e istruzioni.
- [ ] `[P0][RO]` Target audience and content.
- [ ] `[P0][RO]` Content rating questionnaire.
- [ ] `[P0][RO]` Financial features declaration, includendo la corretta
  classificazione del personal financial management.
- [ ] `[P0][RO]` Permission declarations/video se Play le richiede dopo l'upload
  dell'AAB.
- [ ] `[P0][RO]` Countries/regions e trader/developer information applicabili.
- [ ] `[P0][RO]` Export laws e dichiarazioni Play richieste.

### Exit Gate

- privacy owner e release owner firmano gli artefatti whole-app;
- DPIA e legal baseline non sono pending;
- Data Safety e App content descrivono la build effettiva;
- nessuna claim legale, privacy o local-first e fuorviante.

## P5. Landing Page, Supporto E Store Listing

Goal: fornire agli utenti e a Google una presenza pubblica accurata, accessibile
e operabile anche senza login o app installata.

Dipendenze: D-REL-004/005/007/008 e P4 per i contenuti legali.

### Information Architecture Minima

- [ ] `[P0][WO/CO]` `/` - landing con valore, audience, feature reali,
  privacy posture, screenshot e link Play quando pubblico.
- [ ] `[P0][PrO/WO]` `/privacy` - informativa completa, HTML pubblica,
  non geoblocked e senza login.
- [ ] `[P0][PrO/WO]` `/account-deletion` - richiesta/cancellazione account e
  dati, scope, autenticazione e tempi operativi.
- [ ] `[P0][SuO/WO]` `/support` - FAQ, contatto, app supportate, permessi,
  backup/restore, troubleshooting e incident escalation.
- [ ] `[P0][PO/PrO/WO]` `/terms` - termini, responsabilita dell'utente, limiti,
  disponibilita e assenza di consulenza finanziaria.
- [ ] `[P1][SO/WO]` `/security` - sintesi controlli e canale responsabile per
  security report, senza esporre dettagli sfruttabili.
- [ ] `[P1][WO]` Pubblicare `security.txt` se viene definito un canale security.

### Requisiti Landing

- [ ] `[P0][WO]` HTTPS, dominio controllato, no auth wall, no PDF per privacy.
- [ ] `[P0][CO]` Nome app/developer identico al listing Play.
- [ ] `[P0][CO]` Copy coerente con Firebase, backup opzionale, import locale e
  notification access.
- [ ] `[P0][CO]` Nessuna promessa `all data stays on device` senza eccezioni.
- [ ] `[P0][CO]` Dati e screenshot esclusivamente sintetici.
- [ ] `[P0][QO]` Mobile, desktop, keyboard, screen reader, light/dark e link
  checker.
- [ ] `[P0][SuO]` Email support verificata e monitorata.
- [ ] `[P1][WO]` Analytics assenti per default o oggetto di nuova privacy review
  prima dell'aggiunta.
- [ ] `[P1][WO]` Backup/deploy/rollback del sito documentati.

### Store Listing

- [ ] `[P0][CO]` App name entro il limite Play e coerente con launcher/login.
- [ ] `[P0][CO]` Short description accurata e senza claim promozionali vietati.
- [ ] `[P0][CO]` Full description con core budgeting, local-first qualificato,
  backup opt-in, import locale e payment detection opzionale se incluso.
- [ ] `[P0][CO]` App icon 512x512 verificata; il repository dispone gia di una
  base 512x512, ma va validata nel preview Play.
- [ ] `[P0][CO]` Feature graphic 1024x500.
- [ ] `[P0][CO]` Almeno 2 screenshot phone validi; target qualitativo 4 o piu a
  1080x1920.
- [ ] `[P0][CO]` Alt text per ogni asset.
- [ ] `[P0][CO]` Screenshot di Home, Add, Reports, privacy/backup e detection
  review se inclusa, tutti con dati sintetici.
- [ ] `[P0][RO]` Support email obbligatoria, website, privacy URL e deletion URL.
- [ ] `[P0][CO]` Listing localizzati soltanto nelle lingue realmente supportate.
- [ ] `[P1][CO]` Preview video marketing opzionale, distinto dal video policy.
- [ ] `[P0][RO]` Release notes coerenti con lo scope del track.

### Exit Gate

- URL pubblici sono raggiungibili da sessione anonima e validati;
- supporto risponde e dispone di escalation;
- listing e asset descrivono esclusivamente comportamento disponibile;
- privacy/deletion URL sono accettabili nel Play form.

## P6. Release Candidate E QA Fisica

Goal: congelare e verificare l'esatto artifact destinato al Play track.

Dipendenze: P1-P5 completati.

### Build Freeze

- [ ] `[P0][RO]` Congelare commit SHA, `versionCode`, `versionName`, scope e
  configurazione.
- [ ] `[P0][WO]` `npm run lint`.
- [ ] `[P0][WO]` `npm run test`.
- [ ] `[P0][WO]` `npm run build`.
- [ ] `[P0][QO]` `npm run test:e2e` su browser/PWA applicabili.
- [ ] `[P0][AO]` `npm run android:test`.
- [ ] `[P0][AO]` `npm run android:test:instrumentation`.
- [ ] `[P0][AO]` `npm run android:lint`.
- [ ] `[P0][AO]` `npm run android:verify:release-readiness`.
- [ ] `[P0][AO]` `npm run android:bundle:release`.
- [ ] `[P0][SO]` Verificare firma, manifest merged, bundle content, mapping e
  assenza secret/debug/Gemini.
- [ ] `[P0][SO]` Rieseguire audit dipendenze sul lockfile congelato.

### Device Matrix Minima

| Scenario | Stock | OEM aggressivo | Device minSdk scelto | Stato |
|---|---|---|---|---|
| Install/update/uninstall da Play | Required | Required | Required se diverso | Open |
| Login/logout/account switch | Required | Required | Required | Open |
| Cold/warm start, kill, reboot | Required | Required | Required | Open |
| Notification grant/revoke/regrant | Required | Required | Required | Open |
| Lock screen private/public | Required | Required | Required | Open |
| Battery/background restrictions | Required | Required | Required | Open |
| Backup/D2D attempt | Required | Required | Required | Open |
| Network capture | Required | Required | Required | Open |
| Release logcat inspection | Required | Required | Required | Open |
| Archive/import/backup restore | Required | Required | Required | Open |
| Account deletion | Required | Required | Required | Open |
| TalkBack/keyboard/font scaling | Required | Required | Required | Open |
| Width/theme/reduced motion | Required | Required | Required | Open |

- [ ] `[P0][QO]` Eseguire Google Play Pre-launch report e triagiare ogni finding.
- [ ] `[P0][QO]` Verificare App Bundle Explorer, device exclusion e download
  size.
- [ ] `[P0][QO]` Allegare screenshot/video/log redatti, mai dati finanziari
  reali.
- [ ] `[P0][RO]` Eseguire il recovery rehearsal distinguendo: sostituzione
  dell'artifact prima del lancio; unpublish/hotfix per la prima production;
  halt/rollback per update successivi; disable/pause detection, revoke access e
  purge pending senza rimuovere transazioni confermate.
- [ ] `[P0][QO]` Creare
  `docs/07-qa/android-production-release-acceptance.md` con esito GO/NO-GO.

### Exit Gate

- tutti i comandi e la matrice fisica passano sull'esatto AAB;
- Pre-launch report non contiene blocker non risolti;
- contenimento, hotfix, rollback applicabile e installazione Play sono provati;
- QA, security, privacy e release owner firmano il release candidate.

## P7. Play Internal Testing

Goal: verificare l'infrastruttura Play e il comportamento production-like con
un gruppo controllato.

Dipendenze: P6.

### Checklist

- [ ] `[P0][RO]` Caricare l'AAB nel track Internal Testing.
- [ ] `[P0][RO]` Verificare App Signing certificate e aggiornare OAuth se
  necessario prima di distribuire.
- [ ] `[P0][RO]` Limitare tester e account ai nominativi approvati.
- [ ] `[P0][QO]` Installare esclusivamente dal link Play su device puliti.
- [ ] `[P0][QO]` Verificare login, first run, backup, import/archive e update
  sopra una versione precedente.
- [ ] `[P0][QO]` Mantenere payment detection su sorgente sintetica finche P4 non
  autorizza dati reali.
- [ ] `[P0][QO]` Verificare Play Vitals, crash/ANR, policy alerts e pre-launch
  report dopo upload.
- [ ] `[P0][SuO]` Eseguire support intake con un ticket sintetico e verificare
  redazione/escalation.
- [ ] `[P0][RO]` Eseguire replace/deactivate dell'artifact interno come prova
  operativa; l'halt di una release fully rolled-out non e disponibile sul track
  Internal Testing.
- [ ] `[P0][RO]` Registrare feedback, bug, decisioni e nuovo artifact se cambia
  il commit.

### Exit Gate

- installazione, auth e update Play funzionano;
- zero P0/P1 bug, crash blocker, leakage o commistione account;
- il supporto e il recovery applicabile sono operativi;
- esiste approvazione esplicita ad aprire il closed test.

## P8. Closed Beta

Goal: validare utilita, precisione e supportabilita con utenti reali autorizzati
senza ampliare prematuramente lo scope.

Dipendenze: P7 e approvazioni privacy/security real-user.

### Checklist

- [ ] `[P0][PO]` Definire numero, criteri e paesi dei partecipanti.
- [ ] `[P0][RO]` Se applicabile, mantenere almeno 12 tester opt-in continuativi
  per 14 giorni e preparare la richiesta production access.
- [ ] `[P0][PrO]` Fornire informativa beta e canale per diritti/recesso.
- [ ] `[P0][QO]` Feature detection off finche il singolo utente non completa
  disclosure, grant e app selection.
- [ ] `[P0][PO]` Limitare il pilot a 1-2 sorgenti e scope EUR card-payment
  approvato.
- [ ] `[P0][QO]` Raccogliere precisione, falsi positivi/negativi, duplicati e
  modifiche con record manuale redatto.
- [ ] `[P0][SuO]` Vietare allegati automatici e raw notification nel feedback.
- [ ] `[P0][QO]` Applicare stop condition: leakage, cross-account, doppia
  transazione, falso positivo sensibile o crash blocker.
- [ ] `[P0][RO]` Monitorare Play Vitals e policy alerts senza candidate telemetry.
- [ ] `[P0][PO]` Verificare valore percepito, onboarding, support burden e reach
  API prima del GO.
- [ ] `[P0][SO]` Riesaminare nuovi esempi/regole soltanto tramite processo
  fixture redatto e approvato.
- [ ] `[P0][RO]` Preparare risposte alla production-access review Play con
  evidenza reale del test.

### Exit Gate

- eventuale requisito 12 tester/14 giorni e soddisfatto;
- precisione e stop condition rispettano i gate del tracker 11;
- privacy/security/support non hanno incidenti aperti;
- feedback dimostra che lo scope e comprensibile e utile;
- PO, PrO, SO, QO e RO firmano il GO production.

## P9. Produzione Controllata

Goal: rendere Aura disponibile al pubblico approvato con rischio controllato e
recovery eseguibile. La prima release production viene pubblicata al 100% nei
paesi selezionati da D-REL-004; il rollout percentuale e disponibile soltanto
per gli update successivi.

Dipendenze: P8 e tutti i gate B-REL chiusi.

### Go/No-Go Finale

- [ ] Tutte le decisioni D-REL sono approvate.
- [ ] Tutti i gate B-REL sono chiusi.
- [ ] Non esistono P0/P1 bug o policy alert aperti.
- [ ] Privacy, Data Safety, deletion e store listing corrispondono all'AAB.
- [ ] Reviewer access e credenziali sono validi.
- [ ] AAB, mapping, checksum, commit e release notes sono archiviati.
- [ ] Recovery/containment rehearsal applicabile e stato eseguito sull'RC.
- [ ] Supporto e incident escalation sono attivi.
- [ ] Firma GO: PO, QO, SO, PrO e RO con data.

### Rollout

- [ ] `[P0][RO]` Inviare la release per review senza managed publishing
  automatico non compreso dal team.
- [ ] `[P0][RO]` Per la prima release, confermare il 100% nei soli
  paesi/regioni approvati; usare Internal/Closed Testing per limitare il
  pubblico prima del GO, non una percentuale production inesistente.
- [ ] `[P0][RO]` Per gli update successivi, approvare e documentare gli step
  percentuali; default proposto: `5% -> 10% -> 25% -> 50% -> 100%`.
- [ ] `[P0][RO]` Definire per il primo lancio e per ogni step futuro una finestra
  minima di osservazione e soglie crash/ANR/support/policy.
- [ ] `[P0][RO]` Usare managed publishing se serve separare approvazione Play e
  momento del go-live.
- [ ] `[P0][CO]` Pubblicare release notes e landing Play link soltanto quando la
  release e realmente disponibile.
- [ ] `[P0][QO]` Eseguire smoke test post-publish da account e device puliti.
- [ ] `[P0][RO]` Monitorare Play Vitals, install failure, auth, backup, support e
  policy inbox.
- [ ] `[P0][RO]` Alla prima stop condition usare il contenimento applicabile:
  non pubblicare, unpublish/limitare availability e spedire hotfix sulla prima
  release; halt del rollout sugli update successivi.

### Stop Conditions

- crash/ANR blocker o regressione di startup/login;
- dati finanziari o identificatori nei log/network/support;
- accesso a package non selezionati o comportamento spyware-like;
- cross-account data visibility;
- doppie transazioni o perdita di transazioni confermate;
- account deletion non completa;
- backup/archive/import corrotto o non recuperabile;
- policy rejection/alert non compreso;
- aumento supporto incompatibile con la capacita operativa approvata.

### Exit Gate

- prima release disponibile al 100% nei paesi approvati senza stop condition;
- smoke, Vitals, supporto e policy monitoring stabili;
- hotfix/containment sono operativi; dagli update successivi resta disponibile
  il rollback verso una versione precedente idonea.

## P10. Stabilizzazione E Chiusura

Goal: trasformare il lancio in una release operabile e documentata, senza
lasciare debito invisibile.

Dipendenze: avvio P9.

### Checklist

- [ ] `[RO]` Review operativa a 24 ore, 72 ore, 7 giorni e 30 giorni.
- [ ] `[QO]` Riconciliare crash/ANR, recensioni, ticket e regressioni.
- [ ] `[SuO]` Aggiornare FAQ e macro di supporto da problemi reali, senza
  incorporare dati utente.
- [ ] `[SO]` Chiudere o rinnovare ogni risk acceptance con scadenza.
- [ ] `[PrO]` Verificare prime richieste privacy/deletion e aggiornare runbook.
- [ ] `[PO]` Rivalutare minSdk/reach, lingue, mercati e sorgenti payment.
- [ ] `[RO]` Aggiornare `CHANGELOG.md`, project brief, strategy, delivery plan e
  tracker con la release effettiva.
- [ ] `[RO]` Registrare versioni supportate, end-of-support e canale hotfix.
- [ ] `[PO]` Aprire nuove iniziative soltanto dopo la stabilizzazione dei gate.

### Exit Gate

- nessun incidente o P0/P1 residuo senza owner/scadenza;
- documentazione descrive comportamento production reale;
- supporto, privacy e release operations sono ripetibili;
- il programma puo essere marcato `Completato`.

## Testing Matrix Riassuntiva

| Livello | Scope | Comando/evidenza | Gate |
|---|---|---|---|
| TypeScript | Contratti React/domain | `npm run lint` | Ogni RC |
| Unit/component | Domain, UI, import, auth | `npm run test` | Ogni RC |
| Web build | Asset production | `npm run build` | Ogni RC |
| Browser/PWA E2E | Journey condivisi | `npm run test:e2e` | Prima RC |
| Android unit | Kotlin/domain | `npm run android:test` | Ogni RC |
| Android instrumentation | Room, Keystore, listener, bridge | `npm run android:test:instrumentation` | Prima RC e cambi nativi |
| Android lint | Manifest/API/security | `npm run android:lint` | Ogni RC |
| Release verifier | Config, Firebase, asset | `npm run android:verify:release-readiness` | Ogni RC |
| Release bundle | Signed AAB | `npm run android:bundle:release` | Ogni Play upload |
| Dependency audit | Runtime/build supply chain | npm + Gradle audit/risk record | Ogni RC |
| Physical QA | Stock/OEM/minSdk | Acceptance record | Internal/beta/prod |
| Play QA | Pre-launch, Vitals, App Bundle Explorer | Play evidence | Ogni promoted artifact |
| Accessibility | TalkBack/keyboard/font/reduced motion | Manual + automated evidence | Prima prod |
| Privacy/security | Network/logcat/backup/delete | Redacted evidence | Prima real-user/prod |

## Osservabilita, Incidenti E FinOps

### Consentito

- Play Vitals per crash/ANR generici;
- error code e phase name non sensibili;
- conteggi e durata in test locali;
- feedback volontario redatto;
- metriche aggregate di install/update/reach fornite da Play.

### Vietato Senza Nuova Review

- raw notification, merchant, importo, transaction/candidate ID in analytics;
- Firebase UID, email o token in log client;
- allegati automatici da supporto;
- crash breadcrumb con dati finanziari;
- analytics/remote config aggiunti soltanto per il lancio.

### Cost Driver

- account e operations Google Play;
- device QA stock/OEM e matrice versioni;
- Firebase Auth/Firestore/App Check se adottato;
- manutenzione delle regole payment;
- supporto e risposta privacy/security;
- hosting della landing e dominio.

Gemini deve essere assente dalla produzione target. Un admin cost panel non e
richiesto per il go-live attuale, ma RO/PO devono registrare almeno budget,
alert Firebase/hosting e owner dei costi. L'introduzione futura di AI, analytics,
remote config o backend usage-based richiede una nuova review FinOps e la
valutazione di visibilita per feature/provider.

## C1 Evidence Index — 2026-08-04

Baseline canonica:
[`c1-baseline-2026-08-04.md`](../07-qa/c1-baseline-2026-08-04.md).

| ID | Owner | Commit/target | Esito | Gate residuo |
|---|---|---|---|---|
| EV-C1-001/002 | WO/SO | `8684652`, web + Android assets | 482/482, build e Gemini scan verdi | Nessuno per runtime Gemini |
| EV-C1-003/004 | QO/WO | `8684652`, Playwright | Full 47/48; rerun guided tour 2/2 | F-C1-001 resta aperto fino a stabilita full-suite |
| EV-C1-005/006 | AO | `8684652`, Gradle debug | Unit test e lint verdi | Warning Gradle/flatDir in C5 |
| EV-C1-007 | AO/QO | `8684652`, `aura_api_36` API 36 | 34/34 instrumentation verdi | Device fisici stock/OEM restano C4 |

### Backlog Non Bloccante Separato

Package npm `react-example`, `express` inutilizzato, ottimizzazione chunk e
migrazione category ID restano follow-up tecnici. Non sono P0 di release salvo
nuova evidenza di reachability, sicurezza o regressione critica.

## Artifact E Documenti Da Produrre

- [ ] `docs/specs/android-public-distribution.md`
- [ ] `docs/07-qa/android-production-release-acceptance.md`
- [ ] `docs/03-operations/android-production-release-runbook.md`
- [ ] `docs/04-privacy-gdpr/android-whole-app-data-safety-record.md`
- [ ] `docs/04-privacy-gdpr/android-account-deletion-record.md`
- [ ] `docs/10-ai-governance/no-ai-production-decision.md`
- [ ] privacy policy pubblica
- [ ] account deletion page pubblica
- [ ] support/FAQ pubblici
- [ ] terms pubblici
- [ ] Play Console release record con App content e listing evidence
- [ ] final AAB, R8 mapping, checksum, commit SHA e release notes
- [ ] device/network/logcat/backup/accessibility evidence redatta
- [ ] risk acceptance e follow-up con owner/scadenza

Un ADR e richiesto se cambia uno di questi elementi hard-to-reverse:

- modello pubblico/allowlist;
- supporto minimo Android;
- introduzione di backend/App Check enforcement con impatto PWA;
- presenza/assenza del listener nella prima produzione;
- monetizzazione o identita dell'account developer.

## Definition Of Ready

### Play Internal Testing

- P0 decisioni minime per track/account approvate;
- artifact firmato senza Gemini, secret o sorgente sintetica production;
- account deletion almeno tecnicamente completa e testata;
- reviewer/test account e Play App Signing funzionanti;
- automated suite e release verifier verdi;
- privacy/security owner autorizzano lo scope internal.

### Closed Beta Real-User

- internal acceptance chiusa;
- privacy policy, data inventory, lawful basis e DPIA approvati;
- physical matrix stock/OEM chiusa;
- supporto e deletion web operativi;
- disclosure, Data Safety e fixture process approvati;
- stop condition e recovery applicabile provati.

### Produzione

- tutti i B-REL chiusi;
- beta exit gate soddisfatto;
- store listing, App content e landing pubblici e coerenti;
- production access Play disponibile;
- GO firmato da PO, QO, SO, PrO e RO.

## Definition Of Done

Il programma e done soltanto quando:

- l'app e pubblicata al 100% nel mercato approvato;
- l'AAB production non contiene Gemini, secret, config debug o sorgenti test;
- onboarding, auth, deletion, backup, archive, import e payment scope incluso
  passano su Play-installed physical devices;
- notification access e off-by-default, disclosed, revocabile e locale;
- Data Safety, privacy, account deletion e store listing corrispondono alla
  build;
- Play Vitals, supporto e policy monitoring sono operativi;
- containment, rollback applicabile e hotfix sono provati;
- documentazione e changelog descrivono la realta production;
- ogni rischio residuo ha owner, scadenza e approvazione.

## Protocollo Di Aggiornamento

Aggiornare questo tracker quando:

- una decisione viene approvata o riaperta;
- cambia lo scope di beta/produzione;
- una task inizia, si blocca o termina;
- un artifact viene promosso tra track;
- emerge un finding Play, privacy, security, QA o supporto;
- cambia il rischio o la mitigazione;
- viene eseguito un GO/NO-GO.

Per ogni aggiornamento aggiungere una riga al progress log. Non marcare un
milestone `Completato` senza exit gate ed evidenze.

## Progress Log

| Data | Milestone | Evento | Evidenza/decisione |
|---|---|---|---|
| 2026-08-03 | P0 | Creato il programma di release Android production | Tracker 13 aggrega feature, compliance, landing, Play, QA e rollout |
| 2026-08-03 | P1 | Registrata la rimozione Gemini come dipendenza approvata | Tracker 12 e target architecture no-AI |
| 2026-08-03 | P2 | Baseline artifact verificata | AAB firmato presente; release readiness e firma locali passano |
| 2026-08-03 | P2 | Audit production aggiornato | 6 vulnerabilita npm: 3 high, 2 moderate, 1 low; remediation/risk acceptance aperta |
| 2026-08-04 | C1/P1 | Baseline e tracker riconciliati | 482/482, build, Gemini scan, Android unit/lint e 34/34 instrumentation verdi; full E2E 47/48 con F-C1-001 intermittente |
| 2026-08-04 | C2/P0 | Direzione release preliminare approvata | Internal -> closed beta allowlisted; detection beta-only; API 36; gratuita; account personale; `aura.staituned.com`; `support@staituned.com`; mercato e condizioni operative finalizzati nella voce successiva |
| 2026-08-04 | C2/P0 | C2 completata | Italia iniziale, inglese, 18+, Play/account/package confermati, supporto entro una settimana; rischio single-person accettato solo per internal |
