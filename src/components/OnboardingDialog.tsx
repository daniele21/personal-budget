import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { APP_CONFIG } from '../constants';
import { SavingsGoal } from '../types';
import { normalizeCategoryName } from '../domain/categories';
import { Switch } from './ui';

interface OnboardingDialogProps {
  isOpen: boolean;
  monthlyBudget: number;
  onSetMonthlyBudget: (value: number) => void;
  onAddCategory: (name: string) => void;
  onAddGoal: (goal: SavingsGoal) => void;
  cloudBackupEnabled: boolean;
  onSetCloudBackupEnabled: (enabled: boolean) => void;
  onComplete: () => void;
}

export function OnboardingDialog({
  isOpen,
  monthlyBudget,
  onSetMonthlyBudget,
  onAddCategory,
  onAddGoal,
  cloudBackupEnabled,
  onSetCloudBackupEnabled,
  onComplete,
}: OnboardingDialogProps) {
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudget));
  const [categoryInput, setCategoryInput] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  if (!isOpen) return null;

  const finish = () => {
    const parsedBudget = parseFloat(budgetInput);
    if (!isNaN(parsedBudget) && parsedBudget > 0) {
      onSetMonthlyBudget(parsedBudget);
    }

    categoryInput
      .split(',')
      .map(normalizeCategoryName)
      .filter(Boolean)
      .forEach(onAddCategory);

    const parsedTarget = parseFloat(goalTarget);
    if (goalName.trim() && !isNaN(parsedTarget) && parsedTarget > 0) {
      onAddGoal({
        id: Math.random().toString(36).slice(2, 11),
        name: goalName.trim(),
        targetAmount: parsedTarget,
        currentAmount: 0,
        createdAt: new Date().toISOString(),
      });
    }

    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-micro font-bold text-primary">First setup</p>
            <h3 id="onboarding-title" className="font-headline text-xl font-extrabold text-on-surface">
              Set up Aura
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Add the basics so budgets, reports, and backups are useful from the start.
            </p>
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high"
            aria-label="Skip setup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-micro font-bold text-on-surface-variant">
              Monthly budget ({APP_CONFIG.currency})
            </label>
            <input
              type="number"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              className="min-h-11 w-full rounded-xl border-none bg-surface-container-high px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-micro font-bold text-on-surface-variant">
              Additional categories
            </label>
            <input
              value={categoryInput}
              onChange={(event) => setCategoryInput(event.target.value)}
              className="min-h-11 w-full rounded-xl border-none bg-surface-container-high px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary"
              placeholder="e.g. Travel, Family, Education"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={goalName}
              onChange={(event) => setGoalName(event.target.value)}
              className="min-h-11 rounded-xl border-none bg-surface-container-high px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary"
              placeholder="Optional goal"
            />
            <input
              type="number"
              value={goalTarget}
              onChange={(event) => setGoalTarget(event.target.value)}
              className="min-h-11 rounded-xl border-none bg-surface-container-high px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary"
              placeholder="Target"
            />
          </div>

          <div
            className="flex w-full items-center justify-between rounded-2xl bg-surface-container-low p-4 text-left"
          >
            <div>
              <p className="text-sm font-bold text-on-surface">Encrypted cloud backup</p>
              <p className="text-xs text-on-surface-variant">Explicit opt-in; you can disable it later.</p>
            </div>
            <Switch
              checked={cloudBackupEnabled}
              onChange={() => onSetCloudBackupEnabled(!cloudBackupEnabled)}
              label="Toggle encrypted cloud backup"
            />
          </div>

          <button
            type="button"
            onClick={finish}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-headline text-sm font-extrabold text-on-primary active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Complete setup
          </button>
        </div>
      </motion.div>
    </div>
  );
}
