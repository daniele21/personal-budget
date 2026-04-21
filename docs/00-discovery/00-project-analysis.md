# Analisi Progetto — Aura Finance

> **Data analisi:** 20 aprile 2026
> **Branch:** `main`
> **Stack:** React 19 · Vite 6 · TypeScript 5.8 · Tailwind CSS 4 · Framer Motion · Recharts · PapaParse · idb-keyval · Firebase (non utilizzato)

---

## 1. Stato attuale — Panoramica

### ✅ Cosa è presente e funzionante

| Area | Dettaglio |
|---|---|
| **Dashboard** | Saldo totale, Safe to Spend, income/expenses, spending by category (donut), transazioni recenti |
| **Aggiunta transazioni** | Tastierino numerico custom, categorie con icone, allegati foto via IndexedDB, metodo di pagamento, edit tramite route `/edit/:id` |
| **Storico** | Lista filtrata per testo e categoria, grafico ad area dell'andamento saldo, modifica e cancellazione inline |
| **Budget** | Creazione budget per categoria, progress bar spesa vs limite, riepilogo totale |
| **Ricorrenti** | Calendario mensile, CRUD bollette/abbonamenti con data scadenza e categoria |
| **Profilo** | Net worth, export CSV transazioni+budget, import CSV, reset dati, sezione account |
| **PWA** | `manifest.json` + Service Worker base |
| **Design** | Design system con variabili CSS (light + dark), font Manrope/Inter, animazioni Framer Motion |
| **Persistenza locale** | LocalStorage (transazioni, budget, categorie, preferenze) + IndexedDB (allegati immagine) |

### ❌ Cosa manca o è incompleto

| Area | Problema | Gravità |
|---|---|---|
| **Filtro temporale** | Dashboard, budget e safe-to-spend calcolano su **tutte le transazioni di sempre** anziché sul mese corrente | 🔴 Critico |
| **Autenticazione** | Login finto con utente hardcoded. Firebase è in `package.json` ma non è integrato | 🔴 Critico |
| **Pannello admin** | Requisito esplicito, completamente assente | 🔴 Critico |
| **Notifiche budget** | Nessun avviso al superamento dei limiti di spesa | 🔴 Alto |
| **Report periodici** | Nessuna vista report mensile/settimanale | 🟡 Alto |
| **Ricorrenti → transazioni** | Le spese ricorrenti non generano transazioni automatiche | 🟡 Alto |
| **Obiettivi di risparmio** | Hardcoded "European Vacation" al 70% — non è un modello dati | 🟡 Medio |
| **Calendario ricorrenti** | Mese hardcoded "October 2023", 31 giorni fissi, navigazione non funzionante | 🟡 Medio |
| **Indicatore +8.2%** | Valore fake in dashboard, non calcolato | 🟡 Medio |
| **Service Worker** | Cache solo su `/` e `/index.html` — offline reale non funziona | 🟡 Medio |
| **PWA icons** | Puntano a `picsum.photos` (CDN stock) — non funzionano offline | 🟡 Medio |
| **Test** | Zero test, nessun framework configurato | 🟡 Medio |
| **Validazione import CSV** | Nessun schema check, nessun feedback su righe malformate | 🟠 Basso-Medio |
| **Eliminazione budget** | Non è possibile rimuovere un budget creato | 🟠 Basso |
| **Ordinamento recenti** | `transactions.slice(0,3)` prende i primi per inserimento, non per data | 🟠 Basso |
| **Localizzazione** | Mix inglese/italiano nei requisiti, app tutta in inglese, formatter `en-IE` | 🟠 Basso |

---

## 2. Analisi UX/UI approfondita

### 2.1 Principi guida valutati

Ogni punto è valutato secondo questi principi di design per app finanziarie mobile-first:

- **Semplicità**: meno passaggi possibili per ogni azione
- **Gerarchia visiva**: l'informazione più importante domina visivamente
- **Affordance**: ogni elemento interattivo comunica chiaramente che è cliccabile
- **Feedback**: l'utente sa sempre cosa è successo dopo un'azione
- **Coerenza**: pattern ripetuti, mai reinventati
- **Accessibilità**: leggibilità, contrasto, touch target, semantica

---

### 2.2 Gerarchia visiva — Valutazione per pagina

#### Dashboard

| Elemento | Ruolo atteso | Stato attuale | Problema |
|---|---|---|---|
| **Saldo totale** | Informazione #1, primo colpo d'occhio | ✅ Grande, bold, in alto | OK — corretto posizionamento |
| **Safe to Spend** | Informazione #2, il numero che guida le decisioni quotidiane | ⚠️ Presente ma sotto una card decorativa | La card "You've saved X this month" occupa spazio premium e spinge il Safe to Spend più in basso. Invertire la priorità |
| **Card motivazionale "Keep it up"** | Elemento secondario, decorativo | ❌ Posizionata come informazione primaria | Occupa troppo spazio visivo con background `bg-primary` e icona. Dovrebbe essere un banner compatto o un toast, non una hero card |
| **Income / Expenses** | Metriche di supporto | ✅ Grid 2 colonne, bilanciato | OK |
| **Donut chart** | Distribuzione spese | ⚠️ Cerchio SVG custom con solo primary color | Manca una vera distribuzione multi-colore per categoria. Un solo arco non comunica proporzioni |
| **Transazioni recenti** | Quick access | ✅ Presente, compatto | OK struttura, ma non ordinate per data |

**Raccomandazione gerarchia Dashboard:**
```
1. Saldo totale (hero, invariato)
2. Safe to Spend (promosso — card primaria con progress bar)
3. Income / Expenses (grid compatta, invariato)
4. Spending by category (donut multi-colore reale)
5. Transazioni recenti (lista, invariato)
6. Card motivazionale (spostata in fondo o rimossa)
```

#### Aggiunta Transazione

| Elemento | Valutazione | Note |
|---|---|---|
| **Toggle Expense/Income** | ✅ Chiaro, pill design | Buon pattern |
| **Importo con tastierino** | ✅ Eccellente UX | Click → modal bottom sheet, cifre grandi, feedback immediato |
| **Titolo** | ✅ Input pulito | OK |
| **Categorie** | ⚠️ Chip con icone, buon pattern | Troppe categorie visibili tutte insieme su mobile possono creare scroll orizzontale implicito. Considerare grid 3 colonne con scroll verticale |
| **Data + Metodo pagamento** | ✅ Grid 2 colonne | OK, compatto |
| **Descrizione + Allegato** | ✅ Textarea + camera | OK |
| **Bottone salva** | ⚠️ In fondo alla pagina | Potrebbe non essere visibile senza scroll. Considerare sticky bottom |
| **Feedback salvataggio** | ❌ Usa `alert()` nativo del browser | Rompere l'esperienza con alert modali del browser è un anti-pattern grave in una PWA. Servono toast/snackbar inline |

#### Storico

| Elemento | Valutazione | Note |
|---|---|---|
| **Grafico traiettoria** | ✅ Area chart con gradient | Buon impatto visivo |
| **Ricerca** | ✅ Barra con icona, placeholder chiaro | OK |
| **Filtri categoria** | ✅ Chip scrollabili orizzontalmente | Buon pattern mobile |
| **Lista transazioni** | ⚠️ Bottoni edit/delete con `opacity-0 group-hover:opacity-100` | **Non funziona su mobile** — non c'è hover su touch. Le azioni devono essere accessibili tramite swipe o tap-to-expand |
| **Empty state** | ✅ Presente con icona e messaggio | OK |

#### Budget

| Elemento | Valutazione | Note |
|---|---|---|
| **Header con totale** | ✅ Card primary, progress bar, CTA "+" | Buona gerarchia |
| **Form aggiunta** | ✅ Modale inline animata | OK |
| **Lista budget** | ✅ Progress bar per categoria con "X left" | Chiaro e utile |
| **Manca** | ❌ Nessun modo per eliminare o modificare un budget | L'utente è bloccato dopo un errore |
| **Manca** | ❌ Nessun feedback visivo quando si supera il 100% | La barra si ferma, ma non c'è colore rosso, alert o indicazione "over budget" |

#### Ricorrenti

| Elemento | Valutazione | Note |
|---|---|---|
| **Calendario** | ⚠️ Grid 7 colonne, giorni cliccabili | Mese hardcoded, 31 giorni fissi. Non mostra il mese reale |
| **Form aggiunta** | ✅ Struttura coerente con BudgetsPage | OK |
| **Lista bollette** | ⚠️ Stessa issue di HistoryPage — azioni solo su hover | Non funziona su mobile |

#### Profilo

| Elemento | Valutazione | Note |
|---|---|---|
| **Net Worth** | ✅ Grande e prominente | OK |
| **Saving goal** | ❌ Card visivamente bellissima ma completamente hardcoded | L'utente non può creare, modificare o eliminare obiettivi |
| **Data Management** | ✅ Export/Import/Reset ben organizzati | OK struttura |
| **Your Accounts** | ⚠️ Sezione presente ma `INITIAL_ACCOUNTS` è array vuoto | L'utente vede una sezione vuota senza empty state |
| **Manca link al profilo utente** | ❌ Non c'è nella bottom nav | L'utente deve sapere che esiste — forse meglio in TopBar come avatar cliccabile |

#### Login

| Elemento | Valutazione | Note |
|---|---|---|
| **Branding** | ✅ Logo, nome, tagline, animazione | Curato |
| **CTA** | ⚠️ "Continue with Google" ma il login è fake | Potenziale confusione utente |
| **Footer** | ⚠️ "Terms of Service" e "Privacy Policy" sono link finti | Non portano da nessuna parte |

---

### 2.3 Problemi UX trasversali

#### 🔴 P0 — Bloccanti per l'usabilità reale

| # | Problema | Dove | Impatto |
|---|---|---|---|
| 1 | **I numeri mostrati sono sbagliati** — nessun filtro per mese corrente | Dashboard, Budget, Safe to Spend | L'utente prende decisioni finanziarie basate su dati errati |
| 2 | **`alert()` e `window.confirm()` nativi** usati ovunque per feedback e conferme | AddTransaction, HistoryPage, RecurringPage, ProfilePage | Rompe l'esperienza PWA, non è stilizzabile, non è accessibile |
| 3 | **Azioni su hover non funzionano su touch** | HistoryPage (edit/delete), RecurringPage (edit/delete) | Su mobile l'utente non può modificare o cancellare transazioni/bollette |

#### 🟡 P1 — Degradano significativamente l'esperienza

| # | Problema | Dove | Impatto |
|---|---|---|---|
| 4 | **Profilo non raggiungibile dalla bottom nav** | BottomNav | L'utente deve sapere che esiste la pagina profilo (è nell'app ma non navigabile direttamente — solo TopBar avatar, se fosse cliccabile, che non lo è) |
| 5 | **Nessun empty state per sezioni vuote** | Dashboard (nessuna transazione), Accounts (sempre vuoto), Budget (nessun budget) | L'utente nuovo vede pagine vuote senza guida |
| 6 | **Nessun onboarding** | Prima apertura | Nessuna guida per l'utente su cosa fare per primo |
| 7 | **Safe to Spend basato su budget fisso €5.000** hardcoded in `APP_CONFIG` | Dashboard | L'utente non può configurare il proprio budget mensile |
| 8 | **Donut chart monocromatico** | Dashboard | Un solo arco `primary` non comunica distribuzione per categoria |

#### 🟠 P2 — Miglioramenti di qualità

| # | Problema | Dove | Impatto |
|---|---|---|---|
| 9 | **Font size molto piccoli** — `text-[9px]`, `text-[10px]` usati massivamente | Ovunque | Leggibilità compromessa su schermi piccoli e per utenti con difficoltà visive |
| 10 | **Nessuna animazione di transizione tra route** | App.tsx | `AnimatePresence` è nel Layout ma non è wired correttamente (manca `key` basata su location) |
| 11 | **Touch target troppo piccoli** | Giorni calendario (aspect-square in grid 7 col), chip categorie | WCAG raccomanda minimo 44×44px |
| 12 | **Nessun feedback tattile** | Bottoni azioni | Manca haptic feedback o visual press state consistente |
| 13 | **Scroll content sotto top bar** | Layout `pt-18` fisso | Potrebbe non essere sufficiente su tutti i device/browser |

---

### 2.4 Design System — Valutazione

#### Punti di forza
- **Token CSS ben strutturati**: palette Material Design 3 completa (surface, primary, secondary, tertiary + variants)
- **Dark mode pronto**: variabili ridefinite in `:root.dark` — switch funzionante
- **Typography**: Manrope per headline, Inter per body — buona coppia
- **Border radius coerenti**: `rounded-2xl` e `rounded-3xl` usati con consistenza
- **Safe area iOS**: utility `safe-area-bottom` definita

#### Criticità
| Problema | Dettaglio |
|---|---|
| **Nessun componente riutilizzabile per Card** | Ogni pagina ricrea card con classi inline (`bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/5`). Andrebbe estratto in un componente `<Card>` |
| **Nessun componente Button** | Stili bottone ripetuti inline ovunque con varianti inconsistenti |
| **Nessun componente Modal/Dialog** | Usa `alert()` e `confirm()` nativi anziché un dialog stilizzato |
| **Nessun componente Toast/Snackbar** | Feedback azioni completamente assente nel design system |
| **Nessun componente Input** | Stili input ripetuti inline con classi verbose |
| **Nessun componente EmptyState** | Pattern ripetibile ma non estratto |
| **Colori funzionali non definiti** | Mancano token semantici: `--color-success`, `--color-warning`, `--color-danger` per stati budget |

---

### 2.5 Accessibilità (a11y)

| Criterio | Stato | Note |
|---|---|---|
| **Semantica HTML** | ⚠️ Parziale | Usa `<section>`, `<nav>`, `<header>`, `<main>` — buona base. Ma bottoni con `<div>` e click handler senza role |
| **aria-label** | ❌ Quasi assente | Solo il toggle dark mode ha `aria-label`. Tutti gli altri bottoni (bell, camera, delete, edit) ne sono privi |
| **Navigazione da tastiera** | ⚠️ Non testata | Nessun `tabIndex` esplicito, nessun focus trap sui modal |
| **Contrasto** | ⚠️ Critico sui testi piccoli | `text-[9px]` con `text-on-surface-variant` su `bg-surface-container-low` potrebbe non passare WCAG AA per testi piccoli |
| **Touch target** | ❌ Sotto minimo | Giorni calendario, chip, bottoni edit/delete sono sotto 44×44px |
| **Screen reader** | ❌ Non supportato | Grafici (SVG donut, Recharts) senza testo alternativo |
| **Motion** | ⚠️ No `prefers-reduced-motion` | Animazioni Framer Motion non rispettano la preferenza utente |

---

## 3. Architettura e qualità del codice

### Struttura attuale
```
src/
├── App.tsx              # Router + auth gate
├── constants.ts         # Config + initial data
├── types.ts             # TypeScript interfaces
├── main.tsx             # Entrypoint
├── index.css            # Design tokens + base styles
├── components/          # 5 componenti shared
├── hooks/               # useLocalStorage
├── lib/                 # cn() utility
├── pages/               # 7 pagine
└── utils/               # formatters
```

### Osservazioni

| Area | Valutazione |
|---|---|
| **Separazione responsabilità** | ⚠️ Le pagine contengono logica di business, calcoli, persistenza E rendering tutto insieme. Nessun layer di dominio separato |
| **State management** | ⚠️ Ogni pagina legge indipendentemente da LocalStorage con `useLocalStorage`. Nessun contesto condiviso — se due componenti leggono gli stessi dati, possono essere out of sync |
| **Componenti riutilizzabili** | ❌ Solo 5 componenti in `components/`. Card, Button, Input, Modal, Toast, EmptyState dovrebbero essere estratti |
| **Validazione dati** | ❌ Nessuno schema validation (Zod, Yup) sui dati in ingresso (CSV import, form, LocalStorage read) |
| **Error handling** | ❌ Nessun error boundary, nessun try-catch sui read da storage |
| **Performance** | ⚠️ `useLocalStorage` serializza/deserializza JSON ad ogni render. Per liste grandi (migliaia di transazioni) diventa un collo di bottiglia |

---

## 4. Priorità di intervento raccomandate

### Fase 1 — Fix critici (rendere i numeri corretti e l'app usabile su mobile)

1. **Filtro per mese corrente** su Dashboard, BudgetsPage, Safe to Spend
2. **Azioni touch su mobile** — sostituire hover con swipe-to-action o menu contestuale
3. **Sostituire `alert()`/`confirm()`** con componente Toast e Dialog custom
4. **Rendere il Profilo raggiungibile** — aggiungere alla bottom nav o rendere l'avatar cliccabile
5. **Ordinare transazioni recenti per data**

### Fase 2 — Funzionalità mancanti core

6. **Autenticazione reale** con Firebase Auth (già in dipendenze)
7. **Notifiche superamento budget** — banner inline + eventualmente Notification API
8. **Ricorrenti che generano transazioni** alla scadenza
9. **Budget mensile configurabile** dall'utente (non hardcoded €5.000)
10. **Eliminazione budget** e modifica

### Fase 3 — UX/UI polish

11. **Estrarre componenti design system**: Card, Button, Input, Dialog, Toast, EmptyState
12. **Empty states** per tutte le liste vuote (dashboard, budget, accounts, ricorrenti)
13. **Donut chart multi-colore** reale per distribuzione categorie
14. **Calcolo variazione % reale** al posto del +8.2% hardcoded
15. **Calendario ricorrenti dinamico** — mese reale, giorni corretti, navigazione
16. **Font size minimi a 12px** per leggibilità
17. **AnimatePresence con key su location** per transizioni route

### Fase 4 — Robustezza e qualità

18. **Context/store condiviso** per transazioni e budget (evitare read multipli da LocalStorage)
19. **Validazione schema** con Zod sui dati in ingresso
20. **Error boundary** a livello di app
21. **Test unitari** almeno per logica di calcolo (totali, filtri, budget progress)
22. **Service Worker con Workbox** per offline reale
23. **Icone PWA proprie** al posto di picsum.photos
24. **Obiettivi di risparmio dinamici** con CRUD
25. **Report mensili/settimanali** con confronto periodi

### Fase 5 — Accessibilità

26. **aria-label** su tutti i bottoni interattivi
27. **Focus trap** sui modal (NumericKeypad, form inline)
28. **prefers-reduced-motion** rispettato
29. **Touch target minimi 44×44px**
30. **Alt text** per grafici e immagini

---

## 5. Verdetto sintetico

> **L'app ha un'ottima base visiva e una struttura funzionale completa a livello di pagine, ma la logica di business è incompleta e in alcuni casi produce dati errati.** Il design è curato esteticamente ma la gerarchia informativa non sempre riflette l'importanza reale (card decorative sopra dati critici), l'interazione mobile è compromessa (hover-only actions), e il feedback utente è delegato ad `alert()` nativi.
>
> **Per diventare una webapp solida e utile servono principalmente:**
> 1. Numeri corretti (filtro temporale)
> 2. Interazioni che funzionino su touch
> 3. Feedback visivo inline
> 4. Componenti design system estratti e riutilizzabili
> 5. Le 3-4 funzionalità mancanti dal requisito (notifiche, report, auth, ricorrenti automatiche)
