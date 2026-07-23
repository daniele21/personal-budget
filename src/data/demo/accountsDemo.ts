import { Account } from '../../types';

/**
 * Builds realistic multi-account demo dataset showcasing checking, savings,
 * credit card, and cash wallet accounts with balances and APY rates.
 */
export function buildDemoAccounts(): Account[] {
  return [
    {
      id: 'demo-account-main',
      name: 'Conto Corrente Principale',
      bank: 'Aura Bank',
      lastFour: '2401',
      openingBalance: 5420,
      type: 'checking',
      status: 'active',
    },
    {
      id: 'demo-account-savings',
      name: 'Conto Deposito & Risparmi',
      bank: 'Aura Bank',
      lastFour: '8842',
      openingBalance: 12800,
      type: 'savings',
      apy: '3.5%',
      status: 'active',
    },
    {
      id: 'demo-account-credit',
      name: 'Carta di Credito Gold',
      bank: 'Aura Bank',
      lastFour: '9102',
      openingBalance: -480,
      type: 'credit',
      status: 'active',
    },
    {
      id: 'demo-account-cash',
      name: 'Portafoglio Contanti',
      bank: 'Contanti',
      lastFour: 'CASH',
      openingBalance: 240,
      type: 'cash',
      status: 'active',
    },
  ];
}
