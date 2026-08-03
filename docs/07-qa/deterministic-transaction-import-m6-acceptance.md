# Deterministic Transaction Import M6 Acceptance

## Stato

Ultimo aggiornamento: 2026-08-03

Il gate automatico web/PWA e la build Android debug sono verdi. La release resta
**no-go** fino al completamento delle prove manuali su Android WebView/API 36 e
con screen reader.

## Evidenze automatiche

| Gate | Comando/evidenza | Esito |
|---|---|---|
| Typecheck, unit/component, build, rimozione Gemini | `npm run test:regression` | Pass: 102 file, 482 test; build production e scan web/Android verdi |
| Import browser | suite Playwright import | Pass 7/7: CSV, errori, commit/reload, categorie, duplicati, isolamento archive/legacy, rete ed export CSV |
| Cross-browser e mobile | quality suite Playwright | Pass 10/10: Chromium, WebKit, Pixel 5 e iPhone 13 emulati; 17/17 complessivi con la suite funzionale |
| Responsive/accessibilita | quality suite Playwright + Axe | 320/360/390/430 px, light/dark, focus trap, reduced motion, nessuna violazione serious/critical |
| Limite righe | quality suite Playwright | 20.000 righe su desktop e mobile emulato, 100 righe DOM e 200 pagine |
| PWA | progetto `pwa-chromium` | service-worker path e download template CSV |
| Android JVM | `npm run android:test` | Pass |
| Android lint | `npm run android:lint` | Pass |
| Android bundle debug | `npm run android:assemble:debug` | Pass; APK generato con asset Capacitor sincronizzati |
| Android instrumentation | `npm run android:test:instrumentation` | Pass: 34/34 su `aura_api_36` e riconfermato 34/34 su Pixel 9 Pro, Android 16/API 36 |
| Android WebView runtime | `npm run android:verify:webview` | Pass: bundled origin, cold start/restart, route reload, localStorage, IndexedDB, attachment e deep link |
| Android import WebView | `npm run android:verify:transaction-import-webview` | Pass su Pixel 9 Pro API 36 autenticato: 20.000 righe in 1.607 ms, 100 righe DOM, 200 pagine, template e accept CSV/XLSX |

Le fixture sono sintetiche. Il test principale intercetta le richieste e
fallisce su origini esterne diverse dai font e dal listener Firestore globale
gia usati dall'app; inoltre vieta endpoint AI e dati fixture nei payload. Il CSV esportato
protegge ogni campo stringa che potrebbe essere interpretato come formula da un
foglio elettronico.

## Dependency audit

`npm audit fix` ha aggiornato le dipendenze transitive compatibili, inclusa la
correzione di `brace-expansion`. `uuid` e forzato a `11.1.1` soltanto nel
sottoalbero `exceljs`; i test XLSX e la build verificano la compatibilita. I tool
Vite sono classificati come dipendenze di sviluppo.

Resta un advisory high su `react-router` 7.18.2
(`GHSA-qwww-vcr4-c8h2`). Alla data del controllo, il dist-tag npm `latest` e
7.18.2 e non esiste una release stabile corretta; il downgrade suggerito da npm
7.11.0 introduce numerosi advisory precedenti. Il caso riguarda RSC Mode,
azioni/server actions e risposte server, mentre Aura usa `BrowserRouter` come
SPA statica e non espone action RSC. Owner: frontend/security. Mitigazione:
mantenere disabilitati RSC/server actions, monitorare una release upstream
corretta e rieseguire audit e regression prima della release. Questo rischio
residuo non autorizza un claim generale di sicurezza.

L'audit completo segnala inoltre l'advisory development-only di `esbuild`
0.27.7, transitivo da `tsx`, relativo al dev server su Windows. Aura non usa
`tsx` come server distribuito e gli artifact production non includono esbuild.
Owner: developer tooling. Mitigazione: non esporre server di sviluppo in rete e
aggiornare `tsx` appena pubblica una dipendenza corretta.

## Gate manuali ancora aperti

- [x] Collegare `aura_api_36`, Android 16/API 36, e installare l'APK debug.
- [x] Eseguire `npm run android:test:instrumentation`: 34/34 test verdi su
  `aura_api_36` e Pixel 9 Pro con sincronizzazione debug obbligatoria.
- [x] Eseguire `npm run android:verify:webview`: cold start, persistenza, route
  reload, attachment e deep link verdi.
- [x] Nel WebView bundled autenticato validare 20.000 righe, paginazione e
  disponibilita template/input CSV/XLSX.
- [ ] Verificare manualmente il picker documenti Android, download/condivisione
  template e un commit/reload partendo da un file scelto dalla UI di sistema.
- [ ] Verificare TalkBack e almeno uno screen reader browser: annunci di step,
  error summary, progress, duplicate warning, conferma Uncategorized, focus trap
  e focus restore.
- [ ] Controllare manualmente light/dark e tastiera su un dispositivo fisico.

Il 2026-08-03 `aura_api_36` ha eseguito 34/34 instrumentation test. Il Pixel 9
Pro con immagine Play Store ha verificato Google Sign-In e il probe import
autenticato. Durante l'acceptance e stata individuata e corretta una build debug
mista: un comando Gradle poteva ricompilare asset web production con OAuth
nativo debug. Instrumentation e probe WebView ora sincronizzano/assemblano
sempre il profilo debug prima dell'esecuzione, protetti da test strutturale.

Lo stesso probe ha individuato una transizione `AnimatePresence mode="wait"`
che poteva lasciare visibile lo spinner dopo la validazione completata. Gli step
ora smontano immediatamente il contenuto precedente; il gate WebView e i test
React verificano la correzione.

## Decisione release

Stato corrente: **NO-GO** per chiudere M6/M7. Il codice e gli artifact automatici
sono candidati alla prova device; i gate manuali sopra restano release-blocking.
