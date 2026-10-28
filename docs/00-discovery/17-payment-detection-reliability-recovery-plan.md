# Aura Android — Payment Detection Reliability Recovery Plan

**Data:** 2026-10-28  
**Stato:** Piano operativo proposto, non implementazione completata  
**Priorità:** P0 — blocco della promozione di nuove release del detector fino alla verifica dell'affidabilità  
**Baseline esaminata:** main @ 2140c17f240a2aec2bfcf5a0406e1f42f44d3a81 (Aura 1.0.22 su Internal Testing)  
**Correlazioni:** [tracker payment detection](./11-android-payment-detection-progress-plan.md), [specifica MVP](../specs/android-payment-detection-mvp.md), [ADR candidate acceptance](../../adr/0003-aura-payment-candidate-acceptance.md), [runbook](../03-operations/android-payment-detection-runbook.md), [QA release](../07-qa/android-payment-detection-release-acceptance.md), [PR #56](https://github.com/daniele21/personal-budget/pull/56).

> Il documento coordina la correzione della reliability del detector. Non autorizza di per sé merge, pilot, rollout o trattamento aggiuntivo di notifiche reali. La causa esatta sul dispositivo del tester rimane **non dimostrata**. Non trattare il passaggio dei test su emulatore come prova di funzionamento su un OEM fisico.

## 1. Incidente e outcome atteso

**Osservazione (27–28 ottobre 2026):** il tester riceve notifiche bancarie/Wallet, ma nella build 1.0.22 non vede nuovi candidati in Review né alert Aura. Dopo **Repair listener** e **Refresh diagnostics** lo stato è **Connected** e tutti i contatori mostrano zero, incluso **Successful active-notification snapshots**. Non è stato acquisito un report affidabile della lettura effettiva del listener, né una riproduzione fisica con log redatti.

**Outcome:** ogni notifica compatibile effettivamente consegnata da Android deve avere un esito diagnostico distinguibile (filtrata, ignorata, esatta, review, aggiornata, duplicata, errore); ogni candidato realmente creato deve risultare in Review e produrre l'alert privato se autorizzato. Lo stato UI deve riferire la salute verificata e non una semplice connessione al servizio. I limiti di Android sulle notifiche mai consegnate o già rimosse vanno mostrati esplicitamente; non promettere copertura del 100%.

**Fuori scope:** introdurre Accessibility Service, SMS, Open Banking, foreground service permanente, invio di contenuti notifiche/finanziari alla rete, logging raw, AI/LLM nel parser o creazione automatica di transazioni.

## 2. Distinguere fatti, rischi e ipotesi

| ID | Evidenza/area | Classificazione | Owner canonico |
|---|---|---|---|
| F-01 | La UI indica Connected quando esiste un endpoint debole del listener, senza attestare callback/snapshot recenti. | Difetto verificato nel codice; causa dell'incidente non dimostrata | NotificationAccessController + PaymentDetectionListenerRuntime + UI |
| F-02 | reconcileActiveNotifications() può restituire HEALTHY se recoveryWindowStartedAt() è nulla o fallisce, senza leggere activeNotifications. | Difetto verificato nel codice | BaseAuraNotificationListenerService |
| F-03 | Il refresh React esegue recoverAcceptance() prima dello status; un errore impedisce la lettura dei diagnostici e può lasciare stato precedente. | Difetto verificato nel codice | PaymentDetectionProvider |
| F-04 | L'heartbeat autonomo è riarmato soltanto in seguito a RECONCILED; l'errore può interrompere quel ciclo. | Difetto verificato nel codice | BaseAuraNotificationListenerService |
| F-05 | La fingerprint tecnica usa source + notificationKey: due operazioni distinte con chiave Android riutilizzata possono aggiornare/sopprimere un candidato. | Rischio logico verificato; riutilizzo effettivo da parte della banca da dimostrare | PaymentCandidateRepository / DAO |
| F-06 | activeNotifications non è uno storico: una notifica persa e poi rimossa non può essere recuperata con una snapshot. | Limite architetturale Android | Listener / recovery |
| F-07 | Alcune forme positive Intesa contenenti footer di saldo possono essere scartate; la PR #56 contiene una correzione circoscritta. | Caso deterministico nel parser; indipendente dagli zero upstream | PaymentRuleEngine |
| H-01 | Filtri Android, generazione legacy/V2, permessi effettivi o restrizioni OEM impediscono callback/snapshot su device. | Ipotesi da verificare su dispositivo reale | NotificationAccessController / QA |
| H-02 | Replace di unique WorkManager immediate e cicli rebind/teardown possono ritardare interventi o perdere task nell'executor. | Rischio da riprodurre, non root cause confermata | RecoveryScheduler / PaymentNotificationGate |
| H-03 | Candidate store/Keystore, transizioni account, expiry o lettura UI possono nascondere candidati già creati. | Ipotesi distinta, da escludere tramite stadi diagnostici | Repository / bridge / Provider |

**Regola di triage:** se tutti i contatori sono zero, **non** attribuire automaticamente il problema al parser o a mancati callback: verificare prima se il refresh ha prodotto dati **freschi**, se è stato tentato un probe e perché lo snapshot è stato omesso.

## 3. Contratti e invarianti da preservare

- Il listener legge **solo package metadata** prima di aver verificato sorgente supportata, opt-in e selezione dell'app. Titolo/testo/bigText restano esclusivamente in memoria per la durata del parsing.
- Nessun raw notification text, importo, merchant, carta, account, fingerprint o identificatore di notifica in log, analytics, rete, backup o report automatici. Telemetria locale solo aggregata, redatta, a retention minima e delimitata dall'owner; nuove persistenze diagnostiche richiedono review privacy.
- Opt-in off per default; revoca, logout, cambio owner, reset e delete interrompono o eliminano dati nativi secondo il contratto esistente.
- Room è la fonte di verità dei **candidati**, AppData/React quella delle **transazioni**. Mai scrivere una transazione automaticamente dal listener. Preserve acceptance token, pending/accepting, tombstones, recovery idempotente.
- Exact e Review producono alert privato **soltanto per nuovi candidati** se i permessi lo consentono; ripetizioni reali non generano spam. Mai promuovere un caso incerto a EXACT per nascondere un bug.
- Dispositivi o API non testati non diventano supportati implicitamente. Rispettare la generazione legacy/V2 e la privacy di utenti non selezionati.

## 4. Backlog eseguibile e ordine

Stato iniziale degli item: **Da avviare** salvo evidenza esplicita. Ogni item richiede PR con ownership, test aggiornati, diff completo e gate eseguiti sulla revisione finale.

### Fase R0 — Osservabilità affidabile e discriminazione della causa (P0; prima di modifiche ulteriori al parser)

- [ ] **R0-01 — Snapshot diagnostico indipendente.** Separare refresh status/diagnostics da recoverAcceptance(), listCandidates() e listSupportedApps(); un fallimento di una fonte non impedisce di visualizzare l'esito delle altre. UI con risultato aggiornato, timestamp relativo/sessione del probe, stato di caricamento, errore esplicito e indicazione di dato stale. Test React su failure parziali e refresh ripetuti. Owner: Provider + bridge.
- [ ] **R0-02 — Stato del listener basato su prove.** Distinguere concessione accesso, generazione effettiva, endpoint bound, ultimo probe tentato e risultato, snapshot letto/omesso, callback arrivato, rebind richiesto e rebind effettivamente osservato. Non etichettare come “healthy” l'assenza di prova. Status non dedotto dalla presenza di WeakReference. Owner: Runtime / AccessController / bridge / UI.
- [ ] **R0-03 — Esiti tipizzati del probe.** Sostituire il fallace ritorno HEALTHY quando recoveryWindowStartedAt() manca/solleva eccezione con risultati distinti (disabilitato, no owner, no access, errore store, timeout, snapshot riuscito, rebind richiesto). Le classificazioni non devono esporre contenuti. Test unit/strumentali delle uscite anticipate. Owner: listener / coordinator.
- [ ] **R0-04 — Diagnostica end-to-end per stadio.** Contatori content-free per ingresso di package supportato, gate di generazione/selezione, snapshot, envelope, reason tier, created/updated/duplicate, alert posted/failed, persistenza e UI read failures. Assicurarsi che reset di processo/owner e versione del runtime siano evidenti e che un nuovo controllo sia distinguibile da un valore vecchio. Verificare l'esito dei refresh con test UI; evitare logging raw. Owner: runtime / plugin / Provider.
- [ ] **R0-05 — Runbook di raccolta evidenze reale.** Diagnosi guidata su build firmata, con soli stati/counter redatti; non chiedere reinstallazione o cancellazione dati per riprodurre. Dare una griglia decisionale: nessuna snapshot → lifecycle/bridge; snapshot sì ma callback no → OS/filter/package; envelope sì ma candidate no → parser/store/dedupe; created sì ma Review no → bridge/UI. Owner: QA/Android.

**Exit R0:** su emulatore e con test bridge/React sono riprodotti e chiaramente differenziati Connected + snapshot assente, refresh fallito/stale, snapshot vuoto ma riuscito, callback mancante e candidato creato senza alert. Un nuovo screenshot della diagnostica deve attribuire **una fase**, non fingere di provare la causa OEM.

### Fase R1 — Ciclo di vita e recupero robusto (P0; dopo R0)

- [ ] **R1-01 — State machine di binding/recovery.** Rivedere in un unico owner connessione, generation gating, legacy retirement, synchronizeComponentLifecycle(), rebind, timeout e probe. Ogni richiesta di rebind deve concludersi con successo osservato o stato pending/failure; nessun successo anticipato. Proteggere da overlap fra heartbeat, foreground getStatus e worker; limitare retry e churn. Owner: NotificationAccessController + RecoveryCoordinator + listener.
- [ ] **R1-02 — Heartbeat e WorkManager.** Riarmare il controllo dopo errori transitori finché detection è enabled, con backoff limitato e cancellazione sicura; evitare che runSoon(REPLACE) cancelli sistematicamente recuperi equivalenti in corso. Osservare vincoli reali su scheduling/background; niente promesse hard real-time. Owner: RecoveryScheduler / listener.
- [ ] **R1-03 — Teardown e executor.** Testare callback in coda mentre onDestroy/retireBinding/forceRebind chiudono il gate; garantire elaborazione oppure una ragione content-free dello scarto. Non leggere extras prima del gate di privacy. Owner: PaymentNotificationGate / listener.
- [ ] **R1-04 — Limiti dello snapshot.** Misurare filtri Android effettivi, activeNotifications ancora disponibili, recovery window, bounded 128 item/14 giorni e notifiche rimosse. Distinguere “nessuna notifica attiva” da “snapshot non eseguita”. Migrazione V2 verificata senza doppia consegna e senza violare la revoca. Owner: listener / Android QA.

**Exit R1:** test automatici su API36 riproducono perdita del callback con servizio bound, blackout, reconnect, Android reboot, process kill, revoke/regrant e race callback/rebind, compreso nessun recovery loop incontrollato. Il detector deve tornare in stato verificato quando il SO consente la lettura, oppure esporre la causa senza mentire.

### Fase R2 — Identità evento, deduplicazione e repository (P0/P1; può procedere in parallelo a R1 dopo R0)

- [ ] **R2-01 — Spec identità pagamento.** Separare “aggiornamento dello stesso Android notification event” da “nuova transazione con stessa notificationKey”. Definire esplicitamente invarianti per contenuti strutturati differenti, postTime, merchant opzionale, importo, riuso key, confermato/ignorato e cross-source; preservare privacy e time-bound dedupe. Evitare schema migration senza contratto approvato. Owner: domain/repository + ADR 0003.
- [ ] **R2-02 — Persistenza e consumer.** Implementare la soluzione canonica nel repository/DAO e aggiornare listener, alert e bridge soltanto dopo la spec; garantire che ogni pagamento realmente distinto non sovrascriva pending o venga oscurato da un tombstone, ma gli aggiornamenti del medesimo evento rimangano idempotenti. Owner: PaymentCandidateRepository.
- [ ] **R2-03 — Verifiche di integrità/visibilità.** Test su owner transition, recovery acceptance, expiry, Keystore failure, Room reopen e render Review in presenza di errori; distinguere “zero pending” da “impossibile leggere i pending”. Nessuna cancellazione distruttiva senza contratto privacy. Owner: repository + bridge + Provider.

**Exit R2:** sequenze di due pagamenti distinti con notificationKey riutilizzata producono **due candidati**; gli aggiornamenti dello stesso pagamento producono **uno**; confermati/ignorati non sopprimono acquisti successivi; regressioni negative sulla privacy, race e acceptance coperte.

### Fase R3 — Parser e notifiche Aura (P1; dopo R0 e contratto dedupe)

- [ ] **R3-01 — Integrare con criterio la PR #56.** Riutilizzare la correzione Intesa del footer saldo e i counters solo dopo allineamento ai nuovi esiti tipizzati R0; aggiornare fixtures/versione e rimuovere sovrapposizioni. Non considerare la PR #56 soluzione per zero callback. Owner: PaymentRuleEngine + Runtime.
- [ ] **R3-02 — Variazioni reale-formato minimizzate.** Coprire titulo/testo/bigText, notifiche troncate, textLines/group summaries e messaggi di annullamento/rifiuto, con fixture **sintetiche e redatte**, senza acquisire raw banking notifications nel repo. No exact match senza evidenza positiva sufficiente; mantenere REVIEW per ambiguità. Owner: envelope/normalizer/rules.
- [ ] **R3-03 — Alert vs candidato.** Garantire che il fallimento POST_NOTIFICATIONS/channel non impedisca persist o Review; notificare soltanto Created; test di posted/blocked e bridge. Owner: notifier + repository + UI.

**Exit R3:** nessuna falsa entrata in ledger, negative fixtures ancora ignorate, positive varianti diventano EXACT/REVIEW secondo contratto, candidati già presenti non vengono ri-allertati automaticamente all'upgrade.

### Fase R4 — Evidenza esatta, dispositivo reale e promozione (release blocker)

- [ ] **R4-01 — Prove deterministiche.** Per ogni PR usare il selector repo (se presente) o valutazione esplicita blast radius. R0-R3 toccano runtime/bridge/Room/lifecycle/privacy: **STRONG**, elevare a **FULL** soltanto se cambia build/toolchain/scope globale oppure il selector lo richiede. Eseguire test Kotlin/unit, lint, Android API36 instrumentation, background listener verifier, debug/release + R8, regression React/E2E dei consumer e test di compatibilità dopo merge. Quando Gradle non è disponibile localmente, usare **REMOTE_AUTOMATED** via repository-owned Internal testing preflight; non delegare test deterministici all'utente. Ogni evidenza deve riferirsi a esatto head/base.
- [ ] **R4-02 — Test fisico, realmente rappresentativo.** Build **release firmata da Play Internal Testing**, installata come update sopra 1.0.22 preservando i dati. Android 16 stock + almeno un OEM rappresentativo, con permessi/filter/generazione verificati, app in background, schermo bloccato, riavvio, idle prolungato (es. almeno 24 ore), battery restrictions, cambio app selezionata, revoke/regrant. Test con sorgente controllata e, solo se autorizzati, notifiche reali di pagamenti che avvengono naturalmente: **non chiedere acquisti artificiali**. Nessuna raccolta automatica di raw payload. Evidence manuale e device-specific classificata **REAL_ENVIRONMENT**.
- [ ] **R4-03 — Matrice per stadio.** Per ogni scenario redatto registrare variante release, API/build/OEM, consent/grant/effective generation, esito probe, snapshot, callback, processed, tier, persistenza, alert, visualizzazione Review e conferma esplicita. L'assenza di una notifica rimossa non è falsa “garanzia di ripristino”. Ripetere con due pagamenti ravvicinati e chiave riutilizzata nella harness.
- [ ] **R4-04 — Gate Go/No-Go.** Non dichiarare completion finché tutti i deterministic gates sono verdi sull'**esatto HEAD** candidato, test fisici richiesti sono tracciati, incident root cause è confermata **oppure** la failure mode osservata è mitigata e verificata con evidenza riproducibile, nessuna perdita di candidato nota nei casi supportati, e owner QA/Security/Privacy/Release approvano quanto richiesto. In caso contrario: **NO-GO per nuova promozione del detector**; preservare ledger e usare feature pause/rollback già documentati. Pubblicazione e merge richiedono preflight diff e base freshness.
- [ ] **R4-05 — Documentare limiti e chiudere incident.** Aggiornare specifica, tracker 11, runbook e matrice M9 con evidenze e versioni; rimuovere claim obsoleti, lasciare rischi residui e vincoli Android espliciti. Owner: Android/QA/Release.

## 5. Ordine delle PR e dipendenze

| PR logica | Contenuto | Dipende da | Profondità prevista | Evidenza obbligatoria |
|---|---|---|---|---|
| A | R0-01..05 — truthfulness UI e probe + diagnosi | Nessuna; partire qui | STRONG (bridge + runtime) | Kotlin, JS, instrumentation, R8, React |
| B | R1-01..04 — lifecycle/recovery/teardown | A | STRONG | API36 listener verifier, reboot, races, R8 |
| C | R2-01..03 — transaction identity/Room | Spec approvata, A; in parallelo a B | STRONG | Room + acceptance + consumer compat |
| D | R3-01..03 — parser + alerts; riconciliare PR #56 | A + C per la dedupe | SCOPED/STRONG in base ai consumer effettivi | fixtures, exact/review, notification tests |
| E | R4-01..05 — release evidence, privacy/QA approvals | A-D | STRONG, FULL solo se giustificato | exact-main preflight + reale ambiente |

La PR #56 esistente resta **draft, non distribuita**: ha validazione automatica positiva ma non copre R0-R2. Il suo codice non va perso né fuso automaticamente su main; deve essere rivalutato rispetto alla soluzione coerente.

## 6. Triage operativo e failure classification

1. Verificare che un **nuovo** refresh abbia un request/result associato, senza confidare nel badge precedente. Se non è fresco, classificare **UI/bridge diagnostic stale**, non OS.
2. Se il probe non parte, controllare setting enabled, owner attivo, grant/generation, binding e worker. Distinguere DISABLED, NO_ACCESS, UNAVAILABLE, TIMEOUT, STORE_FAILURE da snapshot riuscito.
3. Se snapshot riesce con zero selected, distinguere notification tray vuoto, source non selezionata, package inatteso, filtro OS e notification rimossa: nessuna lettura raw di package non selezionati.
4. Se selected callback/snapshot ci sono ma processed=0, ispezionare gate, executor e race teardown. Se processed>0 e ignored>0, ispezionare rule IDs/reasons aggregati; se candidate created=0 con updated/duplicate>0, ispezionare fingerprint; se created>0 e UI empty, bridge/Room/acceptance.
5. Classificare failure di test prima della patch: regressione attuale, baseline preesistente, toolchain/ambiente, flaky, base stantia o assunzione di prodotto errata. Non attenuare test validi per far passare CI.

## 7. Definition of Done / criterio di successo

- [ ] Il precedente sintomo **Connected + tutti zero dopo repair/refresh** è riproducibile da un test o diagnosticato come stato esplicito; non esiste più successo “HEALTHY” senza snapshot o ragione di skip.
- [ ] La UI non presenta diagnostici stale come aggiornati e distingue chiaramente la perdita di connessione, il filtro OS, il parser, la dedupe, la persistenza e la visibilità.
- [ ] I test coprono perdita del callback con listener connected, reconnect, worker race, restart/reboot, riutilizzo notificationKey, due pagamenti veri distinti, update dello stesso evento, storage/owner boundaries e alert blocked.
- [ ] Tutti i deterministic gates richiesti sono **AUTOMATED_PREFLIGHT_CONFIRMED** sul source HEAD corretto; niente dichiarazioni basate su vecchie run.
- [ ] QA reale su dispositivi rappresentativi e signed Internal Testing allegata come evidenza separata, con privacy e approvazioni applicabili; in assenza, indicare **REAL_ENVIRONMENT PENDING** e non dichiarare “risolto”.
- [ ] Nessun cambio al modello ledger o comportamento automatico di conferma; dati non selezionati mai letti; nessun raw content scritto o trasmesso.
- [ ] Release, rollback, note e tracker riportano versione, commit, risultato ed eventuali limiti noti.

## 8. Stato iniziale e decisione

Al 2026-10-28 questo file è un **piano**. R0-R4 non sono completate. Il ramo main 1.0.22 continua a essere quello pubblicato; la [PR #56](https://github.com/daniele21/personal-budget/pull/56) è in bozza con CI automatica verde al relativo HEAD ma non prova il funzionamento reale. Non creare una 1.0.23 solo per modificare il parser: il primo passo implementativo è **R0**. La decisione di stop promozione è proposta in questo piano operativo; le decisioni di release restano agli owner e ai gate del tracker 13.
