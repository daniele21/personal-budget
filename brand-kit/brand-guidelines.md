# Aura Finance — Brand Kit v2

## Direzione: Safe-to-Spend Gauge

### 1. Brand idea

**Aura Finance** è un’app per capire rapidamente quanto puoi spendere, dove stanno andando i tuoi soldi e quali impegni ricorrenti hai davanti.

Il logo deve comunicare tre cose:

**Clarity**
L’utente apre l’app e capisce subito la propria situazione finanziaria.

**Control**
Il denaro non è percepito come qualcosa di caotico, ma come qualcosa che può essere letto, gestito e previsto.

**Confidence**
L’app non promette “diventa ricco”, ma “prendi decisioni quotidiane con più sicurezza”.

### 2. Concept logo

Il simbolo principale è composto da:

**Gauge semicircolare**
Rappresenta il concetto di safe-to-spend, cioè una lettura immediata dello stato finanziario.

**Lettera A astratta**
Rende il logo proprietario e legato al nome Aura.

**Ago / indicatore**
Indica consapevolezza, direzione e decisione.

**Segmenti colore**
I segmenti del gauge rappresentano stati finanziari diversi: controllo, sicurezza, attenzione.

### 3. Logo system

#### Logo primario

Uso principale per landing page, login screen, materiali pitch, header e documentazione.

Composizione:

* icona gauge a sinistra;
* wordmark “Aura Finance” a destra;
* “Aura” leggermente più pesante di “Finance”;
* spaziatura ampia, premium, leggibile.

#### Logo verticale

Uso per splash screen, presentazioni, copertine e materiali social.

Composizione:

* icona sopra;
* wordmark sotto;
* eventuale tagline sotto il wordmark.

#### App icon

Uso per PWA, favicon, mobile home screen e loading state.

Composizione consigliata:

* canvas quadrato neutro, senza angoli incorporati nel master;
* background chiaro o blu profondo;
* solo simbolo gauge + A;
* niente wordmark;
* ago e geometria identici al master approvato, senza ridisegni per piattaforma.

#### Regole esecutive per il simbolo quadrato

Il simbolo non deve essere deformato o ritagliato per adattarlo a un contenitore
quadrato. Il gauge e la A restano invariati; cambia solo il canvas che li
circonda.

* usare `aura-mark-light-square.png` su fondo chiaro;
* usare `aura-mark-dark-square.png` su fondo Deep Ocean/Dark Surface;
* mantenere il simbolo centrato e interamente visibile con margine costante;
* centrare il bounding box visibile del simbolo sul canvas con una tolleranza
  massima di 1 px per asse, senza compensazioni incorporate nel contenitore UI;
* usare sempre `object-fit: contain` nella UI, mai `cover`;
* per launcher adattivi e PWA maskable usare una variante con ulteriore area
  sicura, così le maschere circolari, squircle e rounded square non toccano il
  gauge;
* non usare il wordmark orizzontale come icona e non ricavare un quadrato
  tagliando i suoi bordi.

Mappatura canonica:

| Contesto | Asset | Regola |
|---|---|---|
| Login, documenti, presentazioni | `aura-logo-light.png` / `aura-logo-dark.png` | Wordmark completo, proporzioni originali |
| Top Bar e loading UI | `aura-mark-light-square.png` / `aura-mark-dark-square.png` | Canvas 1:1, `contain` |
| PWA generica | `icon-192.png` / `icon-512.png` | Canvas 1:1 |
| PWA maskable e Android adaptive icon | `icon-maskable-512.png` e mipmap derivati | Area sicura maggiorata |
| Apple touch icon | `apple-touch-icon.png` | 180×180 |
| Favicon | `favicon.png` | Monogramma semplificato a piccole dimensioni |

#### Monogramma

Uso per favicon, badge, loading spinner, watermark.

Composizione:

* solo “A” astratta;
* opzionalmente un mini arco semicircolare sopra;
* deve funzionare anche in monocromia.

### 4. Palette colore

#### Primary — Deep Ocean Blue

`#003461`

Uso:

* wordmark;
* elementi principali del logo;
* header;
* CTA principali;
* navigation active;
* app icon in versione dark.

Significato:

* fiducia;
* stabilità;
* controllo;
* ambito finance.

#### Secondary — Forest Green

`#1b6d24`

Uso:

* stato positivo;
* safe zone;
* crescita;
* budget sotto controllo;
* piccoli accenti nel logo.

Significato:

* sicurezza;
* equilibrio;
* denaro gestito bene.

#### Accent — Amber

`#f59e0b`

Uso:

* attenzione;
* soglia intermedia;
* alert soft;
* segmento destro del gauge.

Significato:

* energia;
* decisione;
* prudenza prima del rischio.

Da usare con moderazione. Non deve diventare il colore dominante.

#### Accent — Aura Cyan

`#06b6d4`

Uso:

* micro-highlight;
* grafici;
* hover;
* piccole parti del logo;
* insight visivi.

Significato:

* chiarezza;
* freschezza;
* immediatezza;
* interfaccia moderna.

#### Background — Aura Light

`#f3faff`

Uso:

* sfondi;
* card leggere;
* onboarding;
* landing page;
* proposal deck.

#### Dark Surface

`#0c1a24`

Uso:

* dark mode;
* app icon alternativa;
* footer;
* hero scure;
* splash screen.

### 5. Tipografia

#### Headline font

**Manrope**

Uso:

* logo wordmark;
* headline;
* numeri hero;
* sezioni principali;
* claim.

Peso consigliato:

* 800 per grandi metriche;
* 700 per headline;
* 600 per titoli sezione.

#### UI font

**Inter**

Uso:

* body copy;
* label;
* form;
* transazioni;
* microcopy;
* navigazione.

Peso consigliato:

* 500 per body;
* 600 per label importanti;
* 400 per caption e testo secondario.

### 6. Wordmark

Versione consigliata:

**Aura Finance**

Trattamento:

* “Aura” in peso 700/800;
* “Finance” in peso 400/500;
* tracking leggermente negativo su Aura;
* tracking normale su Finance;
* colore unico Deep Ocean Blue.

Variante possibile:

**Aura**
Da usare come short brand nell’app, nella PWA e nell’icona mobile.

### 7. Tagline

Tagline principale consigliata:

**Clarity today. Confidence tomorrow.**

È coerente con la proposta 3 e funziona bene perché non promette ricchezza o performance finanziaria. Promette chiarezza e sicurezza decisionale.

Alternative:

**Know what’s safe to spend.**

Più funzionale e diretta.

**Your money, clearly.**

Più minimal e consumer.

**Budget chiaro. Dati tuoi.**

Versione italiana, più coerente con privacy/local-first.

**Spend with clarity.**

Molto breve, adatta a landing e app store.

### 8. Tone of voice

Aura deve parlare in modo:

* chiaro;
* rassicurante;
* concreto;
* non paternalistico;
* non da banca;
* non da trading app;
* non da consulente finanziario.

Esempi coerenti con la lingua corrente dell'interfaccia:

Buono:
“You are still within budget this month.”

Buono:
“You can spend about €240 without exceeding your limits.”

Buono:
“Three recurring payments are due in the next 7 days.”

Da evitare:
“Maximize your wealth.”

Da evitare:
“Invest smarter with our intelligence.”

Da evitare:
“Become the CEO of your finances.”

### 9. Iconografia

Stile:

* line icons;
* stroke rounded;
* spessore 2px;
* forme semplici;
* niente dettagli eccessivi;
* no icone bancarie classiche.

Icone coerenti:

* gauge;
* shield soft;
* calendar;
* wallet minimale;
* receipt;
* pie/donut chart;
* recurring arrows;
* target;
* leaf per balance/growth;
* bell per reminder.

Icone da evitare:

* banconote realistiche;
* monete impilate;
* grafici stock in salita;
* edifici bancari;
* lucchetti troppo cyber;
* razzi/startup cliché.

### 10. UI direction

Lo stile visivo deve sembrare:

**mobile-first**
Tutto deve funzionare bene su piccolo schermo.

**calm fintech**
Finance, ma non aggressivo.

**data clarity**
I numeri devono essere i protagonisti.

**soft premium**
Card arrotondate, shadow leggere, colori puliti.

Principi UI:

* card bianche o light blue;
* ampi border radius;
* gerarchia numerica forte;
* microcopy chiaro;
* progress/gauge sempre leggibili;
* colori semantici, non decorativi.

### 11. Logo usage rules

#### Da fare

Usare il logo su sfondo chiaro con molto spazio.

Mantenere il gauge leggibile anche a dimensioni piccole.

Usare amber solo come accento.

Tenere la “A” abbastanza spessa da funzionare come app icon.

Preparare una versione monocromatica blu.

Preparare una versione white per sfondo scuro.

#### Da non fare

Non usare gradienti troppo glossy.

Non trasformare il gauge in un tachimetro automobilistico.

Non far sembrare l’ago una freccia da stock market.

Non usare troppi colori nel logo principale.

Non mettere il wordmark dentro l’app icon.

Non rendere il simbolo troppo complesso.

### 12. App icon spec

Versione consigliata:

* background: `#f3faff` oppure bianco;
* simbolo centrato;
* gauge blu/verde/amber;
* A blu;
* ago Deep Ocean Blue, coerente con il master del marchio;
* padding interno: 18–22%;
* nessun rounded corner incorporato nel master: la maschera viene applicata dal sistema operativo.

Versione dark:

* background: `#003461`;
* gauge in bianco/cyan/green;
* A bianca;
* ago verde o cyan.

Per la PWA, preparare:

* `icon-192.png`;
* `icon-512.png`;
* `icon-maskable-512.png`;
* `favicon.png`;
* `apple-touch-icon.png`.

### 13. Motion identity

Il logo resta statico nell'uso ordinario. Un'eventuale reveal di loading deve
concludersi sulla geometria approvata e non cambiare il significato del gauge:

**Loading**
Il gauge si disegna da sinistra a destra.

**Success state**
Il simbolo compare con un breve fade, senza cambiare la posizione dell'ago.

**Warning state**
Usare l'icona di stato dell'interfaccia; non alterare il marchio.

**Dashboard entry**
Nessuna animazione del logo: il movimento resta nei dati e nei controlli.

Movimento:

* rapido;
* morbido;
* niente bounce eccessivo;
* niente animazioni “gamificate”.

### 14. Brand application

#### Login screen

Usare:

* icona grande;
* wordmark “Aura”;
* tagline breve;
* CTA Google sign-in;
* promessa privacy sotto.

Esempio:

**Aura**
Clarity today. Confidence tomorrow.

Your private budget companion, built around your data.

#### Dashboard

Usare il linguaggio visivo del gauge per:

* safe-to-spend;
* monthly budget;
* recurring payment pressure;
* spending health;
* category risk.

#### Report

Usare:

* Deep Ocean Blue per dati principali;
* Forest Green per miglioramenti;
* Amber per attenzione;
* Tertiary/red solo per over-budget reale.

### 15. Digital implementation contract

#### Colore

* I valori esadecimali vivono nei token di `src/index.css`, non nei componenti.
* Deep Ocean/Primary comunica brand e azione; Forest Green comunica solo stato positivo.
* Amber comunica soglia o attenzione; Tertiary/Red è riservato a errore, rischio o superamento reale.
* Ogni token usato da una superficie deve avere una variante light e dark.

#### Tipografia

* Manrope è riservato a titoli, azioni e metriche; Inter resta il font del contenuto operativo.
* `micro` (10 px) è il minimo per badge e metadati non essenziali; il contenuto informativo usa almeno `caption` (12 px).
* Importi e percentuali usano cifre tabulari.

#### Copy

* L'interfaccia corrente usa inglese coerente finché non esiste un sistema di localizzazione completo.
* Non mescolare lingue nella stessa schermata o nello stesso flusso.
* Il tono è diretto, rassicurante e operativo; niente promesse di rendimento o linguaggio da trading.

#### Iconografia e motion

* Lucide è la libreria UI canonica; le illustrazioni SVG sono ammesse solo per dati, gauge e walkthrough.
* Emoji decorative non sostituiscono icone o label accessibili.
* Le transizioni standard durano circa 150–350 ms e rispettano `prefers-reduced-motion`.
* Il movimento del logo è riservato a loading o momenti di stato, non alla navigazione ordinaria.

### 16. Brand summary

Aura Finance deve sembrare:

* affidabile ma non bancaria;
* personale ma non giocattolosa;
* semplice ma non banale;
* moderna ma non fredda;
* finanziaria ma non aggressiva.

La proposta 3 funziona perché trasforma il valore principale del prodotto in simbolo:
**capire subito quanto è sicuro spendere.**
