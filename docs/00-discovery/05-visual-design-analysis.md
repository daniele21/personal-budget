# 🎨 Visual Design Analysis — Aura Finance

> **Scope**: Audit e piano di miglioramento del sistema grafico per portare Aura a un livello visivo premium  
> **Baseline**: Material Design 3 tokens · Tailwind 4 `@theme` · Manrope + Inter · Lucide Icons  
> **Last Updated**: 2026-08-03 — consolidato Brand Kit v2 e corretto il sistema logo/app icon

## Correzione identità applicativa — 2026-08-03

Il concept Safe-to-Spend Gauge resta il marchio canonico. Il problema rilevato
non richiedeva un redesign: derivava dall'uso del PNG rettangolare del simbolo
dentro contenitori quadrati con `object-cover` e dagli asset launcher/splash
Android rimasti al placeholder Capacitor.

La correzione introduce master quadrati light/dark, usa `object-contain` nella
UI, separa icone PWA `any` e `maskable`, aggiunge la Apple touch icon 180×180 e
allinea launcher adattivo, launcher legacy e splash Android al marchio Aura.
Wordmark, geometria del gauge, lettera A, ago, palette e tipografia non cambiano.

La revisione di dettaglio del logo ha poi rilevato uno scarto interno del
simbolo rispetto al canvas: nel master chiaro il bounding box risultava 18 px a
destra e 14,5 px in alto; la variante dark era ancora più sbilanciata. I master
sono stati ricomposti deterministicamente dalle fonti approvate, senza
ridisegnare il simbolo, e ora sono centrati entro 1 px. La correzione è stata
propagata a favicon, Apple touch icon, icone PWA `any`/`maskable`, launcher
Android legacy/adaptive/round e splash portrait/landscape.

## Consolidamento Brand Kit v2 — 2026-08-03

L'audit successivo conferma la direzione **calm fintech** già presente: Deep
Ocean resta l'ancora di fiducia e azione, Forest Green e Amber conservano un
ruolo esclusivamente semantico, mentre Manrope e Inter continuano a separare
gerarchia e contenuto operativo. Non emerge alcuna ragione per ridisegnare il
marchio.

Il kit diventa però un contratto digitale verificabile:

- i valori di palette vivono nel livello token, inclusa la variante RGB del
  primary necessaria alle ombre del tour in light e dark mode;
- card, controlli e tooltip riusano la scala di elevation condivisa invece di
  ombre locali;
- l'interfaccia resta in inglese fino all'introduzione di una localizzazione
  completa, evitando flussi con copy misto;
- Lucide resta il linguaggio iconografico canonico e le emoji decorative non
  sostituiscono icone o label;
- il movimento resta breve, orientativo e compatibile con reduced motion; il
  logo non viene animato nella navigazione ordinaria;
- un test di policy impedisce di reintrodurre colori esadecimali nelle superfici
  React e controlla la presenza degli asset quadrati canonici.

Il follow-up non bloccante riguarda la tipografia micro: badge e metadati
secondari possono restare a 10 px, ma i contenuti informativi residui sotto i
12 px dovranno essere normalizzati schermata per schermata dopo verifica di
densità e wrapping mobile.

## Regole visuali implementate — 2026-07-21

Questa sezione descrive lo stato corrente e sostituisce le indicazioni sperimentali precedenti su halo, gradient border ed elevation diffuse.

- Le card standard usano una superficie semantica uniforme, bordo sottile e sola separazione minima; non usano gradienti, glow o hover elevation.
- Control surface, tab e navigazione restano neutri. Le pseudo-superfici sfocate sono disattivate per card e controlli standard.
- Ogni schermata può avere al massimo un focal point inverso. Home usa Available to Spend; Budgets usa Monthly Category Budgets.
- Il colore comunica azione o stato: verde per positivo, ambra per soglia, rosso solo per condizioni negative o oltre limite.
- Home usa un’unica sparkline compatta per il cash flow invece del grafico a colonne completo.
- Budgets usa una barra lineare e percentuale esplicita; il grande gauge duplicato è stato rimosso.
- More e le superfici di lettura sono neutrali e condividono la stessa gerarchia in modalità chiara e scura.
- Importi e percentuali principali usano cifre tabulari; i controlli mantengono label accessibili e target adeguati.
- Il canvas light usa `#f6f8fb` e le card standard usano bianco puro; in dark mode restano superfici semantiche scure, non bianco forzato.
- Gradienti e profondità ambientale sono riservati alle superfici inverse. Le card standard ed elevated sono superfici piatte con bordo e ombra minima; i soft status usano wash uniformi.
- Overview, Categories, Compare, Year e Calendar applicano la stessa grammatica di focal summary senza introdurre nuove varianti Card.
- I controlli selezionati, incluse le tab locali Reports e Planning, usano primary pieno con stato accessibile equivalente.

La verifica automatica copre struttura e semantica. Il controllo browser a
390×844 è stato completato in light e dark mode: il mark 512×512 viene reso a
32×32 con `object-fit: contain`, non produce overflow orizzontale e seleziona
correttamente la variante tematica. La stessa verifica ha rimosso una `src`
avatar vuota e un annidamento HTML non valido nello skeleton della Dashboard;
la sessione pulita termina senza errori console.

## Visual polish v1 — 2026-07-21

### Tonal layering refinement — 2026-07-21

La direzione cromatica approvata sostituisce la gerarchia basata prevalentemente su card bianche, halo e ombre con una gerarchia di superfici: canvas blu-grigio, section plane, card standard, card dominante e control surface. Il bianco quasi puro viene riservato ai contenuti prioritari; le superfici semantiche usano wash cromatici contenuti e il rosso resta dedicato a condizioni negative o fuori soglia.

Dopo la prima verifica visuale, i wash focali sono stati aumentati fino a un livello chiaramente percepibile. La variante condivisa `colorized` è intenzionalmente opt-in: Dashboard la usa per hero e Cash Flow, mentre riepilogo Income/Spent, controlli e pannello KPI usano gradienti semantici dedicati. TopBar, BottomNav e contenuti di lettura restano neutri per bilanciare il ritmo cromatico.

Safe to Spend usa ora la variante condivisa `inverse`: una superficie Deep Ocean stabile che agisce come ancora visiva della Home. Il valore resta bianco e gli stati vengono comunicati da accento ambientale, gauge e status chip (`positive`, `warning`, `danger`) senza trasformare l'intera card in una superficie di errore. Token inverse dedicati garantiscono contrasto e separazione anche nella modalità scura globale.

La stessa grammatica inverse è stata estesa solo ai landmark finanziari principali: Safe to Spend e Budget Health nella schermata Budgets, Total Net Worth nel Profile e risultato netto annuale con Savings Rate nel Year Review. Ogni schermata mantiene una sola superficie scura; liste, form, grafici di dettaglio, impostazioni e controlli restano chiari. Add Transaction e Compare restano candidati opzionali da valutare dopo una verifica visuale complessiva.

Insights raggruppa i quattro KPI in un unico pannello 2×2 con separatori e toni interni, riducendo la sensazione di mosaico. Spending pace e cash-flow secondario usano section plane senza elevation; la card Overview mantiene un accento primario. Le nuove regole sono centralizzate in token e primitive condivise e mantengono la parità dark mode.

Implementato il primo restyling incrementale senza modificare logica finanziaria, modelli dati o destinazioni della navigazione:

- palette light neutralizzata tramite token semantici; dark mode invariata;
- card standard senza ombre o sollevamento hover, card elevated riservata alla hero Dashboard;
- shell consumer limitata a `md:max-w-2xl` finché non esiste un layout desktop dedicato;
- TopBar senza shadow, saluto o install action; installazione PWA ricollocata in More;
- BottomNav semplificata visivamente, mantenendo rotte e information architecture correnti;
- Dashboard riordinata come periodo, Available to spend, riepilogo Income/Spent, Cash flow e transazioni recenti;
- testi principali portati ad almeno 12 px, normale spesa resa neutra e CTA duplicate rimosse.

Rifinitura premium successiva: introdotta una scala di elevation CSS condivisa (`control`, `card`, `elevated`) con shadow multilivello e highlight interno, differenziata per light/dark mode. Gauge e Cash Flow sono stati ripuliti da accenti multicolore non necessari; il gauge usa ora un singolo colore semantico e segnala correttamente il budget superato anche quando il residuo è già limitato a zero.

La gerarchia cromatica usa ora border gradient e surface wash centralizzati nel componente `Card`: `primary` per contenuto dominante, `positive` per successo/disponibilità, `warning` per soglia alta e `danger` solo per limite superato. Card secondarie, controlli, TopBar e BottomNav mantengono gradienti molto più tenui per evitare competizione con la hero; tutte le varianti derivano dai token semantici e conservano la parità dark mode.

Il perimetro cromatico non usa più un `border` visibile: è renderizzato come halo esterno sfocato dietro una superficie opaca, così la separazione deriva da luce, colore e shadow senza produrre una linea netta. Anche i separatori della Dashboard sfumano verso le estremità.

La palette Aura è ora applicata come linguaggio operativo: Deep Ocean Blue/Cyan per azioni e analisi, Forest Green/Lime per entrate e andamento positivo, Amber per lente Actual e soglie alte, Crimson solo per budget realmente superato. Icon chip, status chip, stato attivo della navigazione, hero e Cash Flow usano questi accenti; le superfici secondarie restano neutre per preservare la gerarchia.

La proposta `Home | Transactions | Add | Budgets | More` resta un intervento separato e richiede ancora conferma dell'information architecture, come registrato nel piano compatto.

---

## Stato Implementazione

> [!NOTE]
> Diverse proposte dall'analisi originale sono state **già implementate**. Ogni sezione riporta lo stato attuale e il lavoro residuo.

| Item | Stato | Note |
|---|---|---|
| Token tipografici semantici | ✅ Implementato | `--font-size-micro` fino a `--font-size-hero` in `@theme` |
| Brand kit PNG applicato | ✅ Implementato | Wordmark, mark quadrati light/dark, favicon, PWA maskable, launcher e splash Android derivano dal sistema Aura |
| Contratto digitale Brand Kit v2 | ✅ Implementato | Token, copy inglese, Lucide, motion e asset canonici hanno regole esplicite e guardrail automatico |
| Densità UI compatta | ✅ Implementato | Header, nav, card, input, button, dashboard summary e liste usano padding e scale più contenute |
| Accent colors tokenizzati | ✅ Implementato | 5 accent colors (`purple`, `amber`, `cyan`, `pink`, `lime`) in `@theme` |
| Dark mode tuning | ✅ Implementato | Container con maggiore separazione + `outline-variant` più visibile |
| Category themes config-driven | ✅ Implementato | `src/config/categoryThemes.ts` — 10 categorie + fallback hash-based |
| CategoryIcon refactor | ✅ Implementato | 10 righe, usa `getCategoryTheme()` con colore dinamico |
| Sparkline | ✅ Implementato | `src/components/Sparkline.tsx` (27 righe) — SVG polyline |
| Radial Gauge | ✅ Implementato | `src/components/RadialGauge.tsx` (42 righe) — semi-cerchio animato |
| Animated counters | ✅ Implementato | `src/hooks/useAnimatedNumber.ts` (26 righe) — easeOut cubic |
| Card adoption ovunque | ✅ Implementato | Contenuti principali migrati a `Card`; overlay/modal restano superfici dedicate |
| Staggered list animations | ✅ Implementato | History usa delay controllato via helper |
| Page transition variants | ✅ Implementato | Transizioni centralizzate in `src/utils/motion.ts` |
| Font-weight gerarchia | 🟡 Parziale | Metriche hero e titoli principali normalizzati; resta polish fine su copy secondario |
| Tablet/desktop responsive | 🟡 Parziale | Shell mobile-wide mantenuta, con griglie leggere già presenti nei report |

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

I token sono ora adottati per il micro-copy: il codebase usa `text-micro` al posto di `text-[10px]`/`text-[9px]`.

---

### 1.3 Card Bypass ✅

Le superfici di contenuto principali usano `Card`. I pattern residui sono intenzionali per dialog/overlay (`ConfirmDialog`, `NotificationCenter`, `ReminderDialog`) oppure per la definizione stessa di `Card`.

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

### 2.2 Gerarchia Font-Weight 🟡 Parziale

La gerarchia è stata migliorata sulle metriche hero, card principali e sezioni estratte. Rimane un follow-up di fino per ridurre ulteriormente `font-bold` su copy secondario.

**Gerarchia proposta** (invariata dall'originale):

```
Hero numbers:     font-extrabold (800) — solo per balance, importi principali
Section titles:   font-bold (700) — titoli sezione
Body emphasis:    font-semibold (600) — nomi transazioni, label importanti
Body text:        font-medium (500) — testo standard
Caption:          font-normal (400) — note, disclaimer, date
```

**Follow-up**: audit visuale finale per distinguere caption, body emphasis e section titles.

---

## 3. 🎨 Palette Colore

### 3.1 Light Mode — Invariato ✅

Ocean blue (#003461) + forest green (#1b6d24) + dark crimson (#6e0009). Eccellente.

### 3.2 Dark Mode — Migliorato ✅

Vedi sezione 1.4. Il contrasto container è ora adeguato.

### 3.3 Accenti — Implementati ✅

5 accent colors sono ora tokenizzati e usati dal category theme system. Il donut chart nel Dashboard dovrebbe usare questi token invece dei valori hardcoded.

**Completato** — `DONUT_COLORS` usa token CSS (`var(--color-*)`) e non hex hardcoded.

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

**Completato** — usato in Dashboard per balance e safe-to-spend.

---

### 5.2 Staggered List Animations ✅

**Implementato** nella lista transazioni di History tramite `staggerDelay()`.

---

### 5.3 Page Transition Variants ✅

**Implementato** con helper centralizzati in `src/utils/motion.ts` (`pageTransition`, `slidePageTransition`, `staggerDelay`) e `MotionConfig reducedMotion="user"`.

---

### 5.4 Progress Bar Animate on Mount ✅

Dashboard e Budgets animano le progress bar da 0% dopo mount.

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

## 7. 🌐 Responsive e Tablet 🟡

### Invariato dall'originale

La direzione scelta è **mobile shell wide**, non desktop redesign. `Layout.tsx` mantiene il contenuto mobile-first ma arriva fino a `xl:max-w-6xl`; report e sezioni principali usano griglie leggere ai breakpoint esistenti.

---

## Riepilogo Lavoro Residuo

| Area | Item | Effort | Impatto | Priorità |
|---|---|---|---|---|
| Area | Item | Stato | Note |
|---|---|---|---|
| 🏗️ Design System | Card + typography token adoption | ✅ Implementato | Residui ammessi su overlay/modal |
| 🎨 Palette | Accent token usage | ✅ Implementato | Dashboard/Toast/Budgets usano token |
| 🔤 Tipografia | Font-weight hierarchy | 🟡 Parziale | Follow-up fine su copy secondario |
| ✨ Animazioni | Stagger, page transitions, progress mount | ✅ Implementato | Reduced motion rispettato |
| 🌐 Responsive | Mobile shell wide | 🟡 Parziale | Scelta confermata, senza desktop redesign |

### Effort Residuo

Resta polish visuale secondario su font-weight e ulteriori estrazioni/refinement responsive, non blocchi P0/P1.
