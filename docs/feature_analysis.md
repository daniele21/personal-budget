# 🚀 Feature Analysis — Aura Finance

> **Scope**: 4 nuove feature selezionate per elevare Aura Finance da MVP a prodotto completo.  
> **Baseline**: Codebase attuale ~8.300 righe · React 19 · Vite 6 · TypeScript · Tailwind 4 · localStorage

---

## 1. 🔔 Push Notifications — Reminder & Budget Alerts

### Stato Attuale

L'app ha già un sistema di notifiche **in-app** funzionante:

- [useBudgetAlerts.ts](file:///Users/moltisantid/Personal/personal-budget/src/hooks/useBudgetAlerts.ts) — toast al 80% e 100% del budget per categoria
- [useRecurringAutoGenerate.ts](file:///Users/moltisantid/Personal/personal-budget/src/hooks/useRecurringAutoGenerate.ts) — toast quando ricorrenti vengono auto-generati
- [Toast.tsx](file:///Users/moltisantid/Personal/personal-budget/src/components/Toast.tsx) — sistema completo con 4 tipi (success/error/warning/info), animazioni, dismiss

Tuttavia questi funzionano **solo quando l'app è aperta**. Non esistono notifiche push reali.

Il [TopBar.tsx](file:///Users/moltisantid/Personal/personal-budget/src/components/TopBar.tsx) (riga 43-46) mostra un'icona Bell con un badge rosso statico — è puramente decorativa, non collegata a nessuna logica.

### Cosa Serve

| Componente | Descrizione | Complessità |
|---|---|---|
| **Notification Permission Flow** | UI per richiedere il permesso browser (`Notification.requestPermission()`) con spiegazione contestuale | 🟢 Bassa |
| **Notification Preferences** | Settings page per scegliere quali notifiche ricevere (budget alerts, scadenze ricorrenti, reminder personalizzati) | 🟡 Media |
| **Custom Reminders** | Possibilità di impostare reminder per date specifiche ("Ricorda di pagare X il giorno Y") | 🟡 Media |
| **Service Worker Integration** | Estendere [sw.js](file:///Users/moltisantid/Personal/personal-budget/public/sw.js) per gestire `self.registration.showNotification()` | 🟡 Media |
| **Scheduling Engine** | Logica per determinare quando mostrare le notifiche (scadenze ricorrenti, soglie budget) | 🟠 Media-Alta |

### Analisi Tecnica

**Approccio 1: Web Notifications API (Local-Only)** ⭐ Consigliato

Coerente con la filosofia local-first del progetto. Nessun server necessario.

```
Flusso:
1. L'utente abilita le notifiche dalle Preferences
2. Al login (o alla prima visita giornaliera), il SW verifica:
   - Bollette ricorrenti in scadenza oggi o domani
   - Budget oltre soglia 80%/100%
3. Il SW mostra una notifica nativa via self.registration.showNotification()
4. Il click sulla notifica apre la pagina rilevante
```

- **Pro**: zero dipendenze server, privacy totale, funziona offline
- **Con**: richiede che il SW sia attivo (funziona su mobile solo se PWA installata), non funziona con app chiusa su iOS Safari (limitazione Apple)
- **Limitazione iOS**: le Web Push Notifications su iOS funzionano **solo** se la PWA è installata sulla home screen (dal 2023, iOS 16.4+). Questo è un vincolo da documentare chiaramente nell'UX

**Approccio 2: Firebase Cloud Messaging (FCM)**

Richiederebbe un backend per schedulare le notifiche.

- **Pro**: funziona anche con browser chiuso su Android/desktop, più affidabile
- **Con**: richiede server, invia dati al cloud (viola la filosofia local-first), costo operativo, non funziona su iOS Safari senza PWA installata

> [!IMPORTANT]
> **Raccomandazione**: Approccio 1 (Local Web Notifications). È coerente con l'architettura local-first e copre il 90% dei casi d'uso senza aggiungere dipendenze server.

### Impatto su File Esistenti

| File | Modifica |
|---|---|
| `public/sw.js` | Aggiungere handler per `push` event e `notificationclick` |
| `src/types.ts` | Aggiungere `NotificationPreferences` e `CustomReminder` |
| `src/data/storageKeys.ts` | Aggiungere chiavi per preferences e reminders |
| `src/components/TopBar.tsx` | Collegare Bell icon a notification center |
| `src/pages/ProfilePage.tsx` | Aggiungere sezione Notification Settings |
| **NUOVO** `src/hooks/useNotifications.ts` | Hook per permission, scheduling, preferences |
| **NUOVO** `src/hooks/useNotificationScheduler.ts` | Logica di scheduling basata su ricorrenti e budget |
| **NUOVO** `src/components/NotificationCenter.tsx` | Pannello con lista notifiche recenti |
| **NUOVO** `src/components/NotificationPreferences.tsx` | UI per gestire le preferenze |
| **NUOVO** `src/components/ReminderDialog.tsx` | Dialog per creare reminder personalizzati |

### Stima Effort

| Fase | Effort |
|---|---|
| Permission flow + preferences UI | 1 giorno |
| Scheduling engine (ricorrenti + budget) | 1-2 giorni |
| Service worker integration | 0.5 giorni |
| Custom reminders (CRUD + scheduling) | 1-1.5 giorni |
| Notification center (lista + badge) | 1 giorno |
| Test + edge cases (iOS, permessi negati) | 0.5 giorni |
| **Totale** | **5-6 giorni** |

---

## 2. 🔍 Ricerca Globale

### Stato Attuale

L'app ha una ricerca **solo nella HistoryPage** ([HistoryPage.tsx](file:///Users/moltisantid/Personal/personal-budget/src/pages/HistoryPage.tsx), righe 456-467):

```tsx
// Ricerca attuale: solo transazioni, solo nella pagina History
const searchFilteredTransactions = periodTransactions.filter(t => {
  const normalizedSearch = search.toLowerCase();
  const matchesSearch = (
    t.title?.toLowerCase().includes(normalizedSearch) ||
    t.description?.toLowerCase().includes(normalizedSearch) ||
    t.category.toLowerCase().includes(normalizedSearch)
  );
  // ...
});
```

**Limitazioni attuali**:
- Cerca solo nelle transazioni (non budget, ricorrenti, goals, categorie)
- Disponibile solo nella pagina History, non accessibile globalmente
- Nessuna ricerca fuzzy o per importo
- Nessun recente/suggerimenti

### Cosa Serve

| Componente | Descrizione | Complessità |
|---|---|---|
| **Global Search Overlay** | Modale/sheet accessibile da qualsiasi pagina via TopBar o shortcut | 🟡 Media |
| **Multi-entity search** | Ricerca unificata su transazioni, ricorrenti, budget, goals, categorie | 🟡 Media |
| **Search results grouping** | Risultati organizzati per tipo con icone differenti | 🟢 Bassa |
| **Recent searches** | Cronologia delle ultime 5-10 ricerche | 🟢 Bassa |
| **Quick filters** | Filtri rapidi inline (tipo, periodo, range importo) | 🟡 Media |
| **Navigation** | Click su risultato naviga alla pagina/dettaglio rilevante | 🟢 Bassa |

### Analisi Tecnica

**Architettura proposta**: Command Palette pattern (stile Spotlight / ⌘K)

```
Flusso:
1. L'utente clicca sull'icona Search in TopBar (o preme ⌘K / Ctrl+K)
2. Si apre un overlay full-screen con input autofocused
3. Digitando, i risultati appaiono raggruppati per tipo:
   - 💳 Transazioni (titolo, descrizione, categoria, importo)
   - 🔄 Ricorrenti (nome, categoria)
   - 📊 Budget (categoria)
   - 🎯 Obiettivi (nome)
   - 🏷️ Categorie (nome)
4. Ogni risultato mostra: icona tipo, titolo, subtitle, importo (se applicabile)
5. Click/Enter naviga alla pagina rilevante
6. Le ricerche recenti vengono salvate in localStorage
```

**Indice di ricerca**: dato che i dati sono tutti in memoria (via AppContext), non serve un indice esterno. Un semplice filtro in-memory con `useMemo` è sufficiente per dataset tipici (< 10.000 transazioni).

Per dataset più grandi (futuro), si potrebbe considerare [Fuse.js](https://fusejs.io/) (~5KB) per fuzzy matching.

### Impatto su File Esistenti

| File | Modifica |
|---|---|
| `src/components/TopBar.tsx` | Aggiungere icona Search + handler apertura overlay |
| `src/data/storageKeys.ts` | Aggiungere chiave per `aura_recent_searches` |
| **NUOVO** `src/components/GlobalSearch.tsx` | Overlay principale con input + risultati |
| **NUOVO** `src/hooks/useGlobalSearch.ts` | Logica di ricerca multi-entity con debounce |
| **NUOVO** `src/domain/search.ts` | Pure functions per matching e scoring risultati |
| **NUOVO** `src/domain/__tests__/search.test.ts` | Unit test per la logica di ricerca |

### Stima Effort

| Fase | Effort |
|---|---|
| Domain logic (`search.ts` + tests) | 0.5 giorni |
| `useGlobalSearch` hook | 0.5 giorni |
| `GlobalSearch` overlay UI | 1-1.5 giorni |
| TopBar integration + keyboard shortcut | 0.5 giorni |
| Recent searches + localStorage | 0.5 giorni |
| Polish (animazioni, empty states, mobile) | 0.5 giorni |
| **Totale** | **3-4 giorni** |

---

## 3. 📊 Year-in-Review

### Stato Attuale

L'app ha report analitici nella [InsightsPage.tsx](file:///Users/moltisantid/Personal/personal-budget/src/pages/InsightsPage.tsx) con:

- Range selector (1W, 1M, 3M, 6M, YTD, 1Y, All) — riga 15-23
- Overview cards (Income, Expenses, Net) — riga 215-230
- Period-over-period change — riga 253-272
- Spending breakdown bar — riga 275-298
- Category-level detail con expand — riga 300-396
- Medie mensili per range multi-mese — riga 233-250

**Cosa manca per un "Year-in-Review"**: un report annuale dedicato, visualmente ricco, con statistiche aggregate, trend, achievements e una visualizzazione che l'utente possa condividere o salvare.

### Cosa Serve

| Componente | Descrizione | Complessità |
|---|---|---|
| **Annual Summary Cards** | Totale income, expenses, net, savings rate per anno | 🟢 Bassa |
| **Monthly Trend Chart** | Grafico a barre/area con andamento mese per mese | 🟡 Media |
| **Top Categories** | Top 5 categorie per spesa con percentuale e confronto con anno precedente | 🟢 Bassa |
| **Biggest Transaction** | La transazione più alta (income e expense) dell'anno | 🟢 Bassa |
| **Category Shift Analysis** | Quali categorie sono cresciute/diminuite rispetto all'anno precedente | 🟡 Media |
| **Achievements / Insights** | "Hai risparmiato X mesi su 12", "Il tuo mese migliore è stato Y" | 🟡 Media |
| **Spending Heatmap** | Heatmap giornaliero stile GitHub contributions per visualizzare pattern | 🟠 Media-Alta |
| **Screenshot/Share** | Possibilità di salvare il report come immagine (html2canvas) | 🟡 Media |

### Analisi Tecnica

**Architettura proposta**: nuova pagina dedicata `/year-review` con navigazione anno

```
Struttura della pagina:
┌─────────────────────────────────────┐
│  ← 2025    Year in Review    2026 → │
├─────────────────────────────────────┤
│  💰 Total Income    📉 Total Expenses│
│  💵 Net Savings     📊 Savings Rate  │
├─────────────────────────────────────┤
│  📈 Monthly Trend (BarChart)         │
│  [Jan][Feb][Mar]...[Dec]             │
├─────────────────────────────────────┤
│  🏆 Highlights                       │
│  • Best month: March (+€2,400)       │
│  • Biggest expense: Rent (€800)      │
│  • Saved 8/12 months                 │
├─────────────────────────────────────┤
│  🗓️ Spending Heatmap                 │
│  (365 cells, colored by daily spend) │
├─────────────────────────────────────┤
│  📊 Category Breakdown (donut)       │
│  vs Previous Year (delta %)          │
├─────────────────────────────────────┤
│  [📸 Save as Image] [📤 Share]      │
└─────────────────────────────────────┘
```

La logica di calcolo può riutilizzare molte funzioni esistenti da [finance.ts](file:///Users/moltisantid/Personal/personal-budget/src/domain/finance.ts) (`calculateTotals`, `filterByType`, `filterByCategory`, `sortByDateDesc`). Il chart mensile si costruisce con `filterByDateRange` già presente.

Per lo **Spending Heatmap**: serve un componente SVG custom con 365 celle (7 righe × 52 colonne). Ogni cella colorata in base all'intensità della spesa giornaliera. Pattern visivo identico a GitHub contributions.

Per il **Share/Screenshot**: `html2canvas` (~40KB) per catturare la sezione come PNG. Alternativa: `dom-to-image-more` (~6KB, più leggero).

### Impatto su File Esistenti

| File | Modifica |
|---|---|
| `src/App.tsx` | Aggiungere route `/year-review` |
| `src/domain/finance.ts` | Aggiungere `filterByYear()`, `getMonthlyBreakdown()`, `getAnnualHighlights()` |
| `src/domain/__tests__/finance.test.ts` | Test per le nuove funzioni |
| `src/components/BottomNav.tsx` o `ProfilePage.tsx` | Link di navigazione al report |
| **NUOVO** `src/pages/YearReviewPage.tsx` | Pagina orchestratore |
| **NUOVO** `src/components/year-review/AnnualSummaryCards.tsx` | Cards riassuntive |
| **NUOVO** `src/components/year-review/MonthlyTrendChart.tsx` | BarChart mensile |
| **NUOVO** `src/components/year-review/SpendingHeatmap.tsx` | Heatmap SVG |
| **NUOVO** `src/components/year-review/CategoryShift.tsx` | Confronto categorie YoY |
| **NUOVO** `src/components/year-review/AnnualHighlights.tsx` | Achievement cards |

### Stima Effort

| Fase | Effort |
|---|---|
| Domain functions + tests | 1 giorno |
| Annual summary cards + highlights | 1 giorno |
| Monthly trend chart (Recharts) | 0.5 giorni |
| Spending heatmap SVG | 1-1.5 giorni |
| Category shift analysis | 0.5 giorni |
| Share/screenshot | 0.5 giorni |
| Page orchestration + navigation | 0.5 giorni |
| Polish + responsive + dark mode | 1 giorno |
| **Totale** | **6-7 giorni** |

---

## 4. ⚖️ Confronta Periodi

### Stato Attuale

La InsightsPage ha già un **confronto periodo-over-periodo implicito** ([InsightsPage.tsx](file:///Users/moltisantid/Personal/personal-budget/src/pages/InsightsPage.tsx)):

- `prevPeriodTx` calcolato automaticamente (riga 111)
- `expenseChange` con % (riga 165-167)
- Variazione per categoria con `cat.change` (righe 146-147)
- Banner "Expenses down/up X% vs previous period" (riga 253-272)

**Tuttavia**: il confronto è automatico e mostra solo il periodo immediatamente precedente. L'utente non può scegliere quali due periodi confrontare, né vedere un confronto dettagliato affiancato.

### Cosa Serve

| Componente | Descrizione | Complessità |
|---|---|---|
| **Period Selector (A vs B)** | Due date-range picker per scegliere i periodi da confrontare | 🟡 Media |
| **Preset comparisons** | "Questo mese vs mese scorso", "Q1 vs Q2", "2025 vs 2024" | 🟢 Bassa |
| **Side-by-side summary** | Colonne affiancate con Income, Expenses, Net, Savings rate | 🟢 Bassa |
| **Category comparison** | Per ogni categoria: importo A, importo B, delta %, trend | 🟡 Media |
| **Trend overlay chart** | Due linee sovrapposte sullo stesso grafico per confronto visivo | 🟡 Media |
| **Delta highlights** | "Hai speso €200 in meno in Dining", "Transport è cresciuto del 45%" | 🟢 Bassa |

### Analisi Tecnica

**Due opzioni di collocazione**:

**Opzione A**: Sotto-sezione/tab nella InsightsPage esistente
- Pro: riusa il context e la navigazione già presente
- Con: la pagina è già densa (400 righe)

**Opzione B**: Pagina dedicata `/compare` ⭐ Consigliato
- Pro: separazione chiara, più spazio per il confronto dettagliato
- Con: nuova route da aggiungere

```
Struttura della pagina:
┌─────────────────────────────────────┐
│  Compare Periods                     │
├─────────────────────────────────────┤
│  [Preset: This vs Last Month ▼]     │
│                                      │
│  Period A: [Apr 2026    ]            │
│  Period B: [Mar 2026    ]            │
├──────────────┬──────────────────────┤
│  Period A    │  Period B             │
│  Income €X   │  Income €Y   (+Z%)   │
│  Expenses €X │  Expenses €Y (-Z%)   │
│  Net €X      │  Net €Y      (+Z%)   │
├──────────────┴──────────────────────┤
│  📈 Overlay Chart (2 lines)         │
├─────────────────────────────────────┤
│  Category Comparison                 │
│  🏠 Housing    €500 → €480  ▼ -4%  │
│  🍕 Dining     €200 → €350  ▲ +75% │
│  🚗 Transport  €150 → €150  ─  0%  │
├─────────────────────────────────────┤
│  💡 Key Insights                     │
│  "Biggest increase: Dining (+€150)" │
│  "Biggest decrease: Shopping (-€80)"│
└─────────────────────────────────────┘
```

Gran parte della logica può riutilizzare codice esistente:
- `filterByDateRange` da `finance.ts`
- `calculateTotals` da `finance.ts`
- `filterByType`, `filterByCategory` da `finance.ts`
- Il pattern di `getDateRange()` da InsightsPage (da estrarre in `finance.ts`)

### Impatto su File Esistenti

| File | Modifica |
|---|---|
| `src/App.tsx` | Aggiungere route `/compare` |
| `src/domain/finance.ts` | Estrarre `getDateRange()` da InsightsPage + aggiungere `comparePeriods()`, `getCategoryDelta()` |
| `src/domain/__tests__/finance.test.ts` | Test per le nuove funzioni |
| `src/pages/InsightsPage.tsx` | Refactor: estrarre `getDateRange` e `filterByRange` in `finance.ts` |
| `src/components/BottomNav.tsx` o `InsightsPage.tsx` | Link di navigazione |
| **NUOVO** `src/pages/ComparePage.tsx` | Pagina orchestratore |
| **NUOVO** `src/components/compare/PeriodSelector.tsx` | Dual period picker con preset |
| **NUOVO** `src/components/compare/ComparisonSummary.tsx` | Side-by-side cards |
| **NUOVO** `src/components/compare/CategoryDelta.tsx` | Lista categorie con delta |
| **NUOVO** `src/components/compare/OverlayChart.tsx` | Grafico sovrapposto |
| **NUOVO** `src/components/compare/CompareInsights.tsx` | Highlights automatici |

### Stima Effort

| Fase | Effort |
|---|---|
| Domain functions + refactor InsightsPage | 1 giorno |
| Period selector + presets | 1 giorno |
| Side-by-side summary | 0.5 giorni |
| Category delta list | 0.5 giorni |
| Overlay chart (Recharts) | 1 giorno |
| Auto-generated insights | 0.5 giorni |
| Polish + responsive + dark mode | 0.5 giorni |
| **Totale** | **5-6 giorni** |

---

## Riepilogo Comparativo

| Feature | Complessità | Effort | Dipendenze Esterne | Impatto UX |
|---|---|---|---|---|
| 🔔 Push Notifications | 🟠 Media-Alta | 5-6 giorni | Nessuna (Web API) | 🔴 Alto |
| 🔍 Ricerca Globale | 🟡 Media | 3-4 giorni | Opzionale: Fuse.js | 🔴 Alto |
| 📊 Year-in-Review | 🟡 Media | 6-7 giorni | Opzionale: html2canvas | 🟡 Medio-Alto |
| ⚖️ Confronta Periodi | 🟡 Media | 5-6 giorni | Nessuna | 🟡 Medio-Alto |

### Ordine di Implementazione Consigliato

```
1. 🔍 Ricerca Globale      → 3-4 giorni (quick win, alto impatto, bassa complessità)
2. ⚖️ Confronta Periodi    → 5-6 giorni (riusa molto codice esistente)
3. 📊 Year-in-Review        → 6-7 giorni (feature "wow", standalone)
4. 🔔 Push Notifications    → 5-6 giorni (più complessa, limitazioni iOS)
```

> [!TIP]
> La Ricerca Globale è la feature con il miglior rapporto effort/impatto. Migliora drasticamente la navigabilità e si integra con tutte le altre feature. Il Confronta Periodi beneficia dal refactoring della InsightsPage che prepara il terreno per il Year-in-Review.

**Effort totale stimato: 19-23 giorni di lavoro**
