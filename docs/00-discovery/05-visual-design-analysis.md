# 🎨 Visual Design Analysis — Aura Finance

> **Scope**: Audit e piano di miglioramento del sistema grafico per portare Aura a un livello visivo premium  
> **Baseline**: Material Design 3 tokens · Tailwind 4 `@theme` · Manrope + Inter · Lucide Icons  
> **Last Updated**: 2026-04-26 — aggiornato dopo implementazione token, accent colors, category themes, visualizzazioni

---

## Stato Implementazione

> [!NOTE]
> Diverse proposte dall'analisi originale sono state **già implementate**. Ogni sezione riporta lo stato attuale e il lavoro residuo.

| Item | Stato | Note |
|---|---|---|
| Token tipografici semantici | ✅ Implementato | `--font-size-micro` fino a `--font-size-hero` in `@theme` |
| Accent colors tokenizzati | ✅ Implementato | 5 accent colors (`purple`, `amber`, `cyan`, `pink`, `lime`) in `@theme` |
| Dark mode tuning | ✅ Implementato | Container con maggiore separazione + `outline-variant` più visibile |
| Category themes config-driven | ✅ Implementato | `src/config/categoryThemes.ts` — 10 categorie + fallback hash-based |
| CategoryIcon refactor | ✅ Implementato | 10 righe, usa `getCategoryTheme()` con colore dinamico |
| Sparkline | ✅ Implementato | `src/components/Sparkline.tsx` (27 righe) — SVG polyline |
| Radial Gauge | ✅ Implementato | `src/components/RadialGauge.tsx` (42 righe) — semi-cerchio animato |
| Animated counters | ✅ Implementato | `src/hooks/useAnimatedNumber.ts` (26 righe) — easeOut cubic |
| Card adoption ovunque | ❌ Non completato | Ancora 6 file con pattern inline |
| Staggered list animations | ❌ Non implementato | — |
| Page transition variants | ❌ Non implementato | — |
| Font-weight gerarchia | ❌ Non implementato | — |
| Tablet/desktop responsive | ❌ Non implementato | — |

---

## 1. 🏗️ Design System

### 1.1 Token di Colore ✅ Aggiornati

Il file [index.css](file:///Users/moltisantid/Personal/personal-budget/src/index.css) ora include **25 token** (righe 4-38) — 5 in più rispetto all'originale:

```
Nuovi token aggiunti:
  --color-accent-purple:  #8b5cf6   (riga 25)
  --color-accent-amber:   #f59e0b   (riga 26)
  --color-accent-cyan:    #06b6d4   (riga 27)
  --color-accent-pink:    #ec4899   (riga 28)
  --color-accent-lime:    #84cc16   (riga 29)
```

Questi accent colors sono usati nel [categoryThemes.ts](file:///Users/moltisantid/Personal/personal-budget/src/config/categoryThemes.ts) via `var(--color-accent-*)` — ✅ correttamente linkati ai CSS custom properties, quindi funzionano automaticamente in dark mode.

### 1.2 Token Tipografici ✅ Aggiunti

```css
--font-size-micro: 10px;    /* labels, badges */
--font-size-caption: 12px;  /* secondary text */
--font-size-body: 14px;     /* primary content */
--font-size-title: 16px;    /* section titles */
--font-size-headline: 24px; /* page headlines */
--font-size-hero: 36px;     /* balance, key metrics */
```

> [!WARNING]
> I token sono definiti ma **non ancora adottati**. Il codebase usa ancora `text-[10px]` direttamente in **35+ file** (inclusi i nuovi componenti: GlobalSearch, NotificationCenter, ComparisonSummary, SpendingHeatmap, ecc.). La migrazione a `text-micro` non è stata fatta.

**Lavoro residuo**: Sostituire `text-[10px]` → `text-micro`, `text-xs` → `text-caption`, ecc. in tutto il codebase.

**Effort**: 1 giorno (find & replace con verifica visiva)

---

### 1.3 Card Bypass — Ancora 6 File ❌

Pattern `bg-surface-container-lowest rounded-3xl` ancora usato direttamente in:
- `AddTransaction.tsx`
- `CalendarPage.tsx`
- `InsightsPage.tsx`
- `RecurringPage.tsx`
- `ConfirmDialog.tsx`
- `Card.tsx` stesso (definizione)

**Effort residuo**: 0.5 giorni

---

### 1.4 Dark Mode ✅ Migliorato

I container dark sono stati aggiornati con maggiore separazione:

```css
/* Prima → Dopo */
--color-surface:                 #0a1921 → #0c1a24   (+2 luminosità)
--color-surface-container-low:   #11222c → #132832   (+2)
--color-surface-container-lowest:#162a35 → #1a3040   (+4) ← cards più visibili
--color-surface-container-high:  #1c333f → #213a48   (+5) ← inputs più distinguibili
--color-surface-container-highest:#243d4a → #2a4858  (+6)
--color-outline-variant:         #334155 → #3d5568   (+10) ← bordi molto più visibili
```

**Completato** — il contrasto tra card e sfondo è ora adeguato.

---

## 2. 🔤 Tipografia

### 2.1 Font Stack — Invariato ✅

Manrope (headline) + Inter (body) — combinazione confermata eccellente.

### 2.2 Gerarchia Font-Weight ❌ Non Implementata

Il problema persiste: `font-bold` è usato ovunque (~120+ occorrenze), riducendo la gerarchia visiva.

**Gerarchia proposta** (invariata dall'originale):

```
Hero numbers:     font-extrabold (800) — solo per balance, importi principali
Section titles:   font-bold (700) — titoli sezione
Body emphasis:    font-semibold (600) — nomi transazioni, label importanti
Body text:        font-medium (500) — testo standard
Caption:          font-normal (400) — note, disclaimer, date
```

**Effort**: 1-1.5 giorni

---

## 3. 🎨 Palette Colore

### 3.1 Light Mode — Invariato ✅

Ocean blue (#003461) + forest green (#1b6d24) + dark crimson (#6e0009). Eccellente.

### 3.2 Dark Mode — Migliorato ✅

Vedi sezione 1.4. Il contrasto container è ora adeguato.

### 3.3 Accenti — Implementati ✅

5 accent colors sono ora tokenizzati e usati dal category theme system. Il donut chart nel Dashboard dovrebbe usare questi token invece dei valori hardcoded.

**Lavoro residuo**: Verificare che `DONUT_COLORS` nel Dashboard usi `var(--color-accent-*)` anziché hex.

**Effort residuo**: 0.25 giorni

---

## 4. 🖼️ Iconografia e Categorie ✅ Implementato

### 4.1 Category Themes Config-Driven ✅

[categoryThemes.ts](file:///Users/moltisantid/Personal/personal-budget/src/config/categoryThemes.ts) implementa esattamente la soluzione proposta:
- 10 categorie con icona Lucide + colore CSS var
- Funzione `getCategoryTheme()` con fallback intelligente
- `hashCategory()` per colore deterministico per categorie custom
- `Tag` come icona fallback per categorie custom (invece del generico `PieChart`)

### 4.2 CategoryIcon Refactored ✅

[CategoryIcon.tsx](file:///Users/moltisantid/Personal/personal-budget/src/components/CategoryIcon.tsx) ridotto da 42 a **10 righe**. Usa il colore del tema dinamicamente tramite `style={{ color: theme.color }}`.

**Completato** — nessun lavoro residuo.

---

## 5. ✨ Micro-Animazioni

### 5.1 Animated Counters ✅

[useAnimatedNumber.ts](file:///Users/moltisantid/Personal/personal-budget/src/hooks/useAnimatedNumber.ts) implementato con:
- Easing cubic (`1 - Math.pow(1 - progress, 3)`)
- `requestAnimationFrame` loop
- Cleanup con `cancelAnimationFrame`

**Lavoro residuo**: Verificare che sia usato nel Dashboard (balance, totals) e non solo definito.

---

### 5.2 Staggered List Animations ❌

**Non implementato**. Le liste transazioni appaiono tutte insieme.

**Soluzione** (invariata): Aggiungere `transition={{ delay: i * 0.04 }}` alle righe delle liste.

**Effort**: 0.5 giorni

---

### 5.3 Page Transition Variants ❌

**Non implementato**. Tutte le pagine usano ancora lo stesso `initial={{ opacity: 0, y: 20 }}`.

**Soluzione**: Differenziare per direzione di navigazione (forward = slide right, backward = slide left, modal = scale up).

**Effort**: 1 giorno

---

### 5.4 Progress Bar Animate on Mount 🟡 Parziale

Le progress bar nel `BudgetsPage` e `Dashboard` hanno `transition-all duration-1000`, ma non partono da 0% al mount. Il `RadialGauge` ha `transition-all duration-700` (meglio).

**Effort**: 0.25 giorni

---

## 6. 📊 Visualizzazioni Dati

### 6.1 Sparkline ✅

[Sparkline.tsx](file:///Users/moltisantid/Personal/personal-budget/src/components/Sparkline.tsx) (27 righe):
- SVG polyline con `strokeLinecap="round"`
- `role="img"` + `aria-label` ✅ accessibile
- Props: `values`, `color`, `label`

### 6.2 Radial Gauge ✅

[RadialGauge.tsx](file:///Users/moltisantid/Personal/personal-budget/src/components/RadialGauge.tsx) (42 righe):
- Semi-cerchio SVG con `strokeDasharray` animato
- Colore adattivo: verde (< 75%) → ambra (75-90%) → rosso (> 90%)
- `role="img"` + `aria-label` dettagliato ✅ accessibile

### 6.3 Year-Review Visualizzazioni ✅ (Nuove)

La directory `src/components/year-review/` contiene 5 componenti modulari:
- `AnnualSummaryCards.tsx` — KPI cards
- `MonthlyTrendChart.tsx` — grafico trend mensile
- `SpendingHeatmap.tsx` — heatmap 52×7
- `CategoryShift.tsx` — variazioni per categoria
- `AnnualHighlights.tsx` — highlight dell'anno

### 6.4 Compare Visualizzazioni ✅ (Nuove)

La directory `src/components/compare/` contiene 5 componenti modulari:
- `PeriodSelector.tsx` — selezione periodi
- `ComparisonSummary.tsx` — sommario comparativo
- `OverlayChart.tsx` — overlay chart
- `CategoryDelta.tsx` — delta per categoria
- `CompareInsights.tsx` — insight automatici

> [!TIP]
> Ottima scelta architetturale: le nuove feature sono state implementate come componenti modulari in sottocartelle dedicata. Questo pattern va applicato anche alle pagine monolitiche esistenti.

**Completato** — nessun lavoro residuo sulle visualizzazioni.

---

## 7. 🌐 Responsive e Tablet ❌

### Invariato dall'originale

L'app è ancora mobile-first senza layout multi-colonna per tablet/desktop. Il `Layout.tsx` usa `max-w-md mx-auto sm:max-w-xl md:max-w-2xl` — il contenuto è stretto al centro con spazio vuoto sui lati.

**Effort**: 2-3 giorni (bassa priorità)

---

## Riepilogo Lavoro Residuo

| Area | Item | Effort | Impatto | Priorità |
|---|---|---|---|---|
| 🏗️ Design System | Adozione Card component ovunque | 0.5 gg | 🟢 Consistenza | ⭐ P0 |
| 🏗️ Design System | Migrazione `text-[10px]` → `text-micro` | 1 gg | 🟡 Manutenibilità | P1 |
| 🎨 Palette | DONUT_COLORS → accent tokens | 0.25 gg | 🟢 Consistenza | P1 |
| 🔤 Tipografia | Gerarchia font-weight | 1-1.5 gg | 🟡 Gerarchia visiva | P2 |
| ✨ Animazioni | Staggered lists | 0.5 gg | 🟢 Premium feel | P1 |
| ✨ Animazioni | Page transition variants | 1 gg | 🟡 Navigazione fluida | P2 |
| ✨ Animazioni | Progress bar mount da 0% | 0.25 gg | 🟢 Polish | P2 |
| 🌐 Responsive | Tablet/desktop layout | 2-3 gg | 🟢 Multi-device | P3 |

### Effort Residuo Totale: ~7-8 giorni

Rispetto all'originale (12-16 giorni), **~6-8 giorni di lavoro sono già stati completati**.
