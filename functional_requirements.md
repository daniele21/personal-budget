WebApp mobile di gestione e tracciamento del budget personale, con funzionalità di visualizzazione grafica delle spese e notifiche per il raggiungimento dei limiti di spesa.
Deve consentire agli utenti di inserire le proprie entrate e uscite, categorizzare le spese, e generare report mensili o settimanali. La webapp deve essere disponibile in PWA scaricabile da telefono e deve essere compatibile con i principali browser. Inoltre, deve offrire la possibilità di sincronizzare i dati con un account cloud per garantire la sicurezza e l'accessibilità da diversi dispositivi.
Le funzionalità principali includono:
1. Inserimento e gestione delle entrate e delle uscite.
2. Categorizzazione delle spese (es. alimentari, trasporti, intrattenimento).
3. Visualizzazione grafica delle spese per categoria e nel tempo.
4. Notifiche per il raggiungimento dei limiti di spesa predefiniti.
5. Generazione di report mensili o settimanali.
6. autenticazione con pannello admin per la gestione degli utenti e dei dati. l'admin deve poter dire chi puo accedere e chi no


Dashboard Intelligente
Panoramica Totale: Visualizzazione del saldo totale del portafoglio con indicatori di crescita.
Safe to Spend: Calcolo dinamico di quanto puoi spendere in sicurezza basato sul tuo budget mensile.
Analisi Rapida: Grafici a torta per la distribuzione delle spese per categoria e riepiloghi di entrate/uscite.
Transazioni Recenti: Accesso rapido agli ultimi movimenti effettuati.
2. Gestione Transazioni Avanzata
Inserimento Rapido: Utilizzo di un tastierino numerico personalizzato per un inserimento preciso degli importi.
Categorizzazione: Supporto per diverse categorie (Casa, Spesa, Trasporti, etc.) con possibilità di aggiungere categorie personalizzate.
Allegati: Possibilità di scattare foto o caricare immagini (come ricevute o scontrini) salvate localmente tramite IndexedDB.
Storico Completo: Ricerca e filtraggio avanzato delle transazioni per testo o categoria.
Grafici di Traiettoria: Visualizzazione dell'andamento del saldo nel tempo tramite grafici ad area.
3. Budgeting e Risparmio
Limiti di Spesa: Impostazione di budget mensili per singole categorie.
Monitoraggio in Tempo Reale: Barre di progresso che mostrano quanto del budget è stato utilizzato e quanto rimane.
Obiettivi di Risparmio: Monitoraggio dei progressi verso traguardi finanziari importanti (es. "Vacanze in Europa").
4. Spese Ricorrenti e Calendario
Scadenziario: Vista a calendario per monitorare bollette e abbonamenti ricorrenti.
Pianificazione: Gestione di pagamenti futuri per non dimenticare mai una scadenza.
5. Gestione Dati e Privacy
Import/Export CSV: Possibilità di esportare tutti i tuoi dati o importare transazioni e budget da file CSV esterni.
Dati Locali: Tutti i dati sono salvati nel browser dell'utente (LocalStorage e IndexedDB), garantendo la massima privacy.
Reset Completo: Funzione per cancellare istantaneamente tutti i dati archiviati.
6. Caratteristiche Tecniche
Mobile-First Design: Interfaccia ottimizzata per l'uso da smartphone, ma scalabile su desktop.
Animazioni Fluide: Transizioni curate tra le pagine grazie a Framer Motion.
Dark/Light Ready: Design basato su variabili CSS per una coerenza visiva totale.


Deve essere gestito in locale il database, utilizzando tecnologie come IndexedDB o LocalStorage per garantire la privacy e la sicurezza dei dati degli utenti. La webapp deve essere progettata con un design responsive, ottimizzato per l'uso su dispositivi mobili, ma accessibile anche da desktop. Inoltre, deve essere implementata una funzionalità di backup e ripristino dei dati tramite file CSV, consentendo agli utenti di esportare e importare le proprie transazioni e budget in modo semplice e sicuro.

