import { Budget, RecurringExpense, SavingsGoal, Transaction } from '../types';

export type SearchEntity = 'transaction' | 'recurring' | 'budget' | 'goal' | 'category';

export interface SearchSource {
  transactions: Transaction[];
  recurring: RecurringExpense[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  categories: string[];
}

export interface SearchResult {
  id: string;
  entity: SearchEntity;
  title: string;
  subtitle: string;
  route: string;
  amount?: number;
  date?: string;
  score: number;
}

function normalize(value: string | number | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

function scoreText(query: string, fields: string[]): number {
  if (!query) return 0;
  let best = 0;
  for (const rawField of fields) {
    const field = normalize(rawField);
    if (!field) continue;
    if (field === query) best = Math.max(best, 100);
    else if (field.startsWith(query)) best = Math.max(best, 80);
    else if (field.includes(query)) best = Math.max(best, 55);
    else {
      const words = query.split(/\s+/).filter(Boolean);
      const matches = words.filter((word) => field.includes(word)).length;
      if (matches > 0) best = Math.max(best, Math.round((matches / words.length) * 45));
    }
  }
  return best;
}

function scoreAmount(query: string, amount?: number): number {
  if (amount === undefined) return 0;
  const numericQuery = query.replace(/[^\d.,-]/g, '').replace(',', '.');
  if (!numericQuery) return 0;
  const amountText = String(amount);
  if (amountText === numericQuery) return 90;
  if (amountText.includes(numericQuery)) return 50;
  return 0;
}

export function searchAura(source: SearchSource, rawQuery: string, limit = 30): SearchResult[] {
  const query = normalize(rawQuery);
  if (!query) return [];

  const results: SearchResult[] = [];

  source.transactions.forEach((transaction) => {
    const textScore = scoreText(query, [
      transaction.title,
      transaction.description,
      transaction.category,
      transaction.paymentMethod,
      transaction.date,
    ]);
    const score = Math.max(textScore, scoreAmount(query, transaction.amount));
    if (score > 0) {
      results.push({
        id: `transaction:${transaction.id}`,
        entity: 'transaction',
        title: transaction.title || transaction.category,
        subtitle: `${transaction.category} · ${transaction.paymentMethod}`,
        route: `/history?search=${encodeURIComponent(rawQuery.trim())}`,
        amount: transaction.type === 'expense' ? -transaction.amount : transaction.amount,
        date: transaction.date,
        score,
      });
    }
  });

  source.recurring.forEach((item) => {
    const score = Math.max(
      scoreText(query, [item.name, item.category, item.type ?? 'expense']),
      scoreAmount(query, item.amount),
    );
    if (score > 0) {
      results.push({
        id: `recurring:${item.id}`,
        entity: 'recurring',
        title: item.name,
        subtitle: `${item.category} · day ${item.dayOfMonth}`,
        route: '/recurring',
        amount: item.type === 'income' ? item.amount : -item.amount,
        score,
      });
    }
  });

  source.budgets.forEach((budget) => {
    const score = Math.max(scoreText(query, [budget.category, budget.currency]), scoreAmount(query, budget.limit));
    if (score > 0) {
      results.push({
        id: `budget:${budget.category}`,
        entity: 'budget',
        title: budget.category,
        subtitle: 'Budget limit',
        route: '/budgets',
        amount: budget.limit,
        score,
      });
    }
  });

  source.savingsGoals.forEach((goal) => {
    const score = Math.max(scoreText(query, [goal.name, goal.targetDate]), scoreAmount(query, goal.targetAmount));
    if (score > 0) {
      results.push({
        id: `goal:${goal.id}`,
        entity: 'goal',
        title: goal.name,
        subtitle: 'Savings goal',
        route: '/profile',
        amount: goal.targetAmount,
        date: goal.targetDate,
        score,
      });
    }
  });

  source.categories.forEach((category) => {
    const score = scoreText(query, [category]);
    if (score > 0) {
      results.push({
        id: `category:${category}`,
        entity: 'category',
        title: category,
        subtitle: 'Category',
        route: `/history?search=${encodeURIComponent(category)}`,
        score,
      });
    }
  });

  return results
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const left = a.date ? new Date(a.date).getTime() : 0;
      const right = b.date ? new Date(b.date).getTime() : 0;
      return right - left;
    })
    .slice(0, limit);
}

export function groupSearchResults(results: SearchResult[]): Record<SearchEntity, SearchResult[]> {
  return {
    transaction: results.filter((item) => item.entity === 'transaction'),
    recurring: results.filter((item) => item.entity === 'recurring'),
    budget: results.filter((item) => item.entity === 'budget'),
    goal: results.filter((item) => item.entity === 'goal'),
    category: results.filter((item) => item.entity === 'category'),
  };
}
