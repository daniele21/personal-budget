import React from 'react';
import { CreditCard, Landmark, ShieldCheck, Wallet } from 'lucide-react';
import { Account } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export function AccountList({ accounts }: { accounts: Account[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-headline font-bold text-primary">Your Accounts</h3>
      </div>
      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="group bg-surface-container-low p-4 rounded-2xl flex items-center justify-between transition-all border border-outline-variant/5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-sm border border-outline-variant/5">
                {account.type === 'checking' ? <Landmark className="w-5 h-5 text-primary" /> :
                  account.type === 'savings' ? <ShieldCheck className="w-5 h-5 text-secondary" /> :
                    account.type === 'credit' ? <CreditCard className="w-5 h-5 text-primary" /> :
                      <Wallet className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">{account.name}</p>
                <p className="text-micro text-on-surface-variant font-medium">{account.bank} - {account.lastFour}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm text-primary">{formatCurrency(account.balance)}</p>
              <p className="text-micro text-secondary font-bold">{account.status || account.apy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
