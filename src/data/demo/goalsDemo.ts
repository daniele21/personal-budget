import { SavingsGoal } from '../../types';

/**
 * Builds demo savings goals showcasing emergency funds, vacation funds,
 * and high-value purchases at various stages of completion.
 */
export function buildDemoGoals(year: number, month: number): SavingsGoal[] {
  const currentIso = new Date(year, month, 1).toISOString();
  
  return [
    {
      id: 'demo-goal-emergency',
      name: 'Fondo di Emergenza',
      targetAmount: 10000,
      currentAmount: 8200,
      targetDate: `${year}-12-31`,
      createdAt: currentIso,
    },
    {
      id: 'demo-goal-vacation',
      name: 'Vacanze in Giappone',
      targetAmount: 4500,
      currentAmount: 3150,
      targetDate: `${year + 1}-08-15`,
      createdAt: currentIso,
    },
    {
      id: 'demo-goal-tech',
      name: 'Nuovo Setup Lavoro',
      targetAmount: 2500,
      currentAmount: 1250,
      targetDate: `${year}-11-30`,
      createdAt: currentIso,
    },
  ];
}
