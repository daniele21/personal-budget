# Aura Finance

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=fff)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=fff)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-auth_%2B_backup-FFCA28?logo=firebase&logoColor=111)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-mobile--first-5A0FC8)](https://web.dev/explore/progressive-web-apps)
[![Privacy](https://img.shields.io/badge/privacy-local--first-0F766E)](#privacy-e-sicurezza)

Aura Finance è una Progressive Web App mobile-first per gestire budget personali, spese, entrate, pagamenti ricorrenti, obiettivi di risparmio e report finanziari senza perdere il controllo dei propri dati.

Il progetto nasce con una scelta chiara: i dati finanziari restano prima di tutto nel browser dell'utente. Il cloud esiste solo come backup cifrato opzionale, attivato esplicitamente, e l'admin gestisce solo l'accesso tramite allowlist senza poter leggere i dati finanziari personali.

## Missione

Aiutare una persona a capire rapidamente quanto può spendere, dove stanno andando i soldi e quali impegni ricorrenti stanno arrivando, mantenendo una postura privacy-first concreta.

Aura Finance privilegia:

- dati locali e controllo esplicito dell'utente;
- numeri finanziari affidabili per decisioni quotidiane;
- interfaccia mobile rapida, leggibile e adatta all'uso frequente;
- report utili senza inviare dati a servizi esterni;
- architettura semplice, testabile e mantenibile.

## Problema che risolve

Molte app di budgeting sono troppo complesse, richiedono account cloud, integrano dati bancari o trattano la privacy come una promessa generica. Aura Finance punta a un caso d'uso più sobrio: una persona vuole registrare entrate e uscite, controllare budget e ricorrenze, leggere report chiari e avere un backup opzionale senza consegnare tutto il proprio storico finanziario a un backend applicativo.

## Funzionalità principali

- Dashboard con saldo, entrate, uscite, safe-to-spend e riepilogo spese.
- Gestione transazioni con categorie, data, metodo di pagamento, note e allegati locali.
- Storico con ricerca, filtri, modifica, cancellazione e andamento finanziario.
- Budget per categoria con stato di avanzamento e alert in-app.
- Pagamenti ricorrenti con frequenze giornaliere, settimanali, mensili e annuali.
- Calendario per visualizzare movimenti e ricorrenze.
- Report, confronto periodi e year-in-review calcolati localmente.
- Ricerca globale su transazioni, ricorrenti, budget, obiettivi e categorie.
- Obiettivi di risparmio e gestione categorie con archivio per preservare lo storico.
- Import/export CSV per portabilità dei dati.
- Notifiche locali e reminder tramite browser e service worker.
- Tema chiaro/scuro, PWA installabile e design mobile-first.
- Login Google con Firebase Authentication.
- Backup Firestore cifrato opzionale per ripristino tra dispositivi.
- Pannello admin limitato alla gestione dell'allowlist utenti.
- Flusso di primo avvio con scelta tra backup trovato, dati demo locali o partenza da zero.

## Anteprima funzionale

Le schermate seguenti mostrano il flusso principale dell'app con dati demo locali: controllo rapido della situazione finanziaria, inserimento movimenti, analisi dello storico, report, budget e ricorrenze.

| Dashboard | Distribuzione spese | Nuova transazione |
|---|---|---|
| <img src="screenshots/Screenshot%202026-04-27%20alle%2011.21.27.png" alt="Dashboard con saldo totale, safe to spend, income ed expenses" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.21.34.png" alt="Dashboard con grafico spending by category e lista categorie" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.21.51.png" alt="Schermata add transaction con importo, titolo e categoria" width="220"> |
| Saldo totale, safe-to-spend e metriche mensili per capire subito quanto resta disponibile. | Donut e breakdown per categoria per individuare le aree di spesa principali. | Inserimento mobile-first con tipo movimento, importo, titolo, categoria, data e metodo di pagamento. |

| Storico | Report mensile | Dettaglio report |
|---|---|---|
| <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.05.png" alt="Storico transazioni ordinato per data" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.15.png" alt="Report mensile con income, expenses, net flow e spending breakdown" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.23.png" alt="Report con dettaglio budget e spese per categoria" width="220"> |
| Lista transazioni ordinata per data con importi, categorie e descrizioni. | Report locale con entrate, uscite, net flow e confronto rispetto al periodo precedente. | Analisi per categoria con progressi rispetto al budget e variazioni sul periodo precedente. |

| Calendario | Ricorrenze | Budget |
|---|---|---|
| <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.33.png" alt="Calendario mensile con income, expenses e recurring" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.44.png" alt="Dettaglio ricorrenze e movimenti del giorno selezionato" width="220"> | <img src="screenshots/Screenshot%202026-04-27%20alle%2011.22.50.png" alt="Pagina budget con progresso mensile e limiti per categoria" width="220"> |
| Vista mensile con indicatori giornalieri per movimenti e ricorrenze. | Ricorrenze attive, movimenti generati e dettaglio del giorno selezionato. | Limiti mensili per categoria, speso, residuo e progresso complessivo. |

## Privacy e sicurezza

Aura Finance segue un modello local-first:

- transazioni, budget, categorie, preferenze e reminder sono salvati localmente nel browser;
- gli allegati immagine sono salvati in IndexedDB;
- il backup cloud è disattivato di default;
- quando il backup è attivo, il payload viene cifrato prima della scrittura su Firestore;
- l'admin non ha accesso ai dati finanziari degli utenti;
- non sono presenti funzionalità AI nel perimetro attuale;
- notifiche, ricerca, confronti e report sono calcolati localmente;
- i dati demo sono generati e salvati solo nel browser; se un backup cloud esiste e l'utente sceglie zero o demo, il backup cloud viene disattivato localmente per evitare sovrascritture accidentali.

Per i dettagli operativi vedere [privacy-notes.md](docs/04-privacy-gdpr/privacy-notes.md), [project-brief.md](product/project-brief.md) e [solution-strategy.md](docs/00-discovery/01-solution-strategy.md).

## Stack tecnico

| Area | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4, design tokens CSS |
| Animazioni | Motion / Framer Motion API |
| Grafici | Recharts |
| Storage locale | localStorage, IndexedDB tramite `idb-keyval` |
| Auth e cloud opzionale | Firebase Authentication, Firestore |
| Test | Vitest, TypeScript typecheck |
| Deploy | Firebase Hosting |

## Architettura del repo

![Diagramma architettura Aura Finance](docs/assets/aura-architecture.svg)

```text
src/
  components/        Componenti UI riutilizzabili
  context/           Stato applicativo e orchestrazione client
  data/              Chiavi storage e accesso dati locale
  domain/            Logica pura di finanza, ricorrenze, categorie e ricerca
  hooks/             Hook applicativi e integrazioni browser
  lib/               Firebase, backup cifrato e utility condivise
  pages/             Route principali dell'app
  utils/             Formatter e helper trasversali

docs/                Discovery, strategia, privacy e analisi prodotto
product/             Brief e intenti di prodotto
public/              Manifest, service worker e asset statici
scripts/             Script operativi, inclusa deploy hosting
```

Le decisioni di prodotto e architettura sono documentate in `product/` e `docs/00-discovery/`. Prima di cambiare flussi, dati, privacy, sicurezza o architettura, leggere anche [AGENTS.md](AGENTS.md).

## Come eseguire in locale

Prerequisito: Node.js installato.

1. Installa le dipendenze:

   ```bash
   npm install
   ```

2. Copia il file ambiente:

   ```bash
   cp .env.example .env
   ```

3. Inserisci in `.env` i valori Firebase richiesti.

4. Avvia l'app:

   ```bash
   npm run dev
   ```

L'app viene servita da Vite sulla porta `3000`.

## Configurazione Firebase

Nel progetto Firebase:

1. abilita Google sign-in in Authentication;
2. crea un database Firestore;
3. configura le regole da [firestore.rules](firestore.rules);
4. compila le variabili `VITE_FIREBASE_*` in `.env`.

Collezioni principali:

- `allowedUsers/{emailHash}`: allowlist di accesso basata su hash email;
- `backups/{uid}`: backup cloud opzionale, cifrato lato client.

## Script disponibili

| Comando | Scopo |
|---|---|
| `npm run dev` | Avvia Vite in sviluppo |
| `npm run lint` | Esegue il typecheck TypeScript |
| `npm run test` | Esegue i test Vitest |
| `npm run test:watch` | Avvia Vitest in watch mode |
| `npm run build` | Genera la build di produzione |
| `npm run preview` | Serve la build localmente |
| `npm run firebase:login` | Login Firebase CLI |
| `npm run deploy:hosting` | Build e deploy su Firebase Hosting |

## Deploy su Firebase Hosting

1. Accedi a Firebase:

   ```bash
   npm run firebase:login
   ```

2. Verifica che `VITE_FIREBASE_PROJECT_ID` sia configurato in `.env`, oppure passa `FIREBASE_PROJECT_ID`.

3. Esegui il deploy:

   ```bash
   npm run deploy:hosting
   ```

Per deployare su un progetto specifico senza modificare `.env`:

```bash
FIREBASE_PROJECT_ID=your-project-id npm run deploy:hosting
```

## Documentazione utile

- [Project brief](product/project-brief.md)
- [Analisi progetto](docs/00-discovery/00-project-analysis.md)
- [Strategia soluzione](docs/00-discovery/01-solution-strategy.md)
- [Delivery plan](docs/00-discovery/02-delivery-plan.md)
- [Note privacy/GDPR](docs/04-privacy-gdpr/privacy-notes.md)

## Stato del progetto

Aura Finance è un'app PWA in evoluzione. Il perimetro attuale include budgeting personale, reporting locale, backup cifrato opzionale e controllo accessi. Sono esplicitamente fuori scope, per ora, AI, consigli finanziari automatizzati, open banking e visibilità admin sui dati finanziari degli utenti.
