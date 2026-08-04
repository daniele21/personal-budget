# Aura C2 Release Decision Pack

## Scopo

Questo documento registra le decisioni di release confermate dal product owner
il 2026-08-04 e separa le scelte approvate dalle verifiche operative ancora
necessarie per chiudere C2.

Le decisioni valgono per il percorso iniziale di Aura Android. Non autorizzano
da sole una beta real-user, l'accesso a notifiche finanziarie reali o la
produzione. Restano applicabili tutti i gate di account deletion, privacy,
security, QA fisica e Play definiti nel tracker 13.

## Decisioni Confermate

| ID | Decisione | Esito approvato | Conseguenza |
|---|---|---|---|
| D-REL-001 | Modello di distribuzione | Play Internal Testing, poi closed beta allowlisted. La distribuzione pubblica non e autorizzata da C2 e richiedera una decisione successiva | Onboarding e reviewer access possono essere progettati per un perimetro ristretto; nessun listing pubblico che rifiuti utenti ordinari |
| D-REL-002 | Payment detection | Beta-only. La prima eventuale produzione e core-only, senza listener, finche una nuova decisione non approva M9/M10 | Servono varianti/manifest che escludano listener, query e sorgenti payment dalla build production core |
| D-REL-003 | Android supportato | Android 16/API 36-only per internal e beta | Nessuna compatibilita dichiarata sotto API 36; reach pubblica da rivalutare prima del GO pubblico |
| D-REL-004 | Mercato e lingua | Lancio iniziale in Italia, prodotto e store in inglese, target audience 18+; espansione europea successiva | L'espansione richiede una decisione di rollout e l'aggiornamento della country list Play |
| D-REL-005 | Monetizzazione | Gratuita | Nessun pagamento, subscription o SDK billing nel perimetro iniziale |
| D-REL-006 | Account developer | Account personale intestato pubblicamente a Daniele Moltisanti; nessuna societa, partita IVA o D-U-N-S; account, verifiche applicabili e package `com.staituned.aura` confermati dal proprietario | Le evidenze redatte della Console restano deliverable operativo C5/C8, non una decisione C2 aperta |
| D-REL-007 | Dominio pubblico | `aura.staituned.com`, sotto dominio `staituned.com` controllato dal product owner | Landing, privacy, deletion e support saranno pubblici sul sottodominio, separati dalla shell autenticata |
| D-REL-008 | Supporto | `support@staituned.com`, gestita da Daniele Moltisanti; obiettivo di risposta entro una settimana | Rischio single-person accettato solo per Internal Testing; backup owner obbligatorio prima della closed beta |

## Motivazione E Tradeoff

### Internal E Closed Beta Prima Del Pubblico

Pro:

- riduce esposizione mentre deletion, privacy e QA fisica sono ancora aperte;
- permette reviewer e tester nominativi;
- mantiene reversibile il modello pubblico.

Contro:

- non valida ancora onboarding self-service e supporto su scala;
- richiede una nuova decisione prima di un listing pubblico.

Decisione: accettata. Il pubblico self-service non viene assunto implicitamente.

### Payment Detection Beta-Only

Pro:

- separa il rischio notification-access dalla prima produzione core;
- permette pilot controllato e stop condition;
- semplifica privacy, Data Safety e rollback della build pubblica core.

Contro:

- richiede isolamento di build/manifest e una matrice aggiuntiva;
- beta e produzione possono avere capability diverse.

Decisione: accettata. La scelta hard-to-reverse e registrata in
[`ADR 0004`](../../adr/0004-aura-payment-detection-beta-only-release.md).

### API 36-Only

Pro:

- mantiene una matrice verificabile e coerente con l'implementazione corrente;
- evita claim di compatibilita non provati.

Contro:

- limita fortemente la reach;
- non puo essere esteso al pubblico senza nuova matrice e decisione.

Decisione: accettata per internal e beta.

### Italia In Inglese, Audience 18+ E Prodotto Gratuito

Pro:

- una sola lingua riduce copy, QA e support matrix;
- nessuna integrazione billing o nuova esposizione dati/costi.

Contro:

- il supporto solo inglese puo ridurre accessibilita commerciale anche in Italia;
- l'espansione europea richiedera country selection, copy e support capacity
  rivalutati.

Decisione prodotto: accettata per Italia, inglese e audience 18+.

### Account Personale E Ownership Concentrata

Pro:

- identita e responsabilita sono chiare;
- nessuna dipendenza societaria o D-U-N-S dichiarata.

Contro:

- single-person dependency su release, security, privacy e supporto;
- self-review non sostituisce una review competente quando il legal baseline la
  richiede;
- recovery e continuita operativa non hanno ancora un backup owner; il rischio
  e accettato per Internal Testing ma non per la closed beta.

Decisione: accettata con risposta entro una settimana e gate backup prima beta.

## Owner Matrix

| Ruolo | Owner primario | Sostituto | Nota |
|---|---|---|---|
| PO — Product | Daniele Moltisanti | Non assegnato | Scope e go/no-go |
| AO — Android | Daniele Moltisanti | Non assegnato | Gradle, manifest, signing tecnico |
| WO — Web/React | Daniele Moltisanti | Non assegnato | UI, auth, dati e deletion |
| QO — QA | Daniele Moltisanti | Non assegnato | Acceptance e defect triage |
| SO — Security | Daniele Moltisanti | Non assegnato | Self-review engineering; review competente quando richiesta |
| PrO — Privacy | Daniele Moltisanti | Non assegnato | Accountable owner; nessuna certificazione o parere legale implicito |
| RO — Release | Daniele Moltisanti | Non assegnato | Play Console, artifact e rollout |
| CO — Content | Daniele Moltisanti | Non assegnato | Store, landing e lingua inglese |
| SuO — Support | Daniele Moltisanti | Non assegnato | `support@staituned.com`; risposta entro una settimana; backup richiesto prima della beta |

L'indirizzo personale usato per login/recovery dell'account Play non viene
registrato nel repository. Deve restare nel release record privato insieme a
recovery e access-control evidence.

## Scope Per Track

| Track | Accesso | Payment detection | Lingua | Pricing | Stato autorizzazione |
|---|---|---|---|---|---|
| Local/debug | Maintainer | Sorgente sintetica | Inglese | N/A | Consentito |
| Play Internal | Account nominativi; Italia | Sintetica; nessuna sorgente reale prima dei gate | Inglese; 18+ | Gratuita | Pianificato, non ancora pronto |
| Closed beta | Allowlist e partecipanti approvati; Italia | Beta-only, off-by-default, sorgenti approvate dopo M9/C6 | Inglese; 18+ | Gratuita | Non autorizzato finche i gate real-user e il backup supporto sono aperti |
| Produzione iniziale | Italia; accesso pubblico ancora da decidere | Core-only, listener assente | Inglese; 18+ | Gratuita | Non autorizzata; richiede nuova decisione di accesso pubblico |

## Conferme Operative Ricevute

- Account Play personale creato e verifiche applicabili completate, secondo
  conferma del proprietario.
- Package `com.staituned.aura` registrato, secondo conferma del proprietario.
- Italia come paese iniziale, inglese e target audience 18+.
- Rischio single-person accettato per Internal Testing; backup owner richiesto
  prima della closed beta.
- Obiettivo di risposta del supporto: entro una settimana.

### Verifiche Esterne Successive

- developer verification e requisiti correnti del profilo personale;
- disponibilita package e Play App Signing;
- controllo DNS/TLS effettivo di `aura.staituned.com` quando configurato;
- requisiti closed-test applicabili mostrati dalla Play Console;
- fonti privacy/legali secondo il futuro legal source register.

## Safe Assumptions

- Nessuna localizzazione diversa dall'inglese entra nello scope iniziale.
- Nessun billing SDK, acquisto o abbonamento viene aggiunto.
- Il login account Play resta informazione privata, non contenuto pubblico.
- La produzione pubblica non viene avviata senza riaprire D-REL-001.
- L'assenza di backup owner e una limitazione operativa, non un'approvazione
  implicita del rischio.

## Cosa Puo Procedere Ora

- progettazione C3 account deletion per il modello account esistente;
- progettazione C5 delle varianti core production e detection beta;
- preparazione inglese di landing, privacy, deletion e supporto;
- preparazione del release record privato e della matrice owner;
- configurazione tecnica del sottodominio senza pubblicare claim legali.

## Cosa Deve Attendere

- Play Internal upload: evidenze Console/signing e gate tecnici non completati;
- beta real-user: privacy, DPIA, support backup, physical QA e disclosure aperti;
- payment detection reale: M9/C6 e fixture process non approvati;
- produzione pubblica: access model, C3-C7 e GO finale.

## Stato C2

**Completato il 2026-08-04.** D-REL-001..008 sono approvate, tutti gli owner
primari sono assegnati e le conferme operative richieste sono registrate. Le
evidenze Play restano deliverable C5/C8; il backup owner e un gate della closed
beta, non dell'Internal Testing.
