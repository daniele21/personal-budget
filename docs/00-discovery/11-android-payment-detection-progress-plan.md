# Aura Android Payment Detection Progress Plan

## Scopo

Questo documento è il tracker vivo per l'iniziativa **Aura Android con rilevamento opzionale dei pagamenti da notifiche**.

L'obiettivo è distribuire Aura anche come applicazione Android basata su Capacitor, mantenendo la PWA esistente, e ridurre l'attrito nell'inserimento delle spese attraverso candidati precompilati derivati localmente dalle notifiche di app bancarie o di pagamento selezionate dall'utente.

Il rilevamento:

- è disponibile soltanto nell'app Android;
- è disattivato per impostazione predefinita;
- usa un parser deterministico nativo, senza AI;
- non registra automaticamente transazioni;
- non invia il contenuto delle notifiche a Firebase, Gemini, analytics o altri servizi;
- richiede sempre conferma o modifica da parte dell'utente;
- mantiene la PWA come prodotto web pienamente supportato.

Aggiornare questo file quando:

- una task inizia o termina;
- una decisione viene approvata o modificata;
- emerge un blocco;
- cambia lo scope;
- viene prodotto un test, un documento o un'evidenza di release;
- un rischio cambia probabilità, impatto o mitigazione.

I documenti di prodotto e strategia devono essere allineati durante M0 prima dell'inizio dell'implementazione.

## Legenda degli stati

| Stato | Significato |
|---|---|
| `Non iniziato` | Nessun lavoro di implementazione è iniziato |
| `In corso` | Il milestone o la task è attivamente in lavorazione |
| `Bloccato` | Serve una decisione, un'approvazione o un cambiamento esterno |
| `Completato` | Codice, test, verifiche e documentazione richiesti sono completi |

Per le checklist:

- `[ ]` non completato;
- `[x]` completato.

Un milestone non può essere marcato `Completato` solo perché il codice è stato scritto. Devono essere soddisfatti anche exit criteria, test, privacy/security review e documentazione applicabile.

## Dashboard di avanzamento

Ultimo aggiornamento: 2026-07-26

| Milestone | Stato | Nota di avanzamento |
|---|---|---|
| M0. Decisioni, discovery e baseline | Completato | Strategia, ADR, spec, privacy record e baseline web registrati; i gate che richiedono dati reali o Play sono separati e tracciati |
| M1. Fondazione Capacitor e doppia distribuzione | In corso | Shell, routing, localStorage, IndexedDB e attachment store verificati su API 36; restano i flussi archive/CSV autenticati e la configurazione production |
| M2. Runtime di piattaforma, autenticazione e lifecycle | In corso | Login Google positivo verificato manualmente; runtime bridge, resume, deep link, boundary notifiche e coordinamento purge implementati; restano session lifecycle completa, allowlist/admin e target autenticato |
| M3. Fondazione privacy e sicurezza Android | In corso | Owner isolation, purge journal, Keystore/AES-GCM, backup exclusion, WebView/CSP, R8 e listener manifest verificati; restano gate privacy/DPIA, PendingIntent futuro e QA fisica |
| M4. Notification listener e configurazione utente | In corso | Listener, opt-in/OS status, settings owner-scoped, catalogo esclusivamente sintetico e package-before-extras gate verificati; restano process/reboot QA e sorgenti reali bloccate |
| M5. Rule engine nativo e corpus di fixture | Non iniziato | Attende M0 e M4 |
| M6. Repository candidati, retention e deduplicazione | Non iniziato | Attende M3 e M5 |
| M7. Bridge Capacitor, deep link e notifiche Aura | Non iniziato | Attende M4 e M6 |
| M8. UX React, review e creazione transazione | Non iniziato | Attende M2, M6 e M7 |
| M9. Hardening, QA fisica e compliance | Non iniziato | Attende M1-M8 |
| M10. Pilot, beta e release progressiva | Non iniziato | Attende M9 |
| M11. Chiusura documentale e operativa | Non iniziato | Viaggia con tutti i milestone; chiusura dopo M10 |

Focus corrente: **M3 — consolidare e approvare i confini privacy/security senza leggere notifiche finanziarie reali**.

## Direzione approvata

### Strategia di prodotto

- Aura continua a esistere come PWA mobile-first e local-first.
- L'app Android usa Capacitor per riutilizzare la stessa applicazione React.
- PWA e Android sono due distribuzioni dello stesso prodotto e condividono il dominio finanziario.
- Il rilevamento da notifiche è una capacità nativa Android, non una capacità web.
- La PWA non viene deprecata e non deve dipendere da API Capacitor per avviarsi.
- iOS non fa parte dell'MVP.

### Comportamento del rilevamento

- La funzione è `off` alla prima installazione.
- Android concede l'accesso al listener nel suo complesso; Aura applica internamente una whitelist ristretta.
- Il package della notifica viene controllato prima di leggere titolo, testo o `bigText`.
- Il contenuto grezzo esiste soltanto durante il parsing in memoria.
- Una notifica riconosciuta genera un `PaymentCandidate`, mai direttamente una `Transaction`.
- L'utente deve poter verificare, modificare o ignorare il candidato.
- La transazione viene creata esclusivamente attraverso il flusso canonico React/AppData.
- La disattivazione interrompe immediatamente nuove elaborazioni.

### Privacy e minimizzazione

- Nessun testo grezzo viene persistito.
- Nessun testo grezzo, merchant, importo o dato finanziario viene scritto nei log.
- Nessun dato di rilevamento viene inviato a Gemini.
- Nessun dato di rilevamento viene inviato a Firebase o analytics.
- OTP, numero di carta, ultime cifre della carta, numero di conto, saldo e immagini non fanno parte dell'MVP.
- Importo e merchant non vengono mostrati sulla lock screen senza una scelta esplicita dell'utente.
- I candidati pendenti non entrano nel backup cloud Aura o nell'archivio portabile.
- I dati nativi sensibili devono essere esclusi dai backup e trasferimenti automatici Android.

### AI e automazione

- Il rule engine usa soltanto regole, template e regex deterministiche.
- Nessun LLM è necessario o consentito nel percorso.
- Non viene effettuata classificazione automatica irreversibile.
- La conferma umana rimane obbligatoria.
- L'iniziativa non introduce un nuovo caso d'uso AI Act.

## Registro delle decisioni

### Decisioni approvate

| ID | Decisione | Stato | Data | Nota |
|---|---|---|---|---|
| D-001 | Mantenere PWA e Android Capacitor in parallelo | Approvata | 2026-07-25 | Un solo dominio React, capacità native dietro adapter |
| D-002 | Usare Capacitor invece di una riscrittura React Native o Kotlin completa | Approvata | 2026-07-25 | Massimizza il riuso dell'app corrente |
| D-003 | Rilevamento Android soltanto e opt-in | Approvata | 2026-07-25 | Nessuna elaborazione prima dell'abilitazione |
| D-004 | Parsing locale deterministico senza Gemini o rete | Approvata | 2026-07-25 | Preserva il principio local-first |
| D-005 | Creare candidati e richiedere conferma esplicita | Approvata | 2026-07-25 | Nessuna transazione automatica |
| D-006 | Non raccogliere o conservare dati della carta | Approvata | 2026-07-25 | Le ultime cifre non producono valore sufficiente nell'MVP |
| D-007 | Mantenere `AppData` come unica fonte di verità delle transazioni | Approvata | 2026-07-25 | Il codice nativo non scrive nel localStorage |
| D-008 | Usare un transaction ID prenotato per l'accettazione idempotente | Approvata | 2026-07-25 | Evita metadati detection nel modello finanziario e una migrazione anticipata dell'archivio |

### Decisioni chiuse in M0

| ID | Decisione | Stato | Data | Nota |
|---|---|---|---|---|
| D-101 | Primo pilot limitato a pagamenti con carta in EUR e 1-2 app | Approvata | 2026-07-25 | Le app reali sono selezionate al gate pre-pilot, non ipotizzate nello spike |
| D-102 | Rimborsi fuori dal primo pilot | Approvata | 2026-07-25 | Richiederanno regole e metriche dedicate |
| D-103 | Entrate, bonifici e P2P fuori dall'MVP iniziale | Approvata | 2026-07-25 | La semantica non è abbastanza omogenea per il primo corpus |
| D-104 | Nessuna telemetria custom nell'MVP | Approvata | 2026-07-25 | Fixture, QA e feedback volontario redatto sono sufficienti per il pilot |
| D-105 | Pending 14 giorni; payload ignorato eliminato subito; tombstone ignorato 7 giorni e accettato 30 giorni | Approvata | 2026-07-25 | Retention modificabile solo con review privacy e test |
| D-106 | Backup cloud Android e device-to-device disabilitati o integralmente esclusi per i dati Aura | Approvata | 2026-07-25 | Evita un secondo canale di trasporto implicito |
| D-107 | Credential Manager nativo, token Google in memoria e sessione Firebase JS | Approvata | 2026-07-25 | Nessun plugin auth terzo per default |
| D-108 | Nella PWA la capacità è dichiarata Android-only; nessun setup fittizio | Approvata | 2026-07-25 | L'eventuale link allo store compare solo quando esiste una release pubblica |
| D-109 | Mapping persistente merchant-categoria fuori dal pilot | Approvata | 2026-07-25 | Evita dati e migrazioni senza evidenza di valore |
| D-110 | Notifiche Aura redatte sulla lock screen per default | Approvata | 2026-07-25 | Importo e merchant richiedono opt-in separato |
| D-111 | Debug e release usano package, Firebase/OAuth client e signing separati | Approvata | 2026-07-25 | Debug usa `.debug`; nessuna build di sviluppo scrive sul progetto Firebase di produzione |
| D-112 | Solo il notification listener è bindabile dal sistema e protetto dal permesso Android dedicato | Approvata | 2026-07-25 | Plugin, receiver e helper restano non esportati salvo eccezione documentata |
| D-113 | Supportare soltanto Android 16/API 36 nella prima release | Approvata | 2026-07-25 | `minSdk`, compile e target sono 36; nessuna compatibilità dichiarata o test richiesta per versioni precedenti |

### Gate esterni e pre-pilot

Questi elementi non bloccano M1-M2 né lo spike con sorgente sintetica. Bloccano invece il primo utilizzo di notifiche finanziarie reali o una distribuzione firmata, secondo il gate indicato.

| ID | Elemento | Owner richiesto | Gate | Stato |
|---|---|---|---|---|
| B-001 | Verificare controllo namespace e disponibilità Play di `com.staituned.aura` | Product/Release owner | Prima del primo artifact firmato o della registrazione Firebase Android definitiva | Aperto |
| B-002 | Selezionare e verificare la prima o le prime due app di pagamento | Product owner | Prima di M4 su sorgenti reali | Aperto |
| B-003 | Approvare fonte, consenso, redazione e retention delle fixture reali | Privacy owner + QA | Prima di acquisire o committare una fixture reale | Aperto |
| B-004 | min/compile/target SDK 36 e matrice Android 16/API 36 | Android owner | Decisione M0 aggiornata in D-113 | Chiuso |
| B-005 | Attivare Play App Signing, custodire separatamente la upload key e verificare il Play Console account | Release owner | Prima della prima distribuzione interna firmata | Aperto |
| B-006 | Assegnare privacy owner, validare base giuridica/data inventory ed eseguire screening DPIA | Privacy owner | Prima di M4 su sorgenti reali e prima del pilot | Aperto |
| B-007 | Purge/sospensione su logout, cambio account, reset e cancellazione totale | Product + Security owner | Decisione M0; verifica implementativa M3/M8 | Chiuso |

## Scope

### In scope per lo spike

- aggiunta di Capacitor a React/Vite;
- progetto Android compilabile;
- esecuzione della stessa UI React nella WebView;
- autenticazione Google/Firebase funzionante nella build Android;
- preservazione di localStorage e IndexedDB;
- capability detection web/native;
- `NotificationListenerService` con app sorgente sintetica;
- filtro package prima della lettura del contenuto;
- parser nativo minimo con fixture sintetiche;
- Room con un candidato minimale;
- bridge per elencare e aprire un candidato;
- deep link verso la review;
- cancellazione coordinata web+nativo;
- verifica che nessun dato nativo entri in Android Auto Backup;
- test di non regressione della PWA.

### In scope per l'MVP

- Android;
- rilevamento opt-in;
- catalogo ristretto di app supportate;
- selezione delle singole app installate;
- pagamenti con carta in EUR;
- parsing offline in Kotlin;
- regole negative per OTP, rifiuti, annullamenti e notifiche informative;
- estrazione di importo, valuta, merchant facoltativo e timestamp;
- candidati `pending`, `ignored`, `accepted`, `edited`, `expired`;
- deduplicazione tecnica e semantica;
- coda locale;
- notifica Aura privata;
- lista "Pagamenti da verificare";
- review precompilata;
- creazione transazione tramite il dominio React;
- retention e pulizia;
- sospensione, revoca e cancellazione;
- test su dispositivi fisici;
- rollout interno e beta chiusa.

### Fuori scope per l'MVP

- sostituzione o deprecazione della PWA;
- iOS;
- SMS;
- Accessibility Service;
- Open Banking;
- inserimento automatico;
- LLM o Gemini nel percorso;
- invio delle notifiche a server;
- supporto universale per tutte le banche;
- regole create dagli utenti;
- regole aggiornate da remoto;
- bonifici, stipendio e trasferimenti P2P;
- riconciliazione con estratti conto;
- sincronizzazione cloud dei candidati;
- admin visibility sui pagamenti;
- card/account matching;
- raccolta automatica di esempi reali;
- analytics custom sui candidati;
- mapping merchant-categoria persistente, salvo successiva decisione.

## Architettura obiettivo

### Distribuzione

```text
Repository React/Vite condiviso
│
├── npm run build
│   └── distribuzione web/PWA
│
└── npm run build + cap sync android
    └── bundle Android Capacitor
        ├── WebView con UI React
        ├── autenticazione nativa/bridge
        ├── NotificationListenerService
        ├── rule engine Kotlin
        ├── Room Candidate Repository
        └── notifiche/deep link Android
```

La build di produzione Android deve includere gli asset web nel bundle. Non deve caricare in produzione un `server.url` remoto che trasformi la WebView in un client di codice non controllato.

### Flusso di rilevamento

```text
Android riceve StatusBarNotification
→ verifica feature enabled
→ legge packageName
→ verifica catalogo supportato
→ verifica selezione utente
→ se non consentito: return senza leggere extras
→ estrae soltanto title/text/bigText
→ normalizza in memoria
→ applica negative rules
→ applica exact/positive rules
→ estrae importo, valuta e merchant facoltativo
→ distrugge i riferimenti al testo grezzo
→ calcola tier e fingerprint
→ upsert idempotente in Room
→ notifica Aura solo per exact/high tier
```

### Flusso di accettazione cross-storage

Room e `AppData` non possono partecipare alla stessa transazione atomica. L'accettazione deve quindi essere journaled e idempotente:

```text
React richiede beginAcceptance(candidateId)
→ native marca accepting e restituisce snapshot + acceptanceToken + reservedTransactionId
→ React crea Transaction usando reservedTransactionId come normale Transaction.id
→ AppData viene persistito e letto nuovamente
→ React chiama completeAcceptance(candidateId, acceptanceToken)
→ native elimina il payload sensibile
→ native conserva solo tombstone/fingerprint a scadenza
```

Recovery:

- se Aura riparte con candidato `accepting` e trova `reservedTransactionId` come `Transaction.id` in `AppData`, completa l'accettazione;
- se la transazione non esiste, riporta il candidato a `pending`;
- una chiamata ripetuta con lo stesso token non crea una seconda transazione;
- il transaction ID prenotato è un normale UUID opaco e non rivela l'origine della transazione.

### Confini React

Struttura indicativa:

```text
src/
  domain/payment-detection/
    contracts.ts
    candidateToTransaction.ts
    acceptanceRecovery.ts
  repositories/
    paymentDetectionRepository.ts
  services/platform/
    capabilities.ts
    webPlatform.ts
    androidPlatform.ts
  state/
    PaymentDetectionProvider.tsx
  components/payment-detection/
    PaymentDetectionSettings.tsx
    CandidateList.tsx
    CandidateReview.tsx
  pages/
    PaymentDetectionPage.tsx
```

Responsabilità:

- `domain`: mapping puro e invarianti;
- `repositories`: API del bridge e fallback web;
- `services/platform`: differenze PWA/Android;
- `state`: orchestrazione, resume, reconciliation;
- `components`: rendering e interazioni;
- `pages`: composizione di route.

### Confini Android

Struttura indicativa:

```text
android/app/src/main/java/<package>/paymentdetection/
  domain/
    NotificationNormalizer.kt
    PaymentRuleEngine.kt
    CandidateFingerprint.kt
  data/
    PaymentCandidateEntity.kt
    PaymentCandidateDao.kt
    PaymentCandidateDatabase.kt
    PaymentDetectionSettingsRepository.kt
  service/
    PaymentNotificationListener.kt
    CandidateCleanupWorker.kt
  notifications/
    AuraPaymentNotificationManager.kt
    IgnoreCandidateReceiver.kt
  bridge/
    PaymentDetectionPlugin.kt
  security/
    CandidateFieldProtector.kt
```

Il listener non contiene regex complesse, SQL, UI o logica React. Coordina repository ed engine.

## Contratto dati proposto

### Candidate persistito

```text
id
ownerKeyHash
sourceAppId
payloadCiphertext
payloadNonce
detectedAt
matchTier
matchedRuleId
ruleVersion
notificationFingerprint
semanticFingerprint
status
acceptanceTokenHash?
reservedTransactionId?
updatedAt
expiresAt
```

`payloadCiphertext` usa AES-GCM con chiave non esportabile in Android Keystore e contiene `operationType`, `amountMinorUnits`, `currency`, `merchant?` e `occurredAt`. `id`, `ownerKeyHash` e versione schema sono authenticated associated data, così il payload non può essere spostato tra record o owner senza fallire la verifica.

### Dati vietati

```text
rawNotificationTitle
rawNotificationText
rawNotificationBigText
otp
cardNumber
cardLastFour
accountNumber
balance
userEmail
firebaseIdToken
```

### Contratto con la Transaction

Il plugin prenota un UUID casuale durante `beginAcceptance`:

```text
reservedTransactionId
```

React usa quel valore come normale `Transaction.id`. Non vengono aggiunti campi detection-specific al modello finanziario.

Non trasferire nella Transaction:

- candidate ID;
- package dell'app bancaria;
- rule ID;
- confidence numerica;
- fingerprint della notifica;
- identificatori di carta o conto.

Conseguenze:

- l'archivio portabile e il backup cloud vedono una normale transazione;
- non è necessaria una migrazione dello schema per il solo rilevamento;
- il journal nativo può verificare il commit cercando l'ID prenotato;
- la provenienza dalla notifica non viene conservata indefinitamente nel ledger;
- tombstone e fingerprint restano esclusivamente nel repository nativo e scadono.

## Retention proposta

| Dato/stato | Retention proposta | Azione alla scadenza |
|---|---|---|
| Testo grezzo | Solo durata del parsing | Rilascio immediato dei riferimenti |
| Candidato `pending` | 14 giorni | Passa a `expired`, poi cancellazione payload |
| Candidato `ignored` | Payload eliminato immediatamente | Tombstone fingerprint per 7 giorni |
| Candidato `accepted/edited` | Payload eliminato dopo commit verificato | Tombstone fingerprint per 30 giorni |
| Candidato `accepting` | Fino a recovery conclusa | Reconciliation con `AppData` |
| Tombstone scaduta | Nessuna retention | Cancellazione definitiva |
| Preferenze app selezionate | Fino a disattivazione/reset/cambio owner | Cancellazione coordinata |
| Regole bundle | Vita della versione app | Sostituzione tramite nuova release |

La retention finale deve essere approvata in M0 e registrata nei documenti privacy.

## Piano dei milestone

### M0. Decisioni, Discovery E Baseline

Goal: congelare scope, contratti, governance e baseline prima di modificare il prodotto.

Stato: **Completato**

Dipendenze: nessuna.

Task:

- [x] Valutare fattibilità tecnica, prodotto, sicurezza e privacy.
- [x] Approvare la convivenza PWA + Android Capacitor.
- [x] Approvare parsing locale, opt-in e conferma obbligatoria.
- [x] Escludere i dati della carta dall'MVP.
- [x] Creare questo progress tracker.
- [x] Aggiornare `product/project-brief.md` con l'iniziativa Android pianificata.
- [x] Aggiornare `00-project-brainstorm.md` con problema, alternative e decisioni.
- [x] Aggiornare `01-solution-strategy.md` con doppia distribuzione e trust boundaries.
- [x] Aggiornare `02-delivery-plan.md` per puntare a questo tracker.
- [x] Creare ADR per wrapper Capacitor, bridge nativo e mantenimento della PWA.
- [x] Creare ADR per l'accettazione cross-storage idempotente.
- [x] Scegliere `com.staituned.aura` come package identifier, con verifica pre-firma B-001.
- [x] Classificare la scelta delle prime 1-2 app reali come gate B-002, non come assunzione dello spike.
- [x] Confermare EUR e pagamenti con carta come scope pilot.
- [x] Confermare rimborsi, bonifici e mapping merchant come non-scope iniziale.
- [x] Definire min/compile/target SDK 36 e matrice Android 16/API 36.
- [x] Definire Play App Signing e upload key separata come strategia; verifica operativa in B-005.
- [x] Approvare una policy synthetic-first e spostare ogni fixture reale dietro B-003.
- [x] Definire Data Safety e disclosure preliminari.
- [x] Registrare screening DPIA, data inventory e base giuridica come gate B-006 prima di sorgenti reali.
- [x] Disabilitare/escludere Android cloud backup e device-to-device transfer per i dati Aura.
- [x] Approvare modello owner/logout/cambio account.
- [x] Approvare retention candidati e tombstone.
- [x] Definire criteri di precisione del pilot.
- [x] Mappare i flussi PWA che richiedono adapter: auth, notifiche, install prompt, service worker, deep link.
- [x] Eseguire baseline `npm run test:regression`.
- [x] Eseguire e registrare baseline E2E web applicabile, incluso il problema preesistente rilevato.
- [x] Registrare dimensione bundle web iniziale; performance Android rinviata a M1 dopo disponibilità del runtime.

Exit criteria:

- package di lavoro, scope pilot e gate per le app reali sono espliciti;
- nessuna decisione fondazionale necessaria allo spike sintetico resta implicita;
- gli obblighi privacy che richiedono un owner sono registrati come gate prima di sorgenti reali;
- i confini web/native e il recovery cross-storage sono descritti in ADR;
- baseline test e build è verde o i problemi preesistenti sono registrati;
- esiste una strategia synthetic-first e una barriera verificabile contro la raccolta occulta di fixture reali.

Evidenze:

- tracker creato il 2026-07-25;
- project brief, brainstorm, solution strategy e delivery plan allineati il 2026-07-25;
- ADR 0002 e ADR 0003 accettati il 2026-07-25;
- feature spec e processing record privacy creati il 2026-07-25;
- `npm run test:regression`: TypeScript, 57 file/302 test Vitest e build Vite passati;
- bundle iniziale: entry `index` 260.43 kB/72.55 kB gzip, `Reports` 428.15/124.27 kB, `firebase` 467.11/109.63 kB, `exceljs` 940.20/269.87 kB;
- baseline E2E tentata e registrata: 1 test passato, 6 falliti, 1 interrotto e 23 non eseguiti; i fallimenti osservati attendono l'azione `Export complete archive` mentre la Guided Tour è aperta sulla Home;
- ambiente locale iniziale: Node 25.1.0 e OpenJDK 21.0.8 disponibili; toolchain Android non ancora installato al completamento di M0.

### M1. Fondazione Capacitor E Doppia Distribuzione

Goal: produrre una build Android avviabile senza degradare la PWA.

Stato: **In corso**

Dipendenze: M0.

Task:

- [x] Aggiungere e fissare versioni compatibili di `@capacitor/core`, `@capacitor/cli` e `@capacitor/android`.
- [x] Creare `capacitor.config.*` con package identifier approvato.
- [x] Impostare `webDir` sul build Vite corretto.
- [x] Generare e versionare il progetto `android/`.
- [x] Verificare che la build Android usi asset locali e non un server remoto in produzione.
- [x] Definire script `android:sync`, `android:assemble:debug`, `android:test` e `android:lint`.
- [x] Configurare build type debug con `com.staituned.aura.debug`, label distinta e debug signing; internal/release usano il package approvato.
- [ ] Separare Firebase/OAuth non-production e production, incluse le coppie package/certificato; la configurazione debug reale è verificata, mentre client e firma production restano un gate release.
- [x] Provare che debug/E2E non incorporano credenziali Firebase production; la prova di scrittura resta non applicabile finché il progetto debug non è configurato.
- [x] Non inserire chiavi di firma o segreti nel repository.
- [x] Verificare routing React su cold start, reload e deep link; cold start, reload di `/reports` e consegna del deep link debug verificati su API 36.
- [x] Verificare persistenza localStorage dopo chiusura e riapertura.
- [x] Verificare persistenza IndexedDB e allegati.
- [ ] Verificare export/import `.aura` nella WebView.
- [ ] Verificare import CSV e isolamento Gemini.
- [x] Nascondere install prompt PWA nella build nativa.
- [x] Evitare registrazione o dipendenza dal service worker nella build nativa.
- [x] Mantenere manifest e installazione PWA invariati sul web.
- [x] Aggiungere test di capability detection senza oggetto Capacitor disponibile.
- [x] Eseguire lint, unit test e build web dopo l'integrazione.
- [x] Eseguire Gradle assemble e lint della build Android.
- [x] Registrare dimensione APK e impatto del wrapper; AAB resta al gate release.

Exit criteria:

- PWA continua ad avviarsi e superare i test esistenti;
- Android avvia la stessa UI da asset locali;
- storage, routing e flussi dati principali funzionano dopo restart;
- nessun secret è presente nel bundle o nel repository;
- il codice web non richiede Capacitor per funzionare.

Evidenze M1 al 2026-07-26:

- `npm run test:regression`: TypeScript, 70 file/341 test Vitest e build Vite passati;
- `bash scripts/run-android-gradle.sh test lint assembleDebug`: 198 task, build riuscita;
- APK debug: 11,6 MB prima del bridge auth; 14,3 MB con Kotlin, Credential Manager e Google ID, application ID `com.staituned.aura.debug`, min/target SDK 36;
- cold start su emulatore Android 16/API 36 in 1,433 secondi, activity visibile e nessun crash applicativo;
- configurazione generata con logging e WebView debugging disattivati, nessun `server.url`, mixed content disabilitato;
- manifest finale con backup, device transfer e cleartext disabilitati;
- `npm run android:verify:webview`: origine locale `https://localhost`, platform
  Android, cold start, reload BrowserRouter di `/reports`, persistenza dopo
  force-stop di localStorage, IndexedDB e chiave nel database reale
  `keyval-store` degli allegati, più consegna del deep link debug;
- `npm run android:test:instrumentation`: 2 test passati su emulatore
  Android 16/API 36 per package debug isolato, `allowBackup=false` e risoluzione
  interna del deep link;
- entry bundle web passata da 260,43 kB/72,55 kB gzip a 269,18 kB/75,87 kB gzip;
- `npm audit --omit=dev` non è verde per 18 advisory nella dependency tree esistente; nessun aggiornamento automatico è stato applicato.

### M2. Runtime Di Piattaforma, Autenticazione E Lifecycle

Goal: introdurre adapter espliciti per le differenze web/native.

Stato: **In corso**

Dipendenze: M1.

Task:

- [x] Definire `PlatformCapabilities` typed e testabile.
- [x] Implementare adapter web con `paymentDetectionSupported=false`.
- [x] Implementare adapter Android Capacitor con `paymentDetectionSupported=false` finché il plugin non esiste.
- [x] Migrare il codice PWA install a un adapter e disabilitarlo in native.
- [x] Migrare notifiche browser/native a un boundary comune senza cambiare semantica.
- [x] Configurare Firebase Android debug app, package
  `com.staituned.aura.debug`, fingerprint SHA e Web client ID usato da
  Credential Manager.
- [ ] Configurare Firebase/OAuth e signing production per
  `com.staituned.aura`.
- [x] Implementare Google Credential Manager tramite plugin Kotlin first-party.
- [x] Leggere il Web client ID dalla risorsa Android generata da
  `google-services.json`, senza trasferirlo nel bridge Capacitor.
- [x] Trasferire il token Google al Firebase JS SDK soltanto in memoria.
- [x] Vietare log di token, credential e auth result; rimosso anche il precedente log di presenza della configurazione Firebase.
- [x] Aggiungere diagnostica auth locale solo per build debuggable con stage,
  codice limitato, classe eccezione e stack frame sanitizzati.
- [ ] Verificare allowlist e admin role con lo stesso Firebase UID della PWA.
- [ ] Verificare login, logout, token refresh, offline e session expiry.
- [x] Definire lifecycle hooks per cold start, resume e process recreation.
- [x] Esporre evento `appResumed` al futuro provider di payment detection tramite subscription typed.
- [x] Definire navigazione da deep link con utente autenticato e non autenticato.
- [ ] Conservare candidate target durante login senza esporre dati nella URL.
- [x] Definire logout coordinato con purge/suspend nativo.
- [ ] Testare cambio account senza riuso dei dati del precedente owner.
- [x] Aggiungere test unitari degli adapter.
- [ ] Aggiungere test di integrazione auth Android.

Evidenze M2 al 2026-07-26:

- configurazione debug verificata senza stampare valori: environment completo,
  progetto Firebase coerente, Web client ID coerente, client Android per
  `com.staituned.aura.debug` presente e SHA-1 debug corrispondente;
- `processDebugGoogleServices` e `assembleDebug` completati con successo;
- Credential Manager invocato su Android 16 con calling package
  `com.staituned.aura.debug`, senza `DEVELOPER_ERROR` o crash;
- l'AVD API 36 senza provider/account Google ha restituito
  `AUTH_NO_CREDENTIAL`; il 2026-07-26 l'utente ha inoltre riferito esito
  positivo del login manuale con il proprio account su un ambiente
  Google-capable. Logout, refresh, expiry, offline e ruolo restano test separati;
- diagnostica auth protetta da variante debuggable e testata per escludere
  messaggi, token simulati, email e payload non attendibili;
- test runtime diagnostico su API 36: Logcat espone
  `stage=credential_manager code=AUTH_NO_CREDENTIAL` sia dal tag nativo
  `AuraGoogleAuth` sia dalla console WebView, senza `DEVELOPER_ERROR`;
- scansione Logcat dell'app dopo il test: zero occorrenze di `idToken`,
  `serverClientId`, variabili `VITE_*`, client ID Google ed email;
- `android:test` esegue `testDebugUnitTest`, evitando di richiedere il client
  Firebase production non ancora configurato.
- plugin first-party `NativeAppRuntime` compilato e verificato su API 36:
  emette resume, conserva l'app URL fino al completamento del login e accetta
  soltanto route allowlisted senza query o fragment finanziari;
- il boundary notifiche conserva le Notification API e il service worker sul
  web e non li invoca nella WebView Android;
- il coordinatore `purgeNativePaymentData` è fail-closed quando il futuro plugin
  esiste e no-op esplicito finché M3-M6 non introducono il repository nativo;
- 2 instrumentation test Android e i contract test React coprono package,
  backup flag, deep-link resolution, target pre-login e acknowledge post-login.

Exit criteria:

- lo stesso utente Firebase è riconosciuto correttamente su web e Android;
- logout e cambio account non lasciano dati nativi accessibili;
- deep link e resume sono idempotenti;
- la PWA non presenta regressioni di auth o installazione.

### M3. Fondazione Privacy E Sicurezza Android

Goal: fissare i controlli prima di leggere notifiche reali.

Stato: **In corso**

Dipendenze: M0-M2.

Task:

- [x] Creare data-flow diagram con trust boundaries Android, WebView, Room e Firebase.
- [x] Creare threat model per listener, bridge, deep link, storage e multi-account.
- [x] Documentare dati elaborati, persistiti, esclusi e cancellati.
- [x] Implementare owner key hash senza email o token.
- [x] Definire purge journaled e recuperabile di candidati, tombstone e preferenze.
- [x] Collegare purge a logout, cambio owner, reset locale e cancellazione totale.
- [x] Configurare `android:allowBackup` e `data-extraction-rules` secondo D-106.
- [x] Escludere Room, preferenze e chiavi da cloud backup e D2D.
- [x] Aggiungere test di configurazione e instrumentation ripetibili che dimostrano
  flag e regole di esclusione; la prova OEM/D2D fisica resta in M9.
- [x] Disabilitare cleartext traffic non necessario.
- [x] Impedire navigazione WebView verso origini non approvate.
- [x] Non usare `server.url` remoto in release.
- [x] Verificare CSP e superfici XSS rilevanti per le API bridge.
- [x] Assicurare che il bridge non esponga testo grezzo.
- [x] Assicurare che service e receiver Aura non necessari siano `exported=false`.
- [x] Verificare che il solo `NotificationListenerService` bindabile dal sistema sia protetto da `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` e non esponga azioni applicative.
- [ ] Usare PendingIntent immutable quando possibile.
- [x] Usare ID candidato non prevedibili.
- [x] Definire cifratura AES-GCM dell'intero payload strutturato, incluso il merchant.
- [x] Definire comportamento in caso di chiave Keystore invalidata.
- [x] Rimuovere log dinamici dal percorso nativo release.
- [x] Configurare R8 per shrinking e rimozione dei log debug in produzione.
- [x] Verificare che non sia installato un crash-reporting/breadcrumb SDK e che il
  bridge M3 non contenga candidate fields.
- [x] Definire notifica Aura `VISIBILITY_PRIVATE` con public version redatta.
- [x] Preparare disclosure che spieghi l'ampiezza del permesso Android e il filtro interno.
- [x] Preparare flussi di revoca, sospensione e cancellazione.
- [x] Aggiornare architettura security, data inventory, retention e processing record.
- [ ] Registrare screening DPIA e decisione privacy owner.

Evidenze M3 al 2026-07-26:

- [`android-payment-detection-security.md`](../01-architecture/android-payment-detection-security.md)
  contiene DFD, trust boundaries, data lifecycle, threat model, disclosure,
  deletion flows e controlli futuri M4/M7;
- owner Firebase registrato nativamente soltanto dopo allowlist, derivato con
  HMAC-SHA256 e chiave Android Keystore; UID, email e token non sono persistiti;
- purge journaled e recuperabile su logout, account change, reset locale e
  cancellazione totale; il cambio owner è fail-closed;
- primitive AES-GCM con AAD owner/ID/schema e ID opachi da 144 bit verificate
  su Android 16/API 36;
- `allowBackup=false`, regole exhaustive cloud/D2D, cleartext disabilitato,
  WebView limitata a `https://localhost`, CSP senza `unsafe-eval`, nessun
  `server.url`;
- R8 e resource shrinking release attivi, chiamate `android.util.Log` rimosse
  in release, nessun crash SDK installato;
- `android:test:instrumentation`: 6 test passati su API 36; test TypeScript di
  configurazione e bridge passati;
- `bash scripts/run-android-gradle.sh testDebugUnitTest lintDebug assembleDebug`:
  145 task, build riuscita;
- nessun listener, parser, database candidato o notifica Aura esiste ancora:
  i task component-specific restano correttamente aperti per M4/M7;
- base giuridica, ruoli, RoPA e DPIA restano bloccati sul privacy owner; questa
  implementazione non autorizza l'uso di notifiche reali.

Exit criteria:

- nessuna notifica reale viene letta prima che backup, logging, owner e deletion boundaries siano verificati;
- il bridge non può restituire raw content;
- i dati nativi non vengono trasferiti dai backup Android;
- disclosure e cancellazione coprono il comportamento reale;
- privacy owner ha registrato i gap residui e il gate per il pilot.

### M4. Notification Listener E Configurazione Utente

Goal: ricevere notifiche in modo minimo, prevedibile e revocabile.

Stato: **In corso**

Dipendenze: M2-M3.

Task:

- [x] Dichiarare `NotificationListenerService` nel manifest.
- [x] Dichiararlo bindabile dal sistema con il permesso `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`; nessun intent applicativo custom.
- [x] Implementare lettura dello stato di accesso alle notifiche.
- [x] Implementare apertura delle impostazioni Android con fallback.
- [x] Implementare `POST_NOTIFICATIONS` per notifiche Aura su versioni applicabili.
- [x] Separare `requestedEnabled` da `osPermissionGranted`.
- [x] Gestire permesso revocato conservando opt-in e selezione; i candidati arriveranno in M6.
- [x] Creare catalogo di package supportati con il solo identificatore della test APK controllata; nessun package reale è stato ipotizzato.
- [x] Usare `<queries>` finite, senza `QUERY_ALL_PACKAGES`.
- [x] Elencare soltanto app supportate e installate.
- [x] Salvare la selezione utente nel repository nativo owner-scoped.
- [x] Leggere `packageName` prima degli extras.
- [x] Eseguire `return` immediato per package non supportato o non selezionato.
- [x] Estrarre soltanto title, text e bigText per package consentiti.
- [x] Imporre limite massimo di 512 caratteri per campo.
- [x] Spostare estrazione e sink fuori dal callback tramite executor dedicato.
- [x] Gestire `onListenerConnected` e `onListenerDisconnected`, incluso rebind.
- [x] Gestire notifiche aggiornate attraverso lo stesso gate e rimozioni come no-op esplicito finché M6 non introduce il repository.
- [ ] Gestire app chiusa, process recreation e riavvio dispositivo.
- [x] Non usare Accessibility Service o SMS.
- [x] Creare app sorgente di test controllata, separata dall'APK Aura e protetta da permesso signature debug-only.
- [x] Aggiungere instrumentation test per package gate e callback reale.
- [x] Provare che un package non supportato o non selezionato non causa accesso agli extras nel codice applicativo.

Evidenze M4 al 2026-07-26:

- manifest installato: unico service Aura
  `AuraNotificationListenerService`, `exported=false`, protetto da
  `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`, senza azioni custom;
- plugin first-party espone stato OS, stato richiesto, connessione listener,
  permesso `POST_NOTIFICATIONS`, apertura settings con fallback, catalogo
  installato e aggiornamento selezione validato;
- `SupportedPaymentAppCatalog` contiene esclusivamente
  `com.staituned.aura.syntheticnotifications`; nessun package bancario o
  finanziario reale è presente;
- test unitari provano che l'extractor non viene invocato per package
  unsupported o non selezionato;
- test instrumentation installa la test APK separata, concede temporaneamente
  il listener, pubblica una notifica statica sintetica, riceve un solo callback
  con UI Aura non avviata, quindi revoca accesso e purga lo store;
- 10 instrumentation test passati su Android 16/API 36;
- nessun parser M5, candidato M6, notifica Aura M7 o dato reale è stato
  introdotto. Process recreation e reboot restano il gate tecnico M4 aperto.

Exit criteria:

- nessun contenuto viene letto prima dei due gate supportato+selezionato;
- revoca e riabilitazione producono uno stato UI corretto;
- il listener non blocca il main thread;
- la build non richiede visibilità generale delle app;
- i test sintetici funzionano con Aura chiusa.

### M5. Rule Engine Nativo E Corpus Di Fixture

Goal: riconoscere soltanto template sufficientemente affidabili.

Stato: **Non iniziato**

Dipendenze: M0 e M4.

Task:

- [ ] Definire schema versionato delle regole.
- [ ] Includere le regole nel bundle Android.
- [ ] Implementare Unicode NFKC, spazi e limite input.
- [ ] Normalizzare separatori decimali EUR.
- [ ] Salvare importi in minor units.
- [ ] Implementare negative rules con priorità assoluta.
- [ ] Coprire OTP, login, saldo, promozioni, rifiuti, annullamenti e operazioni non supportate.
- [ ] Implementare exact template match.
- [ ] Implementare positive match soltanto per pattern approvati.
- [ ] Rendere merchant facoltativo.
- [ ] Non estrarre card/account identifiers.
- [ ] Usare tier `exact`, `review`, `ignored` invece di presentare score non calibrati.
- [ ] Precompilare regex e gestire errori per singola regola.
- [ ] Vietare quantificatori annidati e pattern non lineari noti.
- [ ] Inserire time budget o benchmark per ogni regola.
- [ ] Creare fixture `accepted`, `rejected`, `ambiguous` per ogni app.
- [ ] Usare fixture sintetiche finché il processo per esempi reali non è approvato.
- [ ] Redigere e versionare esempi reali prima del commit.
- [ ] Non includere dati personali nei nomi file, commit o issue.
- [ ] Aggiungere test positivo e negativo per ogni pattern.
- [ ] Aggiungere test locale/lingua/versione template.
- [ ] Aggiungere test di input lungo e Unicode ostile.
- [ ] Aggiungere benchmark di parsing.
- [ ] Definire comportamento per valuta diversa da EUR: ignore nell'MVP.

Exit criteria:

- ogni regola ha fixture positive, negative e ambigue;
- nessun pattern ambiguo genera una notifica immediata;
- OTP e notifiche informative sono sempre escluse nel corpus;
- parsing soddisfa il budget prestazionale;
- nessun dato reale non redatto è presente nel repository.

### M6. Repository Candidati, Retention E Deduplicazione

Goal: persistere il minimo necessario con idempotenza e cancellazione verificabile.

Stato: **Non iniziato**

Dipendenze: M3 e M5.

Task:

- [ ] Definire entity Room e schema versionato.
- [ ] Definire DAO senza query su testo sensibile.
- [ ] Creare indice unique sul fingerprint tecnico.
- [ ] Creare indice sul fingerprint semantico e stato.
- [ ] Implementare owner partitioning.
- [ ] Cifrare con AES-GCM l'intero payload strutturato del candidato e autenticare candidate ID, owner e versione schema come associated data.
- [ ] Hashare i fingerprint.
- [ ] Non salvare titolo o testo normalizzato.
- [ ] Implementare upsert per notification key aggiornata.
- [ ] Implementare dedupe semantica entro finestra approvata.
- [ ] Gestire varianti merchant tra wallet e banca senza fondere merchant differenti.
- [ ] Implementare tombstone per accepted/edited/ignored.
- [ ] Implementare stati `pending`, `accepting`, `accepted`, `edited`, `ignored`, `expired`.
- [ ] Implementare acceptance token monouso/idempotente.
- [ ] Implementare recovery di `accepting`.
- [ ] Implementare `deleteAllForOwner`.
- [ ] Implementare purge completo device-local.
- [ ] Implementare WorkManager per cleanup differibile.
- [ ] Eseguire cleanup anche all'avvio/resume.
- [ ] Definire comportamento dopo database migration fallita.
- [ ] Non notificare se la persistenza fallisce.
- [ ] Aggiungere Room migration test.
- [ ] Aggiungere concurrency e repeated-callback test.
- [ ] Aggiungere dedupe cross-source test.
- [ ] Aggiungere test retention con clock controllato.
- [ ] Aggiungere test owner isolation e purge.
- [ ] Verificare esclusione da backup Android.

Exit criteria:

- callback ripetute non creano duplicati;
- candidati e tombstone rispettano la retention;
- cambio owner non espone dati precedenti;
- recovery non crea transazioni duplicate;
- database e preferenze non lasciano dati dopo purge verificato.

### M7. Bridge Capacitor, Deep Link E Notifiche Aura

Goal: esporre a React soltanto API strutturate e sicure.

Stato: **Non iniziato**

Dipendenze: M4 e M6.

Task:

- [ ] Definire contratto TypeScript del plugin.
- [ ] Implementare `isSupported`.
- [ ] Implementare `getNotificationAccessStatus`.
- [ ] Implementare `openNotificationAccessSettings`.
- [ ] Implementare `getSettings` e `updateSettings`.
- [ ] Implementare `listSupportedApps`.
- [ ] Implementare `listCandidates` e `getCandidate`.
- [ ] Implementare `ignoreCandidate`.
- [ ] Implementare `beginAcceptance` e `completeAcceptance`.
- [ ] Implementare `recoverAcceptance`.
- [ ] Implementare `deleteAllCandidates`.
- [ ] Implementare `purgeForLogoutOrReset`.
- [ ] Implementare evento live soltanto come ottimizzazione.
- [ ] Fare refresh completo all'avvio e resume.
- [ ] Validare tutti gli argomenti dal bridge.
- [ ] Non restituire mai raw content, token o fingerprint non necessari.
- [ ] Creare notification channel dedicato con importanza `DEFAULT`.
- [ ] Creare public lock-screen version redatta.
- [ ] Aggiungere azioni `Verifica` e `Ignora`.
- [ ] Usare deep link con ID opaco.
- [ ] Evitare dati finanziari nella URL.
- [ ] Rendere receiver interno e PendingIntent correttamente immutable/unique.
- [ ] Gestire candidato scaduto o inesistente.
- [ ] Gestire deep link prima e dopo login.
- [ ] Aggiungere plugin unit/instrumentation test.
- [ ] Aggiungere contract test TypeScript/Kotlin.
- [ ] Aggiungere test di intent spoofing e ID non valido.

Exit criteria:

- React riceve soltanto DTO minimizzati;
- cold start e resume aprono il candidato corretto;
- Ignore non apre l'app e non crea transazioni;
- deep link non espone dati sensibili;
- gli intent esterni non possono modificare candidati arbitrari.

### M8. UX React, Review E Creazione Transazione

Goal: rendere il rilevamento comprensibile, reversibile e coerente con Aura.

Stato: **Non iniziato**

Dipendenze: M2, M6 e M7.

Task:

- [ ] Aggiungere provider payment detection separato da `AppData`.
- [ ] Aggiungere stato loading, unsupported, permission missing, enabled, paused ed error.
- [ ] Mostrare disclosure prima delle impostazioni Android.
- [ ] Spiegare che Android concede accesso generale e Aura applica un filtro locale.
- [ ] Richiedere azione affermativa distinta.
- [ ] Mostrare app supportate e installate.
- [ ] Permettere selezione e rimozione di ogni app.
- [ ] Mostrare stato accesso revocato.
- [ ] Mostrare link alla revoca nelle impostazioni Android.
- [ ] Aggiungere lista "Pagamenti da verificare".
- [ ] Coprire empty, loading, error, expired e permission-revoked states.
- [ ] Aggiungere review con importo, merchant, data locale, metodo di pagamento e app sorgente.
- [ ] Permettere modifica di importo, titolo, categoria, data, metodo di pagamento e trattamento.
- [ ] Usare i default correnti di Add Transaction per categoria/metodo, senza apprendimento merchant; entrambi restano visibili.
- [ ] Non mostrare confidence numerica.
- [ ] Convertire timestamp nel giorno locale senza shift UTC.
- [ ] Creare Transaction attraverso azione semantica e non localStorage diretto.
- [ ] Creare la transazione con il `reservedTransactionId` fornito da `beginAcceptance`.
- [ ] Implementare begin/commit/recovery acceptance.
- [ ] Marcare candidato accepted/edited soltanto dopo persistenza verificata.
- [ ] Implementare Ignore.
- [ ] Implementare sospensione e cancellazione completa.
- [ ] Collegare reset locale/totale e logout al purge nativo.
- [ ] Mostrare nella PWA che la capacità è disponibile solo nell'app Android, secondo D-108.
- [ ] Non mostrare install prompt PWA nell'app Android.
- [ ] Integrare con il notification center senza duplicare record finanziari sensibili.
- [ ] Verificare focus, tastiera, screen reader, contrasto e touch target.
- [ ] Aggiungere test React per setup, disclosure, permission, list, review, edit, ignore e recovery.
- [ ] Aggiungere test che la transazione rilevata resti compatibile con archive/cloud senza campi aggiuntivi.
- [ ] Aggiungere test che i candidati pendenti non entrino in archive/cloud.
- [ ] Aggiungere test che il percorso non invochi Gemini.

Exit criteria:

- l'utente comprende cosa viene letto e può revocare o cancellare;
- la review non può produrre doppie transazioni;
- PWA e Android mostrano capacità corrette;
- reset/logout eliminano i dati nativi applicabili;
- accessibilità e regressioni React sono verificate.

### M9. Hardening, QA Fisica E Compliance

Goal: dimostrare comportamento reale su dispositivi e chiudere i gate di release.

Stato: **Non iniziato**

Dipendenze: M1-M8.

Task:

- [ ] Eseguire `npm run lint`.
- [ ] Eseguire `npm run test`.
- [ ] Eseguire `npm run build`.
- [ ] Eseguire E2E web/PWA.
- [ ] Eseguire Gradle unit test.
- [ ] Eseguire Android instrumentation test.
- [ ] Eseguire Android lint e release build.
- [ ] Testare Android 16/API 36, unica versione minima e massima supportata.
- [ ] Testare package visibility su Android 16/API 36.
- [ ] Testare `POST_NOTIFICATIONS` su Android 16/API 36.
- [ ] Testare almeno un dispositivo stock Android.
- [ ] Testare almeno un dispositivo OEM con gestione aggressiva dei processi.
- [ ] Testare app chiusa, process kill, restart e reboot.
- [ ] Testare listener revocato e riconcesso.
- [ ] Testare notifica aggiornata e duplicata.
- [ ] Testare wallet+banca per la stessa operazione.
- [ ] Testare merchant assente e valuta non supportata.
- [ ] Testare OTP, rifiuto, annullamento, saldo e promozione.
- [ ] Testare lock screen redatta.
- [ ] Testare logout, cambio account e reset.
- [ ] Testare Android Auto Backup/D2D secondo policy approvata.
- [ ] Catturare rete e dimostrare zero richieste dal detection path.
- [ ] Ispezionare logcat release e dimostrare assenza di dati finanziari.
- [ ] Testare Keystore invalidation e database error.
- [ ] Testare restore `.aura` e cloud backup con transazioni create da candidati.
- [ ] Eseguire screen-reader manuale.
- [ ] Verificare 320/360/390/430 px nella WebView.
- [ ] Verificare light/dark e reduced motion.
- [ ] Aggiornare privacy policy.
- [ ] Preparare Data Safety.
- [ ] Preparare prominent disclosure e screenshot/store copy.
- [ ] Eseguire review Google Play policy e spyware-policy-aware.
- [ ] Confermare screening DPIA e governance privacy.
- [ ] Eseguire security review del bridge e componenti esportati.
- [ ] Eseguire release-readiness review con rollback.

Exit criteria:

- nessun blocker tecnico, privacy, security o accessibility resta aperto;
- la precisione del corpus soddisfa il gate approvato;
- evidenze fisiche dimostrano comportamento background e cancellazione;
- Play artifacts e disclosure descrivono il comportamento reale;
- rollback e disattivazione sono documentati.

### M10. Pilot, Beta E Release Progressiva

Goal: validare utilità e precisione senza ampliare prematuramente lo scope.

Stato: **Non iniziato**

Dipendenze: M9.

#### Fase A — Internal build

- [ ] Limitare l'accesso ad account di sviluppo.
- [ ] Abilitare una sola app di test o banca approvata.
- [ ] Usare soltanto exact-template notifications.
- [ ] Non attivare telemetria custom.
- [ ] Raccogliere feedback manuale e redatto.
- [ ] Registrare falsi positivi, falsi negativi e modifiche senza contenuti grezzi.
- [ ] Verificare rollback disabilitando il listener e mantenendo la PWA intatta.

#### Fase B — Beta chiusa

- [ ] Definire partecipanti e informativa.
- [ ] Mantenere feature off finché ogni utente non completa la disclosure.
- [ ] Supportare massimo 1-2 app approvate.
- [ ] Offrire segnalazione volontaria senza allegato automatico.
- [ ] Revisionare regole soltanto da esempi redatti.
- [ ] Misurare precisione attraverso classificazione manuale approvata.
- [ ] Interrompere il pilot se compare un falso positivo sensibile o leakage.

#### Fase C — Produzione opt-in

- [ ] Confermare gate di precisione.
- [ ] Confermare Play review e Data Safety.
- [ ] Confermare privacy owner approval.
- [ ] Pubblicare rollout percentuale controllato.
- [ ] Monitorare Play Vitals e crash senza candidate telemetry.
- [ ] Mantenere kill switch tramite release/config locale approvata, senza remote rules.
- [ ] Pubblicare runbook di rollback.
- [ ] Valutare rimborsi soltanto come iniziativa successiva.

Exit criteria:

- la funzione è utile e sufficientemente precisa nel pilot;
- non esistono leakage, commistioni account o duplicazioni;
- utenti e store ricevono disclosure coerenti;
- la PWA resta disponibile e indipendente;
- l'MVP può essere disattivato o ritirato senza perdita delle transazioni confermate.

### M11. Chiusura Documentale E Operativa

Goal: mantenere documentazione, operations e changelog allineati alla realtà.

Stato: **Non iniziato**

Dipendenze: attività cross-cutting; chiusura dopo M10.

Task:

- [ ] Aggiornare project brief.
- [ ] Aggiornare brainstorm.
- [ ] Aggiornare solution strategy.
- [ ] Aggiornare main delivery plan.
- [ ] Creare e accettare ADR Capacitor.
- [ ] Creare e accettare ADR acceptance cross-storage.
- [ ] Creare feature spec user-facing.
- [ ] Creare Android architecture note.
- [ ] Creare privacy processing record.
- [ ] Aggiornare retention e deletion documentation.
- [ ] Aggiornare Data Safety evidence.
- [ ] Creare operations/runbook.
- [ ] Documentare build, signing, release e rollback.
- [ ] Documentare aggiunta e rimozione di una regola bancaria.
- [ ] Documentare fixture redaction policy.
- [ ] Aggiornare testing strategy.
- [ ] Aggiornare `CHANGELOG.md` al rilascio.
- [ ] Registrare rischi accettati e follow-up.
- [ ] Registrare evidenza finale lint/test/build/Android QA.

Exit criteria:

- i documenti descrivono il comportamento implementato;
- onboarding di un nuovo developer Android è ripetibile;
- rollback e incident response sono eseguibili;
- privacy e Play evidence sono rintracciabili;
- non rimangono promesse documentali non implementate.

## Mappa delle dipendenze

```text
M0 Decision freeze
├── M1 Capacitor foundation
│   └── M2 Platform/auth/lifecycle
│       ├── M3 Privacy/security
│       │   └── M4 Listener/settings
│       │       └── M5 Rule engine
│       │           └── M6 Room/dedupe/retention
│       │               └── M7 Bridge/deep links
│       │                   └── M8 React/review/transaction
│       └───────────────────────────────┘
└── M11 Documentation travels with every milestone

M1-M8
→ M9 hardening and compliance
→ M10 internal → closed beta → production opt-in
→ M11 closure
```

Regole:

- M1 può iniziare dopo M0 e l'installazione del toolchain Android; usa solo sorgenti sintetiche.
- B-001 e B-005 bloccano la prima build firmata/distribuita, non la build debug locale.
- B-002, B-003 e B-006 bloccano ogni lettura o corpus di notifiche finanziarie reali.
- M4 non può leggere notifiche reali prima del gate privacy/security M3.
- M8 non può creare transazioni prima che M6 definisca idempotenza e recovery.
- M10 non può iniziare prima delle verifiche fisiche e privacy owner approval M9.

## Workstream trasversali

| Workstream | Attività continua | Owner |
|---|---|---|
| Product | Scope, app supportate, UX, criteri di utilità | Product owner |
| Android | Capacitor, listener, Room, bridge, release | Android owner |
| React | Adapter, provider, review, AppData integration | React owner |
| Security | Threat model, WebView, bridge, Keystore, intents | Security owner |
| Privacy/GDPR | Data inventory, retention, deletion, DPIA screening | Privacy owner |
| QA | Fixture, automation, device matrix, regression | QA owner |
| Release | Play Console, signing, rollout, rollback | Release owner |
| Documentation | ADR, spec, runbook, changelog | Feature owner |

Gli owner nominativi Release, Privacy, Security e QA devono essere assegnati prima del gate che richiede la loro approvazione. Lo spike sintetico può usare i maintainer come owner tecnici temporanei, senza estendere questa responsabilità ad approvazioni legali o di release.

## Matrice di test

| Livello | Target | Copertura minima |
|---|---|---|
| Kotlin unit | Normalizer | Unicode, spazi, lunghezza, formati EUR |
| Kotlin unit | Rule engine | Accepted, rejected, ambiguous, invalid rule |
| Kotlin unit | Fingerprint | Tecnico, semantico, cross-source, time bucket |
| Kotlin unit | Retention | Pending, ignored, accepted, expired |
| Room | DAO/schema | Insert, upsert, unique, migration, cleanup |
| Android integration | Listener | Package gate, lifecycle, revoked access |
| Android integration | Security | Exported components, intents, backup exclusion |
| Plugin contract | Kotlin↔TypeScript | DTO, error codes, invalid arguments |
| React unit | Mapper | Candidate→Transaction e data locale |
| React component | Setup | Disclosure, permission, app selection |
| React component | Review | Confirm, edit, ignore, expired |
| React integration | Acceptance | Begin, persist, complete, recovery |
| Archive/cloud | Compatibility | Transazioni standard, pending candidates esclusi |
| Web regression | PWA | Auth, storage, notification, install, routes |
| Android E2E | Happy path | Test notification→Room→Aura→review→Transaction |
| Android E2E | Failure | DB fail, permission revoke, process kill |
| Physical QA | OEM/API | Background delivery, lock screen, reboot |
| Privacy QA | No leakage | Network, logcat, backup, crash breadcrumbs |
| Accessibility | React/WebView | Screen reader, focus, touch, contrast |

## Fixture policy

Le fixture sono codice di test e devono essere trattate come potenziali dati sensibili.

Requisiti:

- usare fixture sintetiche per lo sviluppo iniziale;
- non copiare screenshot o notifiche personali nel repository;
- rimuovere nomi, account, merchant sensibili e identificatori;
- sostituire importi reali quando non essenziali;
- conservare soltanto il template necessario;
- documentare provenienza e redazione per ogni corpus reale;
- richiedere consenso e processo approvato prima della raccolta;
- non allegare automaticamente testo originale alle segnalazioni beta;
- revisionare diff e cronologia Git prima di committare;
- eliminare fixture che non hanno più una finalità di test.

## Gate quantitativi iniziali

I target iniziali sono approvati per il pilot; possono essere irrigiditi dopo il corpus reale, ma non allentati senza decisione registrata.

| Metrica | Gate proposto |
|---|---|
| Contenuto letto da package non selezionati | 0 |
| Raw notification persistita o loggata | 0 |
| Chiamate di rete dal detection path | 0 |
| OTP/rifiuti/annullamenti notificati nel corpus | 0 |
| Precisione exact-tier nel pilot | almeno 95% |
| Falsi positivi exact-tier | massimo 2% |
| Doppie transazioni da callback/retry | 0 |
| Parsing p95 sul device baseline | meno di 200 ms |
| Notifica Aura dal callback valido | meno di 3 secondi |
| Crash blocker listener | 0 |
| Cancellazione verificata dopo purge | 100% dei test |

Non introdurre analytics remote soltanto per misurare questi gate. Nel pilot le misure possono derivare da fixture, QA e feedback volontario redatto.

## Privacy, GDPR, Security, AI E Costi

### Dati personali toccati

- package/app sorgente;
- titolo e testo grezzo, soltanto in memoria;
- importo;
- valuta;
- merchant facoltativo;
- timestamp;
- preferenze delle app monitorate;
- decisione utente su candidato;
- transaction ID UUID prenotato nel journal di accettazione e poi usato come normale ID del ledger.

### Diritti e lifecycle

- accesso: mostrare candidati gestiti sul dispositivo;
- rettifica: review consente modifica prima della transazione;
- cancellazione: candidate purge, reset locale/totale, logout/cambio owner;
- portabilità: candidati pendenti esclusi; la transazione confermata resta una normale riga del ledger;
- retention: automatica e documentata;
- fine utilizzo: disabilitazione e revoca non devono lasciare raccolta attiva;
- cambio account: purge o isolamento verificato.

### GDPR

- il processing locale resta trattamento di dati personali;
- il consenso al permesso Android non determina automaticamente la base giuridica GDPR;
- controller/processor role, lawful basis, RoPA/data inventory e retention richiedono privacy owner;
- il monitoraggio continuativo di notifiche finanziarie richiede screening DPIA;
- non dichiarare certificazione o conformità legale finché i gap del repository non sono chiusi.

### Security

- least privilege a livello applicativo;
- no broad app visibility;
- no raw data bridge;
- no production logs dinamici;
- no remote WebView code;
- no cleartext traffic non necessario;
- native components non esportati salvo necessità documentata;
- immutable PendingIntent;
- owner isolation;
- idempotent acceptance;
- backup exclusion;
- private lock-screen notification.

### AI governance

- nessun AI provider nel detection path;
- nessun prompt, training, inference o model output;
- regressione obbligatoria che impedisce routing a Gemini;
- AI Act workstream non applicabile salvo futura modifica dello scope.

### Observability

Consentito:

- error code costanti;
- rule version in debug fixture test;
- durata parsing aggregata in test;
- Play Vitals per crash generici;
- evidenza manuale di QA.

Vietato:

- testo, merchant, importo, package associato all'utente;
- candidate ID in analytics remote;
- auth token;
- fingerprint;
- allegato automatico nelle segnalazioni.

### FinOps

- nessun nuovo provider usage-based;
- nessun backend necessario;
- nessun admin cost panel richiesto per l'MVP;
- principali cost driver: sviluppo Kotlin, device QA, manutenzione delle regole e Play release operations;
- rivalutare cost visibility soltanto se vengono aggiunti remote rules, analytics, crash tooling custom o backend.

## Risk register

| ID | Rischio | Probabilità | Impatto | Mitigazione | Owner | Stato |
|---|---|---|---|---|---|---|
| R-001 | Falsi positivi disturbano l'utente | Media | Alta | Exact-tier, corpus per app, pilot ristretto | Product/QA | Aperto |
| R-002 | Cambi formato notifiche banca | Alta | Media | Regole versionate, fixture, release rapida | Android/QA | Aperto |
| R-003 | Lettura accidentale package non selezionato | Bassa | Critica | Gate prima extras, instrumentation test | Security/Android | Aperto |
| R-004 | Raw content finisce nei log/crash | Media | Critica | DTO minimizzati, R8, logcat QA | Security | Aperto |
| R-005 | Android backup trasferisce Room | Media | Alta | Backup/data extraction exclusion test | Android/Security | Aperto |
| R-006 | Candidati visibili dopo cambio account | Media | Critica | owner hash, purge/logout integration | Security/React | Aperto |
| R-007 | Doppia transazione tra Room e AppData | Media | Alta | acceptance journal e transaction ID prenotato | Android/React | Aperto |
| R-008 | Login Google fallisce in WebView | Bassa | Alta | configurazione OAuth debug verificata e bridge Credential Manager invocato su API 36; resta prova end-to-end su provider/account Google reale | Android | Mitigazione in corso |
| R-009 | Play Store considera disclosure insufficiente | Media | Alta | prominent disclosure, review pre-release | Privacy/Release | Aperto |
| R-010 | Lock screen espone spese | Media | Alta | private/public redacted notification | UX/Security | Aperto |
| R-011 | OEM termina o limita il listener | Media | Media | device matrix, stato visibile, recovery | QA/Android | Aperto |
| R-012 | PWA regredisce dopo Capacitor | Media | Alta | adapter e web regression gate | React/QA | Aperto |
| R-013 | Fixture contengono dati reali | Media | Critica | synthetic-first, redaction review | Privacy/QA | Aperto |
| R-014 | Scope entrate diventa ambiguo | Alta | Media | pagamenti EUR soltanto nel pilot | Product | Aperto |
| R-015 | Keystore invalidation perde candidati | Bassa | Media | fail-safe purge e messaggio utente | Android | Aperto |
| R-016 | Bridge esposto a codice WebView compromesso | Bassa | Critica | bundled assets, CSP, navigation allowlist | Security | Aperto |
| R-017 | Regole regex causano ReDoS | Bassa | Alta | pattern review, input cap, benchmark | Android/Security | Aperto |
| R-018 | Dati pendenti entrano in archive/cloud | Bassa | Alta | repository separato e regression test | React/QA | Aperto |
| R-019 | Android 16-only limita i dispositivi eleggibili | Alta | Media | trade-off esplicito D-113; misurare il reach nel pilot prima di ampliare il supporto | Product | Accettato per il pilot |
| R-020 | Dependency audit di produzione non verde | Media | Alta | triage dedicato, aggiornamenti compatibili e regression test prima della release | Security/React | Aperto |

## Definition Of Ready

### Spike sintetico

Lo spike sintetico è ready sul piano decisionale e M1 è iniziato. Il workflow
CLI dispone di JDK 21, Android SDK API 36 ed emulatore API 36. Android Studio
resta facoltativo finché non è necessario un flusso IDE. Prima di procedere
oltre M1 resta richiesta la verifica completa che debug/E2E non contengano
credenziali o signing material di produzione.

### Sorgenti reali e pilot

L'implementazione su notifiche finanziarie reali e il pilot non sono ready finché:

- B-001, B-002, B-003, B-005 e B-006 sono chiusi;
- package ID e app pilota sono verificati;
- privacy owner e security owner sono assegnati;
- screening DPIA e data inventory sono registrati;
- il processo fixture reale è approvato;
- un device fisico rappresentativo è aggiunto alla matrice;
- disclosure e Data Safety sono approvate dagli owner competenti.

## Definition Of Done

L'MVP è done soltanto quando:

- PWA e Android condividono il dominio senza regressioni;
- la build Android è firmabile e riproducibile;
- auth, logout e cambio account sono verificati;
- la feature è off di default;
- disclosure precede l'accesso;
- package non selezionati vengono scartati prima degli extras;
- parsing è locale, deterministico e offline;
- raw content non è persistito, loggato, backuppato o trasmesso;
- card/account identifiers non vengono elaborati;
- candidate repository è migrabile, deduplicato e soggetto a retention;
- acceptance cross-storage è idempotente e recovery-safe;
- lock screen è redatta per default;
- reset/logout/cancellazione effettuano purge verificato;
- candidati pendenti non entrano in archive/cloud;
- test Kotlin, Room, plugin, React, web E2E e Android E2E passano;
- device QA e accessibility QA sono registrati;
- privacy, security e Play review sono chiuse;
- rollout e rollback sono documentati;
- changelog, spec, ADR, runbook e privacy docs descrivono la release reale.

## Protocollo Di Aggiornamento Progress

Quando una task cambia:

1. aggiornare la checkbox;
2. aggiornare lo stato del milestone;
3. aggiornare la dashboard;
4. aggiungere una riga al Progress Log;
5. collegare evidenza concreta: file, test, screenshot, build o decisione;
6. registrare blocker e owner;
7. non rimuovere task incompiute: spostarle esplicitamente in follow-up o non-scope.

Formato nota raccomandato:

```text
YYYY-MM-DD — Mx — breve descrizione
Evidence: file/comando/risultato
Risks: nuovi o chiusi
Next: prossima task verificabile
```

## Progress Log

| Data | Milestone | Aggiornamento | Evidenza | Prossimo passo |
|---|---|---|---|---|
| 2026-07-25 | M0 | Valutata la proposta e approvata la direzione PWA + Android Capacitor con parsing locale e conferma utente | Analisi repository e documento di proposta | Chiudere package ID, app pilota, scope e governance |
| 2026-07-25 | M0 | Creato il progress plan dettagliato | Questo documento | Allineare project brief, brainstorm, strategy e main delivery plan |
| 2026-07-25 | M0 | Allineati gli artifact obbligatori di discovery e il record privacy | Project brief, brainstorm, solution strategy, delivery plan e processing record | Congelare architettura e contratto di accettazione |
| 2026-07-25 | M0 | Accettate architettura Capacitor e accettazione idempotente con transaction ID prenotato | ADR 0002, ADR 0003 e feature spec | Separare i gate pre-pilot dallo spike sintetico |
| 2026-07-25 | M0 | Chiuse le decisioni di scope, SDK, auth, retention, backup, lock screen, ambienti e distribuzione | D-101–D-112; B-004 e B-007 chiusi | Installare toolchain Android e iniziare M1 |
| 2026-07-25 | M0 | Baseline regression verde; E2E corrente non verde per stato Guided Tour nella fixture | `npm run test:regression`; tentativo `npm run test:e2e` | Correggere separatamente la fixture E2E prima del gate di regressione M9 |
| 2026-07-25 | M0 | Review GDPR/security completata sul piano; legal source register, ruolo, base giuridica e DPIA restano esplicitamente non approvati | Processing record e gate B-006 | Nessuna sorgente reale prima dell'approvazione privacy |
| 2026-07-25 | M1 | Installato il toolchain CLI Android, aggiunti Capacitor 8 e il progetto Android versionato, isolati PWA install/service worker tramite capability runtime | `capacitor.config.ts`, `android/`, `src/platform/`, script npm e Gradle | Completare storage, auth e flussi dati nella WebView |
| 2026-07-25 | M1 | Build debug finale avviata su emulatore Android 16/API 36; baseline di supporto ristretta ad API 36 per decisione D-113 | APK 11,6 MB, cold start 1,433 s, screenshot e logcat locale; min/compile/target 36 | Completare storage/auth e registrare dispositivo fisico in M9 |
| 2026-07-25 | M1/M2 | Implementati isolamento Firebase/OAuth debug fail-closed e plugin Kotlin Credential Manager; il bridge viene invocato su API 36 e gestisce `NoCredential` senza crash | Scan bundle senza config Firebase production, 61 file/315 test, Gradle 198 task, APK 14,3 MB, cold start 1,055 s | Fornire OAuth/Firebase debug reale e verificare login, UID, logout e session recovery |
| 2026-07-26 | M1/M2 | Implementati runtime bridge first-party, resume, deep link allowlisted, target pre-login, boundary notifiche web/native e coordinamento purge per logout/reset | `android:verify:webview`, 2 instrumentation test API 36, 68 file/332 test Vitest, Gradle test/lint/assemble verde | Verificare login positivo, UID/allowlist, session lifecycle e flussi archive/CSV autenticati |
| 2026-07-26 | M2/M3 | Login Google positivo riferito dall'utente; implementati owner boundary HMAC, purge journaled, AES-GCM/ID opachi, backup exclusion, WebView/CSP e release hardening senza introdurre il listener | 69 file/337 test Vitest, build Vite, 145 task Gradle, 6 instrumentation test API 36 e `android:verify:webview` verdi | Ottenere privacy-owner/DPIA; completare lifecycle auth e QA fisica prima di M4 reale |
| 2026-07-26 | M4 | Implementati listener system-bound, stato opt-in/OS, settings owner-scoped, catalogo sintetico e gate package-before-extras con test source APK separata | 70 file/341 test Vitest, build Vite, 192 task Gradle, 10 instrumentation test API 36; test APK disinstallata automaticamente | Verificare process recreation e reboot; nessuna sorgente reale prima di privacy/DPIA e selezione prodotto |

## Release Evidence

La baseline M0 e le prime evidenze M1 sono registrate; le evidenze mancanti saranno aggiunte durante M1-M10.

| Evidenza | Stato | Riferimento |
|---|---|---|
| TypeScript lint | Passato | `npm run test:regression`, 2026-07-26 |
| Vitest | Passato | 70 file e 341 test, 2026-07-26 |
| Web production build | Passato | Build Vite inclusa in `npm run test:regression`, 2026-07-26 |
| Web/PWA E2E | Baseline non verde | `npm run test:e2e`: 1 passato, 6 falliti, 1 interrotto, 23 non eseguiti; tutti i fallimenti osservati attendono `Export complete archive` con Guided Tour aperta |
| Gradle unit test | Passato | `testDebugUnitTest`, JDK 21/API 36, 2026-07-26 |
| Android instrumentation | Passato | 10 test `:app:connectedDebugAndroidTest` su emulatore Android 16/API 36, inclusa sorgente sintetica end-to-end, 2026-07-26 |
| Android lint | Passato | `lintDebug`, 2026-07-26 |
| Android debug build | Passato | `assembleDebug`, `com.staituned.aura.debug`, min/target 36; cold start 1,571 s nel test WebView del 2026-07-26 |
| Android WebView runtime | Passato | `android:verify:webview`: local origin, reload, localStorage, IndexedDB, attachment store e deep link |
| Android auth bridge | Parziale positivo | Configurazione debug verificata, `NoCredential` gestito senza crash e login positivo riferito dall'utente il 2026-07-26; lifecycle, ruolo e account switch restano aperti |
| Debug Firebase isolation | Passato | Build rifiutata senza `VITE_ANDROID_FIREBASE_*`; bundle sintetico verificato senza API key, auth domain, sender ID o app ID production |
| Signed internal build | Non eseguito | Da registrare |
| Physical device matrix | Non eseguito | Da registrare |
| Network leakage check | Non eseguito | Da registrare |
| Logcat leakage check | Non eseguito | Da registrare |
| Android backup exclusion | Positivo engineering | `allowBackup=false` verificato sul manifest installato e regole cloud/D2D deny-all coperte da test; prova OEM fisica resta M9 |
| Logout/reset purge | Primitive verificate | Boundary fail-closed e purge journaled verificati per logout, owner change, reset locale e cancellazione totale; integrazione Room resta M6 |
| Accessibility review | Non eseguito | Da registrare |
| Privacy owner approval | Non ottenuta | Da registrare |
| Security review | Engineering M3-M4 completata, owner aperto | Threat model, listener manifest e package-before-extras gate registrati; approvazione security owner e componenti M7 restano aperti |
| Play/Data Safety review | Non eseguita | Da registrare |
| Rollback rehearsal | Non eseguito | Da registrare |
| Production dependency audit | Non verde | `npm audit --omit=dev`: 18 advisory; triage richiesto prima della release |

## Follow-up Post-MVP

Da valutare soltanto dopo evidenza positiva del pilot:

- rimborsi;
- entrate da bonifico;
- trasferimenti P2P;
- più valute;
- mapping merchant-categoria persistente;
- remote rules firmate e rollbackabili;
- confronto con import estratto conto;
- diagnostica volontaria esportabile;
- iOS attraverso fonti dati alternative;
- assegnazione della transazione a conto/carta;
- riconciliazione tra candidate detection e transazioni importate.

Ogni follow-up che introduce rete, AI, nuovi provider, account aggregation o dati aggiuntivi richiede una nuova decision analysis e l'aggiornamento di privacy, security, cost e governance.
