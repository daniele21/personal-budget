import { Transaction } from '../../types';

function isoDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function clampDay(year: number, monthIndex: number, day: number): number {
  return Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
}

/**
 * Builds a rich 12-month transaction ledger centered around the current date.
 * Populates all analytics, charts, annual reviews, comparison lenses, and filters.
 */
export function buildDemoTransactions(now = new Date()): Transaction[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const getDateForMonth = (monthsAgo: number, day: number) => {
    const targetDate = new Date(currentYear, currentMonth - monthsAgo, 1);
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    return isoDate(y, m, clampDay(y, m, day));
  };

  const date = (day: number) => getDateForMonth(0, day);
  const prevDate = (day: number) => getDateForMonth(1, day);

  // ─── Current Month (M0) Transactions ─────────────────────────────────
  const currentMonthTx: Transaction[] = [
    {
      id: 'demo-tx-salary-current',
      amount: 3200,
      type: 'income',
      category: 'Salary',
      date: date(1),
      title: 'Stipendio Mensile',
      description: 'Accredito stipendio Aura Corp',
      paymentMethod: 'Bank transfer',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-rent-current',
      amount: 1050,
      type: 'expense',
      category: 'Housing',
      date: date(2),
      title: 'Affitto Casa',
      description: 'Canone di locazione mensile',
      paymentMethod: 'Bank transfer',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-groceries-current',
      amount: 186.4,
      type: 'expense',
      category: 'Groceries',
      date: date(6),
      title: 'Spesa Settimanale Supermercato',
      description: 'Supermercato Bio',
      paymentMethod: 'Debit card',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-groceries-2-current',
      amount: 145.8,
      type: 'expense',
      category: 'Groceries',
      date: date(14),
      title: 'Spesa di Metà Mese',
      description: 'Alimentari e prodotti casa',
      paymentMethod: 'Debit card',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-groceries-3-current',
      amount: 79.8,
      type: 'expense',
      category: 'Groceries',
      date: date(21),
      title: 'Integrazione Spesa Fresca',
      description: 'Mercato rionale',
      paymentMethod: 'Cash',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-transport-current',
      amount: 54.9,
      type: 'expense',
      category: 'Transport',
      date: date(8),
      title: 'Abbonamento Mezzi Pubblici',
      description: 'Tessera mensile trasporti',
      paymentMethod: 'Debit card',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-dining-current',
      amount: 128.5,
      type: 'expense',
      category: 'Dining',
      date: date(12),
      title: 'Cena al Ristorante Stella',
      description: 'Cena con colleghi',
      paymentMethod: 'Credit card',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-dining-2-current',
      amount: 129.5,
      type: 'expense',
      category: 'Dining',
      date: date(19),
      title: 'Pranzo Gourmet & Apéro',
      description: 'Bistrot centro città',
      paymentMethod: 'Credit card',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-utilities-current',
      amount: 118.2,
      type: 'expense',
      category: 'Utilities',
      date: date(15),
      title: 'Bolletta Luce e Gas',
      description: 'Fattura utenze casa',
      paymentMethod: 'Direct debit',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-shopping-current',
      amount: 129.99,
      type: 'expense',
      category: 'Shopping',
      date: date(18),
      title: 'Abbigliamento Online',
      description: 'Acquisto capi di stagione',
      paymentMethod: 'Credit card',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-extra-tech-current',
      amount: 249.0,
      type: 'expense',
      category: 'Shopping',
      date: date(22),
      title: 'Monitor Esterno 4K',
      description: 'Schermo supplementare per postazione',
      paymentMethod: 'Credit card',
      verified: true,
      attachmentUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80',
      reportingClass: 'extra',
      reportingNote: 'Acquisto hardware straordinario per lavoro da remoto',
    },
    {
      id: 'demo-tx-reimbursement-current',
      amount: 180.0,
      type: 'income',
      category: 'Salary',
      date: date(24),
      title: 'Rimborso Spese Trasferta',
      description: 'Rimborso aziendale viaggio di lavoro',
      paymentMethod: 'Bank transfer',
      verified: true,
      reportingClass: 'reimbursement',
      reportingNote: 'Rimborso hotel e taxi conferenza',
    },
    {
      id: 'demo-tx-unverified-current',
      amount: 68.5,
      type: 'expense',
      category: 'Dining',
      date: date(25),
      title: 'Pranzo di Lavoro in Sospeso',
      description: 'In attesa di scontrino fiscale',
      paymentMethod: 'Apple Pay',
      verified: false,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-health-current',
      amount: 38.0,
      type: 'expense',
      category: 'Health',
      date: date(20),
      title: 'Farmacia e Integratori',
      description: 'Prodotti salute mensili',
      paymentMethod: 'Debit card',
      verified: true,
      reportingClass: 'regular',
    },
  ];

  // ─── Previous Month (M-1) Transactions ──────────────────────────────
  const previousMonthTx: Transaction[] = [
    {
      id: 'demo-tx-salary-previous',
      amount: 3200,
      type: 'income',
      category: 'Salary',
      date: prevDate(1),
      title: 'Stipendio Mese Scorso',
      description: 'Accredito stipendio mensile',
      paymentMethod: 'Bank transfer',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-rent-previous',
      amount: 1050,
      type: 'expense',
      category: 'Housing',
      date: prevDate(2),
      title: 'Affitto Mese Scorso',
      description: 'Canone di locazione',
      paymentMethod: 'Bank transfer',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-groceries-previous',
      amount: 214.8,
      type: 'expense',
      category: 'Groceries',
      date: prevDate(9),
      title: 'Spesa Grande Mese Scorso',
      description: 'Supermercato',
      paymentMethod: 'Debit card',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-groceries-2-previous',
      amount: 162.3,
      type: 'expense',
      category: 'Groceries',
      date: prevDate(22),
      title: 'Spesa Alimentari',
      description: 'Forniture per la casa',
      paymentMethod: 'Debit card',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-utilities-previous',
      amount: 142.5,
      type: 'expense',
      category: 'Utilities',
      date: prevDate(14),
      title: 'Utenze Acqua e Riscaldamento',
      description: 'Bolletta conguaglio',
      paymentMethod: 'Direct debit',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-dining-previous',
      amount: 94.0,
      type: 'expense',
      category: 'Dining',
      date: prevDate(18),
      title: 'Cena Pizzeria',
      description: 'Uscita serale',
      paymentMethod: 'Credit card',
      verified: true,
      reportingClass: 'regular',
    },
    {
      id: 'demo-tx-extra-appliance-previous',
      amount: 380.0,
      type: 'expense',
      category: 'Shopping',
      date: prevDate(20),
      title: 'Sostituzione Elettrodomestico',
      description: 'Nuovo lavastoviglie per cucina',
      paymentMethod: 'Credit card',
      verified: true,
      reportingClass: 'extra',
      reportingNote: 'Riparazione/sostituzione straordinaria casa',
    },
    {
      id: 'demo-tx-entertainment-previous',
      amount: 64.0,
      type: 'expense',
      category: 'Entertainment',
      date: prevDate(16),
      title: 'Cinema e Spettacolo',
      description: 'Biglietti teatro e cinema',
      paymentMethod: 'Credit card',
      verified: true,
      reportingClass: 'regular',
    },
  ];

  // ─── Historical Months (M-2 through M-11) Transactions ────────────────
  const historicalTx: Transaction[] = [];

  for (let m = 2; m <= 11; m++) {
    // Regular Salary
    historicalTx.push({
      id: `demo-tx-m${m}-salary`,
      amount: 3200,
      type: 'income',
      category: 'Salary',
      date: getDateForMonth(m, 1),
      title: `Stipendio M-${m}`,
      description: 'Accredito stipendio',
      paymentMethod: 'Bank transfer',
      verified: true,
      reportingClass: 'regular',
    });

    // Rent
    historicalTx.push({
      id: `demo-tx-m${m}-rent`,
      amount: 1050,
      type: 'expense',
      category: 'Housing',
      date: getDateForMonth(m, 2),
      title: 'Affitto Casa',
      description: 'Canone di locazione',
      paymentMethod: 'Bank transfer',
      verified: true,
      reportingClass: 'regular',
    });

    // Groceries (2 per month)
    historicalTx.push({
      id: `demo-tx-m${m}-groc-1`,
      amount: 170 + (m * 7) % 35,
      type: 'expense',
      category: 'Groceries',
      date: getDateForMonth(m, 7),
      title: 'Spesa Supermercato',
      description: 'Spesa alimentare',
      paymentMethod: 'Debit card',
      verified: true,
      reportingClass: 'regular',
    });

    historicalTx.push({
      id: `demo-tx-m${m}-groc-2`,
      amount: 140 + (m * 11) % 40,
      type: 'expense',
      category: 'Groceries',
      date: getDateForMonth(m, 21),
      title: 'Spesa Settimanale',
      description: 'Alimentari freschi',
      paymentMethod: 'Debit card',
      verified: true,
      reportingClass: 'regular',
    });

    // Utilities
    historicalTx.push({
      id: `demo-tx-m${m}-util`,
      amount: 110 + (m * 13) % 45,
      type: 'expense',
      category: 'Utilities',
      date: getDateForMonth(m, 15),
      title: 'Bollette Casa',
      description: 'Utenze luce e gas',
      paymentMethod: 'Direct debit',
      verified: true,
      reportingClass: 'regular',
    });

    // Transport
    historicalTx.push({
      id: `demo-tx-m${m}-transp`,
      amount: 54.9 + ((m % 2) === 0 ? 45 : 0),
      type: 'expense',
      category: 'Transport',
      date: getDateForMonth(m, 5),
      title: 'Trasporti & Carburante',
      description: 'Abbonamento e rifornimento',
      paymentMethod: 'Debit card',
      verified: true,
      reportingClass: 'regular',
    });

    // Dining
    historicalTx.push({
      id: `demo-tx-m${m}-dining`,
      amount: 65 + (m * 17) % 55,
      type: 'expense',
      category: 'Dining',
      date: getDateForMonth(m, 18),
      title: 'Ristoranti & Uscite',
      description: 'Cena weekend',
      paymentMethod: 'Credit card',
      verified: true,
      reportingClass: 'regular',
    });
  }

  // ─── Specific High-Impact Historical Events ──────────────────────────
  // Bonus Income in M-3
  historicalTx.push({
    id: 'demo-tx-m3-bonus',
    amount: 1450,
    type: 'income',
    category: 'Salary',
    date: getDateForMonth(3, 27),
    title: 'Premio Aziendale di Risultato',
    description: 'Bonus performance trimestrale',
    paymentMethod: 'Bank transfer',
    verified: true,
    reportingClass: 'regular',
  });

  // Reimbursement Income in M-4
  historicalTx.push({
    id: 'demo-tx-m4-reimbursement',
    amount: 340,
    type: 'income',
    category: 'Salary',
    date: getDateForMonth(4, 24),
    title: 'Rimborso Viaggio di Lavoro',
    description: 'Rimborso voli e hotel trasferta Roma',
    paymentMethod: 'Bank transfer',
    verified: true,
    reportingClass: 'reimbursement',
    reportingNote: 'Rimborso trasferta ufficiale',
  });

  // Extra Vacation Expense in M-7
  historicalTx.push({
    id: 'demo-tx-m7-vacation-extra',
    amount: 1250,
    type: 'expense',
    category: 'Shopping',
    date: getDateForMonth(7, 10),
    title: 'Soggiorno Estivo & Hotel',
    description: 'Prenotazione vacanza estiva',
    paymentMethod: 'Credit card',
    verified: true,
    attachmentUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
    reportingClass: 'extra',
    reportingNote: 'Spesa straordinaria vacanze estive',
  });

  // Extra Car Maintenance Expense in M-5
  historicalTx.push({
    id: 'demo-tx-m5-car-extra',
    amount: 540,
    type: 'expense',
    category: 'Transport',
    date: getDateForMonth(5, 12),
    title: 'Tagliando Auto & Cambio Gomme',
    description: 'Manutenzione straordinaria veicolo',
    paymentMethod: 'Debit card',
    verified: true,
    reportingClass: 'extra',
    reportingNote: 'Manutenzione veicolo straordinaria',
  });

  return [...currentMonthTx, ...previousMonthTx, ...historicalTx];
}
