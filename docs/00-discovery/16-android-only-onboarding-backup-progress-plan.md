# Aura Android-Only, Onboarding And Backup Progress Plan

## Scopo

Questo documento governa la transizione di Aura verso una distribuzione
Android-only, il rifacimento del primo accesso e dei tour contestuali,
l'estensione della cronologia cloud a cinque backup, la copertura mobile e di
accessibilità e la chiusura dei gap funzionali collegati.

Il piano mantiene React/Vite come runtime incorporato nell'app Capacitor e come
harness di test. `Android-only` indica quindi il canale di distribuzione del
prodotto, non una riscrittura nativa dell'intera applicazione.

Il piano non autorizza da solo una release. La promozione su Play continua a
dipendere dai gate whole-app del
[`13-android-production-release-plan.md`](./13-android-production-release-plan.md)
e dal coordinamento del
[`14-consolidated-production-readiness-plan.md`](./14-consolidated-production-readiness-plan.md).

Ultimo aggiornamento: **2026-08-04**.

Decisione corrente: **D1-D4 approvate; implementazione applicativa completata,
release bloccata dai gate esterni elencati sotto**. Il runtime browser rimane
esclusivamente un harness di regressione.

## Risultati Attesi

- Aura viene distribuita come applicazione Android; la PWA e la webapp completa
  non sono più superfici prodotto pubbliche.
- React/Vite resta il runtime locale incluso nel pacchetto Capacitor e resta
  testabile nei browser supportati.
- `aura.staituned.com` espone solo le superfici pubbliche necessarie: landing,
  privacy, supporto ed eliminazione account.
- Il primo accesso è coordinato da una sola macchina a stati e non può mostrare
  dashboard, tour o modali concorrenti prima che il workspace sia pronto.
- Il setup essenziale è breve, validato, accessibile e comprensibile da mobile.
- Il tour unico di 27 passaggi viene sostituito da tour contestuali di massimo
  tre o quattro passaggi, riavviabili e non insistenti.
- Il backup cloud conserva fino alle ultime cinque versioni cifrate e permette
  ripristino esatto, migrazione sicura e cancellazione completa.
- I reminder mantenuti nel prodotto hanno un delivery Android nativo verificato
  e non dipendono da service worker o API Notification del browser.
- Component test, integration test, E2E mobile, axe e Android instrumentation
  coprono il primo accesso e i nuovi confini di piattaforma.
- Documentazione prodotto, architettura, privacy, operazioni e release descrive
  il comportamento reale.

## Fuori Scope

- Riscrittura completa in Kotlin o introduzione di una seconda implementazione
  del dominio finanziario.
- Applicazione iOS.
- Distribuzione pubblica self-service non già autorizzata dal tracker di release.
- Notifiche push remote, Firebase Cloud Messaging o scheduler backend.
- Sincronizzazione continua multi-device del ledger.
- Modifica del contenuto di Aura Portable Archive oltre agli adeguamenti di copy
  e acceptance necessari per la nuova distribuzione.
- Nuove funzioni AI, categorizzazione remota o consulenza finanziaria automatica.

## Fonti Di Verità E Regole Di Precedenza

Durante la transizione alcuni documenti descrivono ancora la distribuzione duale
PWA + Android. Finché M0 non li riallinea, si applica questa precedenza:

1. decisioni esplicite approvate e registrate in M0;
2. project brief e solution strategy aggiornati;
3. ADR nuovi o sostitutivi;
4. specifiche di feature;
5. questo tracker per ordine di esecuzione e progress;
6. tracker 13 e 14 per promozione, beta, produzione e rollback whole-app.

Il presente piano non rende automaticamente obsolete le evidenze PWA storiche:
le classifica come evidenze di regressione del runtime React o come gate di
distribuzione da ritirare in M7.

## Legenda Stati E Ownership

### Stati

| Stato | Significato |
|---|---|
| `Non iniziato` | Nessuna attività o evidenza corrente |
| `Pronto` | Decisioni e dipendenze sufficienti per iniziare |
| `In corso` | Attività avviata; exit gate ancora aperto |
| `Bloccato` | Manca una decisione, approvazione o risorsa esterna |
| `Completato` | Task, test, review, evidenze e documentazione sono chiusi |
| `Annullato` | Scope rimosso con decisione e motivazione registrate |

### Ruoli

| Codice | Ruolo | Responsabilità |
|---|---|---|
| PO | Product owner | Scope, copy, priorità e approvazione UX |
| WO | Web/React owner | Runtime React, primo accesso, tour, backup UI e portale |
| AO | Android owner | Capacitor, notifiche locali, WebView e lifecycle |
| DO | Data owner | Contratti Firestore, migrazione, retention e cancellazione |
| QO | QA owner | Matrice automatica/manuale, triage ed evidenze |
| SO | Security owner | Regole, threat review, logging e supply chain |
| PrO | Privacy owner | Retention, diritti, disclosure e baseline legale |
| RO | Release owner | Hosting residuo, Play, rollout e rollback |
| CO | Content owner | Testi onboarding, tour, help e superfici pubbliche |

Una persona può coprire più ruoli. Ogni gate esterno deve registrare owner,
data, build/commit, risultato e posizione dell'evidenza redatta.

## Registro Delle Decisioni

| ID | Decisione | Stato iniziale | Raccomandazione | Blocca |
|---|---|---|---|---|
| D1 | Significato di Android-only | Approvata 2026-08-04; ADR 0006 | Ritirare la distribuzione PWA/webapp; mantenere React/Vite incorporato e come harness E2E | M7 |
| D2 | Struttura dei cinque backup | Approvata 2026-08-04; ADR 0007 | Documento principale per metadata/latest e documenti versionati user-scoped | M5 |
| D3 | Budget nel setup reale | Approvata 2026-08-04 | Obbligatorio nel percorso `Set up my budget`; demo come alternativa senza impegno | M2-M3 |
| D4 | Reminder generici Android | Approvata 2026-08-04 | Mantenerli e implementarli con notifiche locali native, senza push remoto | M6 |
| D5 | Strategia tour | Default reversibile | Tour contestuali per modulo, massimo quattro step, nessun auto-tour globale | M4 |
| D6 | Stato dei progress dei tour | Default reversibile | Locale per installazione/profilo; nessun nuovo dato cloud | M4 |
| D7 | Portale pubblico residuo | Già richiesto dal release plan | Landing, privacy, supporto e account deletion; nessuna webapp autenticata completa | M7 |

Per D1-D4, M0 deve registrare conferma, razionale, alternative respinte e impatto
sui documenti. Se una raccomandazione viene respinta, il piano va aggiornato
prima di iniziare la slice dipendente.

## Dashboard Del Programma

| ID | Milestone | Stato | Dipendenze principali | Owner | Exit sintetico |
|---|---|---|---|---|---|
| M0 | Congelare decisioni e strategia | Completato | Nessuna | PO, WO, AO, DO, PrO | Brief, strategy, ADR e tracker coerenti |
| M1 | Baseline e characterization | Completato | M0 per i contratti; letture eseguibili subito | WO, AO, QO | Race e gap coperti da fixture e regressioni |
| M2 | Orchestratore del primo accesso | Completato | M0, M1, D3 | WO, QO | Una sola macchina a stati governa il first-run |
| M3 | Setup essenziale e accessibile | Completato | M2 | WO, CO, QO | Setup mobile validato, accessibile e senza valori fittizi |
| M4 | Tour contestuali | Completato | M2, M3, D5-D6 | WO, CO, QO | Cinque tour brevi, riavviabili e non concorrenti |
| M5 | Cinque backup cloud | In corso | M0, M1, D2 | DO, WO, SO, PrO, QO | Codice/migrazione/deletion verdi; emulator rules e privacy approval aperti |
| M6 | Reminder Android nativi | In corso | M0, M1, D4 | AO, WO, SO, PrO, QO | Delivery nativo implementato; scheduling futuro/reboot e device QA aperti |
| M7 | Ritiro PWA e portale pubblico | In corso | M0, M3-M6, D1, D7 | WO, AO, RO, CO, PrO | Codice/portale pronti; cutover hosting non eseguito |
| M8 | Hardening mobile e accessibilità | In corso | M2-M7 | QO, WO, AO | Suite browser verde; device/TalkBack/instrumentation dedicata aperti |
| M9 | Rilascio controllato e chiusura | Bloccato | M8, tracker 13/14 | RO, PO, QO, PrO, SO | Richiede approvazioni e rollout esterni |

La percentuale non viene calcolata dal numero grezzo di checkbox. Una milestone
è `Completata` solo quando l'exit gate e le evidenze richieste sono chiusi.

## Mappa Delle Dipendenze

```text
M0 Decisioni e strategia
 |
 +--> M1 Baseline --------------------------+
 |                                         |
 +--> M2 First-run coordinator --> M3 Setup +--> M4 Tour
 |                                         |
 +--> M5 Backup x5 -------------------------+
 |                                         |
 +--> M6 Reminder Android ------------------+--> M7 Ritiro PWA/portale
                                                   |
                                                   v
                                              M8 Hardening
                                                   |
                                                   v
                                              M9 Rollout
```

M1 può iniziare con test di caratterizzazione read-only mentre M0 viene chiuso.
Nessuna modifica a schema Firestore, distribuzione o notifiche deve però partire
prima della decisione applicabile.

## M0. Congelare Decisioni, Strategia E Confini

### Obiettivo

Rimuovere il conflitto tra la nuova direzione Android-only e i documenti che
definiscono ancora la PWA come canale supportato, senza cambiare codice prima
che dati, diritti utente e rollback siano chiari.

### Task

- [x] Creare questo tracker dedicato e collegarlo al delivery plan principale.
- [x] Registrare approvazione o alternativa per D1-D4.
- [ ] Aggiornare `product/project-brief.md`: obiettivo Android-first/only,
  runtime React incorporato, portale pubblico minimo e nuovo non-scope.
- [ ] Aggiornare `docs/00-discovery/00-project-brainstorm.md` con motivazione,
  alternative e rischi della dismissione PWA.
- [ ] Aggiornare `docs/00-discovery/01-solution-strategy.md` con architettura
  target, transizione e confini del portale.
- [ ] Aggiornare `docs/00-discovery/02-delivery-plan.md` e i tracker 13/14 per
  eliminare assunzioni dual-distribution non più valide.
- [x] Creare un ADR che sostituisca esplicitamente la sezione di ADR 0002 che
  conserva la PWA, senza riscrivere la storia dell'ADR accettato.
- [x] Creare o aggiornare l'ADR del nuovo storage backup se D2 adotta documenti
  versionati.
- [ ] Definire il confine `embedded app runtime` vs `public support portal` e
  vietare `server.url` remoto nelle build Android production.
- [ ] Classificare ogni test PWA corrente come: da eliminare, da convertire in
  runtime browser regression o da sostituire con Android WebView evidence.
- [ ] Registrare il gap del legal source register, lawful basis/RoPA e privacy
  ownership senza dichiarare conformità legale non dimostrata.
- [ ] Aggiornare il registro rischi e nominare owner effettivi.

### Evidenze Richieste

- decision record D1-D7 datato;
- diff di brief, brainstorm, strategy e delivery plan;
- ADR nuovi con `Supersedes/Amends` esplicito;
- inventario PWA/web hosting e matrice keep/remove/replace;
- approvazione privacy per la variazione di retention da tre a cinque versioni.

### Exit Gate

- nessun documento fonte di verità definisce contemporaneamente la PWA come
  supportata e ritirata;
- architettura Android bundled-assets e portale pubblico sono non ambigue;
- modello backup, comportamento del setup e destino dei reminder sono decisi;
- implementazione consentita solo sulle slice coerenti con le decisioni.

## M1. Baseline, Characterization E Fixture

### Obiettivo

Trasformare i gap osservati in test riproducibili prima di refactor che
potrebbero nasconderli o introdurre regressioni.

### Task React E Primo Accesso

- [ ] Congelare una baseline di primo avvio senza dati, con backup assente,
  backup presente, errore Firestore, offline e timeout.
- [ ] Riprodurre la race in cui il tour può partire quando `isHydrated` è vero ma
  il workspace iniziale non è ancora risolto.
- [ ] Aggiungere un'asserzione che vieta più di un elemento `aria-modal=true`.
- [ ] Caratterizzare il comportamento corrente di Escape e chiusura in
  `InitialDataDialog` e `OnboardingDialog`.
- [ ] Caratterizzare budget predefinito, categorie, goal e opt-in backup senza
  modificare ancora i dati persistiti esistenti.
- [ ] Mappare tutte le chiavi localStorage relative a onboarding, tour, PWA e
  notifiche, con owner e strategia di migrazione/rimozione.

### Task Backup

- [ ] Aggiungere fixture per documento legacy single-slot, documento a tre slot,
  slot corrotto, checksum errato e scritture concorrenti.
- [ ] Misurare plaintext, ciphertext/base64 e dimensione Firestore stimata su
  workspace piccolo, realistico e massimo supportato.
- [ ] Definire il comportamento quando una migrazione viene interrotta o quando
  un client precedente scrive ancora il formato legacy.
- [ ] Congelare test di restore esatto e fallback corrente prima della migrazione.

### Task Android E PWA

- [ ] Inventariare service worker, manifest, install prompt, script hosting,
  test PWA e riferimenti UI.
- [ ] Caratterizzare quali reminder diventano no-op nel WebView Android.
- [ ] Definire fixture temporali per budget, ricorrenze e custom reminder,
  inclusi timezone, reboot, DST, modifica e cancellazione.
- [ ] Registrare la baseline Android su emulator/API 36 e build debug corrente.

### Verifiche

- [ ] `npm run lint`
- [ ] test Vitest mirati di caratterizzazione
- [ ] Playwright mobile di baseline a 390x844 e 320 px
- [ ] `npm run android:test`
- [ ] `npm run android:verify:webview`

### Exit Gate

- ogni problema da correggere ha almeno un test, fixture o evidenza manuale
  riproducibile;
- nessuna fixture contiene dati finanziari reali, email, UID o token;
- la baseline distingue regressioni nuove da limiti già presenti.

## M2. Orchestratore Del Primo Accesso

### Obiettivo

Sostituire booleani e side effect indipendenti con una macchina a stati unica,
testabile fuori dai componenti e responsabile dell'intero first-run.

### Contratto Proposto

```text
bootstrapping
  -> checking-backup
  -> choose-start
       -> restoring-backup -> ready
       -> essential-setup  -> ready
       -> loading-demo     -> ready
  -> recoverable-error -> retry | continue-offline
```

Vincoli:

- `ready` è l'unico stato che autorizza dashboard e prompt dei tour;
- ogni transizione asincrona è idempotente e ignora risultati obsoleti;
- una verifica backup ha timeout limitato e continuazione offline esplicita;
- restore, demo e workspace reale sono scelte distinte;
- nessuna chiusura grafica equivale implicitamente a `start blank`;
- logout/account switch azzerano correttamente lo stato owner-scoped.

### Task

- [ ] Definire tipi, eventi, guard e output della macchina a stati in un modulo
  separato dalla UI.
- [ ] Centralizzare il coordinamento oggi distribuito tra `AppContext`,
  `Layout`, dialoghi e guided tour.
- [ ] Introdurre un solo host modale per il primo accesso.
- [ ] Rendere visibile `checking-backup` con copy comprensibile e senza flash
  della dashboard.
- [ ] Implementare timeout, retry e `Continue offline` senza disabilitare o
  sovrascrivere un backup remoto esistente.
- [ ] Preservare l'esatto restore della versione scelta.
- [ ] Rendere demo un percorso locale esplicito e impedire che sovrascriva
  automaticamente il backup cloud.
- [ ] Definire migrazione non distruttiva delle chiavi first-run esistenti.
- [ ] Rimuovere l'auto-start del tour basato sul solo `isHydrated`.
- [ ] Aggiungere eventi diagnostici solo tecnici e locali; nessun importo,
  descrizione, email, UID o contenuto backup nei log.

### Test

- [ ] unit test di tutte le transizioni e delle transizioni invalide;
- [ ] integrazione `no backup`, `backup found`, `restore`, `setup`, `demo`;
- [ ] errore, offline, timeout, retry e risposta asincrona obsoleta;
- [ ] reload e process recreation in ogni stato persistito applicabile;
- [ ] logout e account switch durante la verifica;
- [ ] asserzione che dashboard, tour e modali concorrenti non siano esposti
  prima di `ready`.

### Exit Gate

- esiste una sola fonte di verità per il first-run;
- ogni percorso termina in `ready` o in un errore recuperabile visibile;
- nessuna scelta dati avviene tramite Escape, overlay click o timeout implicito;
- i test di race passano in modo deterministico.

## M3. Setup Essenziale, Login E Accessibilità

### Obiettivo

Portare l'utente da workspace nuovo alla prima azione utile con il minimo carico
cognitivo e senza dati economici fittizi.

### Flusso Target

1. scelta `Restore backup`, `Set up my budget` o `Explore demo`;
2. limite mensile spiegato e validato;
3. categorie iniziali visibili, modificabili e selezionabili;
4. stato pronto con CTA `Add your first transaction`.

Goal di risparmio, backup automatico e preferenze avanzate vengono rinviati al
momento in cui l'utente ne comprende il valore. Se D3 consente lo skip del
budget, la dashboard deve mostrare uno stato vuoto esplicito, non una falsa
disponibilità.

### Task UX/UI

- [ ] Rifattorizzare `OnboardingDialog` come stepper/bottom sheet mobile-safe o
  componenti equivalenti del design system.
- [ ] Rimuovere il default reale di EUR 5.000 dai nuovi workspace; non migrare o
  sovrascrivere budget scelti da utenti esistenti.
- [ ] Associare ogni label al controllo e fornire hint/errori con relazioni ARIA.
- [ ] Validare limite, categorie e input numerici senza ignorare valori invalidi.
- [ ] Impedire completamento silenzioso; distinguere `Back`, `Do this later` e
  annullamento con conseguenze chiare.
- [ ] Implementare focus iniziale, focus trap, restore del focus e ordine logico.
- [ ] Garantire scrolling interno, safe-area, CTA raggiungibile con tastiera
  virtuale e nessun overflow a 320 px.
- [ ] Aggiungere loading, empty, error e success state per ogni azione asincrona.
- [ ] Spiegare nella login perché Google/Firebase è richiesto e cosa resta
  local-first; aggiungere link a privacy, supporto ed eliminazione account.
- [ ] Rendere gli errori login annunciabili con `role=alert` senza esporre
  dettagli tecnici o token.
- [ ] Portare backup opt-in e savings goal fuori dal setup essenziale, con CTA
  contestuali post-successo.

### Component Test Obbligatori

- [ ] Creare `src/components/__tests__/OnboardingDialog.test.tsx`.
- [ ] Nome accessibile del dialogo e associazione label/input.
- [ ] Focus iniziale, Tab/Shift+Tab, focus restore ed Escape conforme al contratto.
- [ ] Budget valido, vuoto, zero, negativo, non numerico e fuori limite.
- [ ] Selezione, aggiunta, rimozione e requisito minimo delle categorie.
- [ ] Nessuna callback di completamento con valori invalidi.
- [ ] Back/next/finish, doppio tap e submit da tastiera.
- [ ] Stato loading e prevenzione submit concorrenti.
- [ ] Dark mode, reduced motion e contenuto lungo/zoom testabile.

### Exit Gate

- un nuovo utente comprende cosa deve scegliere senza conoscenza pregressa;
- setup reale completabile con una mano a 320/390 px e tastiera aperta;
- nessun valore economico inventato appare come dato dell'utente;
- axe non rileva violazioni serious/critical nel flusso isolato;
- copy e comportamento sono approvati da PO/CO/QO.

## M4. Tour Contestuali E Help Hub

### Obiettivo

Sostituire il tour globale passivo con piccoli percorsi attivati quando la
funzione è disponibile e l'utente può applicare subito quanto spiegato.

### Catalogo Iniziale

| Tour | Trigger | Step massimi | Prerequisito | CTA finale |
|---|---|---:|---|---|
| Prima transazione | Dopo setup reale | 3 | Workspace `ready` | Salva transazione |
| Home | Prima visita con dati | 3 | Almeno una transazione | Esplora attività |
| Budget | Prima visita Budget | 3 | Setup reale | Aggiungi/modifica limite |
| Reports | Prima visita con storico sufficiente | 4 | Dati reportabili | Apri dettaglio categoria |
| Planning | Prima visita Planning | 3 | Workspace `ready` | Aggiungi ricorrenza |
| Data & Recovery | Lancio manuale | 3 | Utente autenticato | Apri backup/archivio |
| Payment detection | Solo variant autorizzata | 3 | Disclosure e gate beta | Apri impostazioni native |

### Regole Di Interazione

- nessun tour attraversa route diverse;
- nessun tour si avvia mentre è aperto un dialogo o la tastiera virtuale;
- i controlli evidenziati restano utilizzabili quando non aumenta il rischio;
- `Dismissed` non viene riproposto automaticamente;
- `Completed` e `Dismissed` sono distinti;
- tutti i tour sono riavviabili da `Help & Tours`;
- il progresso è locale e non entra in cloud backup o portable archive salvo
  decisione separata;
- riduzione del movimento e screen reader ricevono una presentazione equivalente.

### Task

- [ ] Estrarre una configurazione tipizzata per ID tour, versione, prerequisiti,
  trigger, anchor, step e stato.
- [ ] Versionare lo stato per permettere la riproposizione solo dopo cambiamenti
  sostanziali e documentati.
- [ ] Rimuovere il tour globale di 27 passaggi e il suo auto-start.
- [ ] Implementare prompt non modale e non bloccante alla prima occasione utile.
- [ ] Implementare `Help & Tours` con elenco limitato, stato e replay.
- [ ] Gestire anchor mancante, resize, rotazione, scroll, safe area, browser zoom
  e navigazione Android back.
- [ ] Garantire che overlay e spotlight non rendano inaccessibile il controllo
  necessario.
- [ ] Scrivere microcopy orientato all'azione, massimo un concetto per step.
- [ ] Eliminare chiavi legacy solo dopo migrazione verificata.

### Test

- [ ] unit test prerequisiti, versione e stato `unseen/completed/dismissed`;
- [ ] component test geometria, focus, anchor assente e replay;
- [ ] E2E di ogni tour alla viewport mobile target;
- [ ] nessun auto-start prima di `ready` o sopra un dialogo;
- [ ] nessun overflow e CTA sempre raggiungibile;
- [ ] screen-reader name/description e reduced motion;
- [ ] Android back chiude prima il tour senza uscire o perdere dati.

### Exit Gate

- nessun percorso supera quattro step o cambia route;
- l'utente può completare l'azione reale o uscire senza penalità;
- nessun tour riparte dopo dismissal salvo replay manuale/version bump motivato;
- il vecchio tour non è più raggiungibile né referenziato dalla documentazione.

## M5. Cronologia Cloud A Cinque Versioni

### Obiettivo

Fornire cinque backup cifrati realmente recuperabili senza moltiplicare payload
grandi nello stesso documento Firestore e senza indebolire isolamento o
cancellazione per UID.

### Contratto Raccomandato

```text
backups/{uid}
  metadata, schemaVersion, latestVersionId, latest compatibility payload*

backups/{uid}/versions/{versionId}
  createdAt, ciphertext, iv, checksum, schemaVersion
```

`*` La permanenza temporanea del payload root è una decisione di compatibilità
da definire nell'ADR. Non conta come sesta versione.

### Invarianti

- massimo cinque documenti versione validi, newest-first;
- ogni versione è cifrata client-side con checksum e ID opaco stabile;
- nessun dato finanziario in chiaro o chiave di cifratura in Firestore/log;
- push e rotazione sono idempotenti e tollerano concorrenza multi-device;
- restore esplicito non sostituisce mai silenziosamente la versione scelta;
- cancellare il backup o l'account elimina tutte le versioni e verifica il
  risultato prima del successo;
- un documento parent eliminato non viene considerato sufficiente a eliminare
  la subcollection;
- client e regole fail-closed per UID diverso.

### Slice M5.1 — ADR, Schema E Regole

- [ ] Congelare ADR D2, compatibilità legacy e rollback.
- [ ] Definire tipi versionati parent/version document e mapper puri.
- [ ] Aggiornare Firestore rules per la sola subcollection dell'UID autenticato.
- [ ] Aggiungere rules test per own UID, foreign UID, signed-out, campi non
  ammessi e path inattesi.
- [ ] Definire indici necessari; evitarli se query newest-first è soddisfatta
  senza indice composito.
- [ ] Definire budget di letture/scritture e limite payload supportato.

### Slice M5.2 — Migrazione E Rotazione

- [ ] Leggere legacy single-slot e formato a tre slot senza scrivere al load.
- [ ] Migrare in modo idempotente al primo push/azione esplicita autorizzata.
- [ ] Conservare date e version ID quando validi; non inventare duplicati.
- [ ] Scrivere nuova versione e aggiornare metadata con protocollo sicuro alla
  concorrenza.
- [ ] Eliminare solo versioni oltre la quinta dopo conferma della nuova scrittura.
- [ ] Gestire crash tra create, metadata update e pruning con reconciliation.
- [ ] Impedire che un vecchio client cancelli o nasconda versioni nuove senza
  rilevazione/documentata finestra di compatibilità.

### Slice M5.3 — Restore, UI E Deletion

- [ ] Elencare fino a cinque versioni valide con data locale comprensibile.
- [ ] Aggiornare `InitialDataDialog`, `CloudBackupRestoreDialog` e
  `DataPrivacyPage` con copy `latest five` e stati parziali.
- [ ] Conservare selezione esatta anche dopo refresh concorrente; se la versione
  sparisce, mostrare errore e richiedere nuova scelta.
- [ ] Aggiornare `Delete cloud backup` per enumerare/cancellare tutte le versioni,
  verificare e poi eliminare metadata parent.
- [ ] Integrare la stessa garanzia nell'orchestratore di account deletion.
- [ ] Coprire retry offline e cancellazione parziale senza falso successo.

### Test Obbligatori

- [ ] rotazione 1 -> 5 e 6 -> 5;
- [ ] ordine newest-first e timestamp uguali;
- [ ] migrazione single-slot e three-slot;
- [ ] concorrenza tra due device/client;
- [ ] slot corrotto, checksum errato e versione selezionata rimossa;
- [ ] restore esatto di tutte e cinque le versioni;
- [ ] deletion totale, retry e verifica subcollection vuota;
- [ ] Firestore emulator/rules per isolamento UID;
- [ ] payload realistico e massimo senza errore o picco memoria non accettato;
- [ ] account deletion end-to-end include tutte e cinque le versioni.

### Privacy, Costo E Documentazione

- [ ] Aggiornare `docs/specs/cloud-backup-version-history.md`.
- [ ] Aggiornare retention matrix, privacy notes, account deletion record/spec e
  user-facing privacy copy da tre a cinque.
- [ ] Registrare che non cambia provider/subprocessor, ma aumenta la retention
  delle copie cifrate.
- [ ] Confermare con PrO accesso, rettifica, cancellazione, export e fine
  rapporto; non dichiarare un nuovo lawful basis.
- [ ] Misurare Firestore reads/writes/storage per backup, list, restore e delete.
- [ ] Confermare che un admin cost panel non è proporzionato per questo prodotto
  personale; conservare comunque una stima nel release record.

### Rollback

- mantenere lettura legacy durante la finestra definita dall'ADR;
- non eliminare versioni migrate finché il nuovo parent non è verificato;
- rollback client non deve rendere le cinque versioni cancellabili da un client
  incompatibile;
- se il nuovo schema non è sicuro, sospendere nuovi push e mantenere restore e
  deletion disponibili.

### Exit Gate

- cinque versioni sono elencabili, ripristinabili e cancellabili end-to-end;
- nessuna query o regola consente accesso cross-UID;
- migrazione e rollback sono provati, non solo descritti;
- privacy copy e retention record coincidono con Firestore reale.

## M6. Reminder E Notifiche Locali Android

### Obiettivo

Preservare reminder di budget, ricorrenze e custom reminder nell'app Android
senza service worker, Notification API browser, backend o push provider.

### Confine Architetturale

- scheduler/domain React produce intenti tipizzati e privi di log sensibili;
- adapter di piattaforma inoltra a una capability Android locale;
- Kotlin programma, aggiorna e cancella notifiche con API native compatibili;
- payload di sistema minimizzato e lock-screen redatto;
- payment detection resta una capability separata, con gate e privacy propri.

### Task

- [ ] Inventariare reminder mantenuti e rimuovere quelli senza valore prodotto
  con decisione PO esplicita.
- [ ] Definire contratto tipizzato `schedule/update/cancel/list/reconcile`.
- [ ] Definire ID deterministici e deduplicazione per reminder.
- [ ] Implementare permission/disclosure Android al momento contestuale, non nel
  primo setup essenziale.
- [ ] Implementare scheduling locale, reschedule dopo reboot/app update/timezone
  change e reconciliation dopo modifica dei dati.
- [ ] Definire comportamento con exact alarm non disponibile e battery limits.
- [ ] Implementare deep link solo verso route allowlisted, senza contenuto
  finanziario nell'URI.
- [ ] Minimizzare titolo/testo visibile e fornire public notification redatta.
- [ ] Cancellare reminder su logout, account switch, reset e account deletion.
- [ ] Rimuovere dipendenza runtime da browser Notification API/service worker.
- [ ] Aggiornare impostazioni, empty/error state e help.

### Test

- [ ] Kotlin unit test su mapping, ID, dedupe e data/ora;
- [ ] instrumentation per permission granted/denied, schedule, update e cancel;
- [ ] reboot/process recreation/timezone/DST;
- [ ] doppia schedulazione e dati modificati;
- [ ] logout/account switch/reset/deletion purge;
- [ ] deep link allowlisted e navigation back;
- [ ] lock-screen redaction e assenza di contenuto sensibile nei log;
- [ ] React adapter test su capability disponibile/non disponibile.

### Privacy E Security Gate

- nessun nuovo provider, recipient, transfer o telemetria;
- nessun importo, merchant, categoria, nota, UID o email nei log;
- disclosure distingue reminder Aura dal monitoraggio payment detection;
- PrO/SO approvano contenuto lock-screen, retention OS e comportamento di purge.

### Exit Gate

- tutti i reminder mantenuti sono consegnati o esplicitamente degradati con UX
  documentata;
- riavvio e modifica non creano duplicati;
- rimozione service worker non interrompe silenziosamente la funzione;
- test Android e documentazione operativa sono verdi.

## M7. Ritiro PWA E Portale Pubblico Minimo

### Obiettivo

Rimuovere la PWA/webapp come canale prodotto senza interrompere Android,
privacy, supporto o eliminazione account esterna.

### Slice M7.1 — Portale Prima Del Ritiro

- [ ] Definire route pubbliche ammesse: landing, privacy, supporto,
  account-deletion e relativi success/error state.
- [ ] Separare build/deploy del portale dalla build React incorporata nell'app.
- [ ] Preservare l'autenticazione necessaria all'eliminazione account senza
  esporre il resto della webapp.
- [ ] Verificare dominio, TLS, link Play, email supporto, accessibilità, mobile e
  noindex dove applicabile.
- [ ] Eseguire account deletion da browser signed-out/disinstalled scenario.
- [ ] Aggiornare Play Console, privacy URL, support URL e listing.

### Slice M7.2 — Rimozione PWA Dal Prodotto

- [ ] Rimuovere `PwaFirstAccessDialog`, `PwaInstallButton` e riferimenti in
  TopBar/More/AppContext.
- [ ] Rimuovere `pwaInstallService`, manifest, service worker e registrazione.
- [ ] Rimuovere storage key e listener PWA con cleanup/migrazione non distruttiva.
- [ ] Rimuovere script/config di deploy della webapp completa o convertirli nel
  deploy del portale.
- [ ] Rimuovere browser notification path solo dopo M6.
- [ ] Convertire test browser utili in regressioni del runtime incorporato.
- [ ] Eliminare test esclusivamente legati a install prompt/cache PWA.
- [ ] Verificare che Android continui a usare `webDir: dist`, bundled assets e
  nessun `server.url` remoto.
- [ ] Scansionare bundle e UI per copy/icon/install marker PWA residui.

### Slice M7.3 — Cutover E Compatibilità

- [ ] Definire finestra e comunicazione per eventuali utenti PWA esistenti.
- [ ] Decidere export/backup guidance prima dello spegnimento della webapp.
- [ ] Pubblicare portale e validare URL prima di modificare hosting.
- [ ] Conservare rollback rapido del routing pubblico.
- [ ] Spegnere la webapp autenticata solo dopo go/no-go firmato.
- [ ] Aggiornare runbook di incident response, supporto e account deletion.

### Test Ed Exit Gate

- [ ] Android bundled startup/offline/reload/localStorage/IndexedDB verdi;
- [ ] nessun prompt installazione o service worker nel prodotto;
- [ ] portale mobile/accessibile e account deletion E2E verde;
- [ ] URL Play pubblici validi e monitorabili;
- [ ] rollback hosting provato;
- [ ] nessuna perdita di restore/export per utenti nella finestra supportata.

## M8. Hardening Mobile, E2E E Accessibilità

### Obiettivo

Dimostrare l'intero percorso su viewport e WebView reali, non solo componenti
isolati.

### Matrice Automatica Minima

| Area | Desktop browser | 390x844 | 320 px | Android WebView | Axe |
|---|---:|---:|---:|---:|---:|
| Login | Sì | Sì | Sì | Sì | Sì |
| Backup check/choice | Sì | Sì | Sì | Sì | Sì |
| Setup reale | Sì | Sì | Sì | Sì | Sì |
| Demo | Sì | Sì | Sì | Sì | Sì |
| Restore versioni | Sì | Sì | Sì | Sì | Sì |
| Prima transazione | Sì | Sì | Sì | Sì | Sì |
| Tour contestuali | Sì | Sì | Sì | Sì | Sì |
| Reminder | N/A runtime | N/A | N/A | Sì | UI impostazioni |
| Account deletion | Sì | Sì | Sì | Sì | Sì |

### Playwright Mobile E2E

- [ ] Aggiungere progetto/tag `@mobile-first-run` a 390x844 e 320 px.
- [ ] Intercettare backup API con fixture deterministiche, senza dati reali.
- [ ] Verificare nessun horizontal overflow a ogni step.
- [ ] Simulare tastiera/viewport ridotta e verificare CTA raggiungibile.
- [ ] Verificare light, dark e reduced motion.
- [ ] Eseguire axe su ogni stato con zero violazioni serious/critical.
- [ ] Verificare focus order, Escape/Back, aria-live/error e focus restore.
- [ ] Verificare assenza di più modali e assenza tour pre-`ready`.
- [ ] Verificare restore/demo/setup e primo task end-to-end.
- [ ] Verificare tour replay, dismissal e anchor geometry.

### Android E Manual QA

- [ ] Aggiungere instrumentation del first-run in WebView API 36.
- [ ] Testare process recreation, app background/foreground e Android back.
- [ ] Testare font scaling 200%, display scaling e rotazione supportata.
- [ ] Eseguire TalkBack manuale su login, setup, restore e prima transazione.
- [ ] Eseguire physical-device pass su almeno il device minimo autorizzato.
- [ ] Verificare offline startup, restore error, reminder permission e deep link.
- [ ] Acquisire screenshot/video redatti con build, commit, device e data.

### Comandi Gate

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] `npm run android:test`
- [ ] `npm run android:lint`
- [ ] `npm run android:verify:webview`
- [ ] `npm run android:test:instrumentation`
- [ ] verifier release/PWA-retirement aggiunto in M7

### Exit Gate

- nessun P0/P1 aperto;
- zero violazioni axe serious/critical nei flussi target;
- test automatici verdi sullo stesso commit del release candidate;
- TalkBack e physical device firmati da QO;
- evidenze prive di dati personali o finanziari reali.

## M9. Rilascio Controllato, Rollback E Chiusura

### Obiettivo

Promuovere la nuova architettura solo dopo chiusura congiunta dei gate di questo
tracker e dei tracker 13/14.

### Task

- [ ] Produrre release candidate firmato e ripetibile con SBOM/audit applicabile.
- [ ] Pubblicare prima il portale e verificare account deletion/supporto.
- [ ] Eseguire Internal Testing con dati sintetici e matrice M8.
- [ ] Verificare metriche tecniche privacy-safe: crash, startup failure,
  backup errors per codice e notification scheduling errors senza payload.
- [ ] Verificare costi Firestore/hosting rispetto alla stima M5/M7.
- [ ] Eseguire go/no-go con PO, QO, SO, PrO e RO.
- [ ] Promuovere a closed beta solo se i gate 13/14 applicabili sono chiusi.
- [ ] Ritirare la webapp completa secondo la finestra M7, non prima.
- [ ] Monitorare stabilizzazione e applicare soglie di rollback.
- [ ] Aggiornare changelog, release record, runbook e tutti i tracker.
- [ ] Chiudere o trasferire ogni rischio residuo con owner e scadenza.

### Trigger Di Rollback

- perdita o inaccessibilità di backup/versioni;
- cancellazione account incompleta o falso successo;
- first-run non completabile su device target;
- crash loop/startup failure rilevante;
- reminder duplicati o impossibili da cancellare;
- portale privacy/support/deletion non raggiungibile;
- accesso cross-UID, log sensibili o altra violazione security/privacy;
- regressione P0/P1 senza mitigazione verificata.

### Exit Gate

- rollout e stabilizzazione soddisfano tracker 13/14;
- portale e app Android sono le sole superfici supportate dichiarate;
- restore, deletion e rollback sono operativi;
- documentazione descrive la release effettiva;
- rischi residui hanno accettazione esplicita o follow-up tracciato.

## Requisiti Trasversali

### Security

- least privilege per ogni path Firestore e bridge Capacitor;
- nessun secret, token, email, UID o dato finanziario nei log;
- CSP, exact-origin navigation e cleartext blocking preservati;
- ogni deep link è allowlisted e non contiene dati sensibili;
- dipendenze nuove ammesse solo con motivazione, audit e owner;
- account switch, logout, reset e deletion sono sempre owner-scoped.

### Privacy E GDPR

- dati toccati: configurazione budget/categorie, ledger locale già esistente,
  cinque copie cifrate opzionali, reminder locali e preferenze onboarding/tour;
- la retention cloud aumenta da tre a cinque versioni e richiede artifact sync;
- nessun nuovo provider o subprocessor è previsto per backup e notifiche locali;
- exported `.aura` resta una copia controllata dall'utente e fuori dalla deletion
  Aura;
- accesso, rettifica, cancellazione, export, retention e fine rapporto devono
  riflettere tutte e cinque le versioni;
- legal source register, lawful-basis record, role allocation e RoPA mancanti
  restano gap di governance: nessuna dichiarazione di conformità viene inferita;
- payment detection continua a seguire il proprio DPIA screening e non viene
  assimilata ai reminder generici.

### AI Governance

Questa iniziativa non introduce AI, modelli, decision support o provider AI.
Reintrodurre categorizzazione remota o generativa richiede nuova discovery,
privacy review e AI-governance review. Non sono previsti task AI Act ulteriori
nel presente piano.

### Observability E FinOps

- registrare solo codici tecnici aggregabili e privi di payload personale;
- misurare failure rate di backup/restore/migration/delete e scheduling;
- attribuire reads, writes e storage Firestore al workflow, non al contenuto;
- definire soglie di errore e rollback prima del rollout;
- evitare un admin cost panel salvo crescita multi-user/usage-based che lo renda
  proporzionato; documentare comunque stima e anomalia nel release record;
- il portale minimo deve avere monitoring di disponibilità per privacy, supporto
  e account deletion.

### UX E Design System

- riusare token, dialog, button, field e focus primitives condivisi;
- coprire loading, empty, error, success e offline;
- nessun colore, spacing o z-index one-off senza giustificazione;
- target touch, contrasto, focus visibile, screen reader e safe area verificati;
- una schermata espone una decisione primaria chiara;
- copy breve, orientato all'azione e privo di gergo tecnico non necessario.

### Documentazione Da Sincronizzare

- `product/project-brief.md`;
- `docs/00-discovery/00-project-brainstorm.md`;
- `docs/00-discovery/01-solution-strategy.md`;
- `docs/00-discovery/02-delivery-plan.md`;
- tracker 13 e 14;
- ADR 0002 tramite ADR sostitutivo e nuovo ADR backup;
- `docs/specs/cloud-backup-version-history.md`;
- onboarding/tour feature spec da creare o aggiornare;
- account deletion spec e engineering record;
- `docs/04-privacy-gdpr/privacy-notes.md` e retention artifacts;
- `docs/testing-strategy.md` e QA matrix;
- runbook backup, account deletion, Android notifications e public portal;
- `CHANGELOG.md` al momento dell'implementazione/release.

## Definition Of Ready Dell'Implementazione

- [ ] D1-D4 approvate o sostituite da alternative documentate.
- [ ] Brief, brainstorm e strategy allineati.
- [ ] ADR di distribuzione e backup accettati.
- [ ] Owner PO/WO/AO/DO/QO/SO/PrO/RO/CO assegnati.
- [ ] Baseline M1 disponibile per la slice che inizia.
- [ ] Dati, retention, deletion, migration e rollback della slice definiti.
- [ ] Fixture sintetiche disponibili e prive di dati reali.
- [ ] Quality gate e posizione delle evidenze concordati.
- [ ] Nessun blocker privacy/security applicabile ignorato.

## Definition Of Done Del Programma

- [ ] Distribuzione Android-only e portale pubblico minimo sono implementati e
  descritti coerentemente.
- [ ] Il runtime React resta bundled, offline-capable e senza remote `server.url`.
- [ ] Primo accesso e setup sono deterministici, accessibili e mobile-safe.
- [ ] Il tour globale è sostituito dal catalogo contestuale approvato.
- [ ] Cinque backup cloud sono migrabili, ripristinabili e cancellabili.
- [ ] Reminder Android mantenuti hanno delivery nativo verificato.
- [ ] Account deletion copre tutte le nuove superfici e non mostra falso successo.
- [ ] Unit, component, integration, E2E, axe, Android unit/lint/instrumentation e
  physical QA applicabili sono verdi sul release candidate.
- [ ] Privacy, security, observability, cost, docs e changelog sono sincronizzati.
- [ ] Rollback di app, backup migration e portale è provato.
- [ ] Tracker 13/14 autorizzano la promozione applicabile.

## Registro Rischi

| ID | Rischio | Prob. | Impatto | Mitigazione | Owner | Stato |
|---|---|---:|---:|---|---|---|
| R1 | Documenti strategici contraddittori portano a rimozioni premature | Alta | Alto | M0 e ADR sostitutivo prima del codice | PO/WO | Aperto |
| R2 | Migrazione backup perde o rende invisibile una versione | Media | Critico | Protocollo idempotente, dual-read, fixture concorrenza e rollback | DO/SO | Aperto |
| R3 | Delete parent lascia version docs orfane | Alta se non gestita | Critico | Enumerazione, delete verificata e test account deletion | DO/PrO | Aperto |
| R4 | Old client modifica il parent e rompe compatibilità | Media | Alto | Finestra compatibilità/version gate definita in ADR | DO/RO | Aperto |
| R5 | Ritiro service worker interrompe reminder | Alta | Alto | M6 prima della rimozione browser path | AO/WO | Aperto |
| R6 | Onboarding resta bloccato offline | Media | Alto | Timeout, retry, continue-offline e state-machine test | WO/QO | Aperto |
| R7 | Tour copre controlli o modali su mobile | Media | Medio | Prerequisiti, max 4 step, geometry E2E e replay | WO/QO | Aperto |
| R8 | Portale deletion non disponibile dopo cutover | Bassa | Critico | Pubblicare/verificare prima, monitoring e rollback hosting | RO/PrO | Aperto |
| R9 | Retention 3->5 non allineata ai documenti privacy | Media | Alto | Artifact checklist e approval PrO in M5 | PrO | Aperto |
| R10 | Legal baseline incompleta blocca claim/release | Alta | Alto | Owner e artifact governance nel tracker 14/C6 | PrO/PO | Aperto |
| R11 | Test browser rimossi insieme alla PWA riducono copertura React | Media | Alto | Convertire in bundled-runtime regression, non cancellare in blocco | WO/QO | Aperto |
| R12 | Notifiche duplicate dopo reboot/timezone change | Media | Alto | ID deterministici, reconciliation e instrumentation | AO/QO | Aperto |

## Registro Evidenze

| ID | Milestone | Evidenza richiesta | Posizione | Owner | Stato |
|---|---|---|---|---|---|
| E0-01 | M0 | Decision record D1-D7 | Da definire in discovery/ADR | PO | Mancante |
| E1-01 | M1 | Baseline test e fixture index | `docs/07-qa/` | QO | Mancante |
| E2-01 | M2 | State transition matrix | feature spec + test report | WO/QO | Mancante |
| E3-01 | M3 | Onboarding accessibility report | `docs/07-qa/` | QO | Mancante |
| E4-01 | M4 | Tour mobile matrix | `docs/07-qa/` | QO | Mancante |
| E5-01 | M5 | Migration/rules/deletion report | `docs/07-qa/` | DO/SO | Mancante |
| E6-01 | M6 | Notification lifecycle report | `docs/07-qa/` | AO/QO | Mancante |
| E7-01 | M7 | Portal/cutover/rollback report | `docs/03-operations/` | RO | Mancante |
| E8-01 | M8 | RC automated + physical matrix | [`docs/07-qa/android-only-onboarding-backup-acceptance.md`](../07-qa/android-only-onboarding-backup-acceptance.md) | QO | Automatico verde; fisico mancante |
| E9-01 | M9 | Go/no-go and stabilization record | tracker 13/14 | RO | Mancante |

## Progress Log

| Data | Milestone | Stato | Aggiornamento | Evidenza / Prossimo passo |
|---|---|---|---|---|
| 2026-08-04 | M0 | In corso | Creato il tracker dettagliato per Android-only, onboarding, tour, backup x5, reminder e QA | Chiudere D1-D4 e sincronizzare brief/strategy/ADR |
| 2026-08-04 | M0-M7 | In corso | Approvate D1-D4; implementati first-run deterministico, setup mobile, cinque tour, backup v2 x5, adapter notifiche native, ritiro PWA e portale pubblico | Regressione automatica e gate esterni |
| 2026-08-04 | M8 | In corso | 503 test unit/component, 51 E2E Chromium/WebKit/mobile, build app/portale e Android JVM/lint verdi | Chiudere emulator rules, scheduling/instrumentation reminder, device/TalkBack e privacy approval |

## Modalità Di Aggiornamento

Ad ogni sessione di lavoro:

1. aggiornare stato della milestone e sole checkbox supportate da evidenza;
2. aggiungere una riga al Progress Log con data e prossimo passo;
3. collegare test report, screenshot redatti, commit/build e ADR applicabili;
4. aggiornare rischi nuovi, mitigati o accettati;
5. non segnare una milestone `Completata` se test, docs o review trasversali sono
   ancora aperti;
6. riportare blocker esterni anche nei tracker 13/14 se influenzano la release;
7. mantenere questo file come vista operativa canonica dell'iniziativa.
