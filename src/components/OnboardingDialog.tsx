import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import { APP_CONFIG, INITIAL_CATEGORIES } from '../constants';
import { normalizeCategoryName } from '../domain/categories';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Button } from './ui/Button';

interface OnboardingDialogProps {
  isOpen: boolean;
  monthlyBudget: number;
  onSetMonthlyBudget: (value: number) => void;
  onAddCategory: (name: string) => void;
  onComplete: () => void;
}

export function OnboardingDialog({
  isOpen,
  monthlyBudget,
  onSetMonthlyBudget,
  onAddCategory,
  onComplete,
}: OnboardingDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<0 | 1>(0);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [additionalCategories, setAdditionalCategories] = useState<string[]>([]);
  useFocusTrap(dialogRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setBudgetInput(monthlyBudget > 0 ? String(monthlyBudget) : '');
    setBudgetError('');
    setCategoryInput('');
    setAdditionalCategories([]);
  }, [isOpen, monthlyBudget]);

  const parsedBudget = Number(budgetInput);
  const budgetIsValid = Number.isFinite(parsedBudget) && parsedBudget > 0;
  const categoryPreview = useMemo(
    () => [...INITIAL_CATEGORIES, ...additionalCategories],
    [additionalCategories],
  );

  if (!isOpen) return null;

  const continueToCategories = () => {
    if (!budgetIsValid) {
      setBudgetError('Enter a monthly spending limit greater than zero.');
      return;
    }
    setBudgetError('');
    setStep(1);
  };

  const addCategory = () => {
    const normalized = normalizeCategoryName(categoryInput);
    if (!normalized || categoryPreview.includes(normalized)) return;
    setAdditionalCategories((current) => [...current, normalized]);
    setCategoryInput('');
  };

  const finish = () => {
    if (!budgetIsValid) {
      setStep(0);
      setBudgetError('Enter a monthly spending limit greater than zero.');
      return;
    }
    onSetMonthlyBudget(parsedBudget);
    additionalCategories.forEach((category) => onAddCategory(category));
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-h-[min(92dvh,46rem)] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-5">
          <p className="text-micro font-bold text-primary">First setup · {step + 1} of 2</p>
          <h2 id="onboarding-title" className="font-headline text-xl font-extrabold text-on-surface">
            {step === 0 ? 'Set your monthly limit' : 'Review your categories'}
          </h2>
          <p id="onboarding-description" className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            {step === 0
              ? 'Aura uses this limit to calculate your budget progress and available spending. You can change it later.'
              : 'Aura includes a small starter set. Add anything you already know you need; categories remain editable later.'}
          </p>
        </div>

        {step === 0 ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              continueToCategories();
            }}
            noValidate
            className="space-y-5"
          >
            <div>
              <label htmlFor="onboarding-monthly-budget" className="mb-2 block text-micro font-bold text-on-surface-variant">
                Monthly spending limit ({APP_CONFIG.currency})
              </label>
              <input
                id="onboarding-monthly-budget"
                name="monthlyBudget"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                autoFocus
                value={budgetInput}
                onChange={(event) => {
                  setBudgetInput(event.target.value);
                  if (budgetError) setBudgetError('');
                }}
                aria-invalid={Boolean(budgetError)}
                aria-describedby="onboarding-budget-hint onboarding-budget-error"
                className="min-h-12 w-full rounded-xl border border-outline-variant/20 bg-surface-container-high px-3 text-base text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="For example, 1800"
              />
              <p id="onboarding-budget-hint" className="mt-2 text-xs text-on-surface-variant">
                This is your own planning limit, not an account balance.
              </p>
              <p id="onboarding-budget-error" role="alert" className="mt-2 min-h-4 text-xs font-medium text-error">
                {budgetError}
              </p>
            </div>

            <Button type="submit" fullWidth>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2" aria-label="Categories included in your budget">
              {categoryPreview.map((category) => {
                const removable = additionalCategories.includes(category);
                return (
                  <span
                    key={category}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface-container-high px-3 text-xs font-bold text-on-surface"
                  >
                    <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {category}
                    {removable && (
                      <button
                        type="button"
                        onClick={() => setAdditionalCategories((current) => current.filter((item) => item !== category))}
                        className="ml-1 rounded-full p-1 text-on-surface-variant hover:bg-surface-container-highest"
                        aria-label={`Remove ${category}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>

            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addCategory();
              }}
            >
              <div className="min-w-0 flex-1">
                <label htmlFor="onboarding-category" className="mb-2 block text-micro font-bold text-on-surface-variant">
                  Add another category
                </label>
                <input
                  id="onboarding-category"
                  value={categoryInput}
                  onChange={(event) => setCategoryInput(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-outline-variant/20 bg-surface-container-high px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  placeholder="For example, Pets"
                />
              </div>
              <button
                type="submit"
                disabled={!normalizeCategoryName(categoryInput)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container disabled:opacity-50"
                aria-label="Add category"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" fullWidth onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button type="button" fullWidth onClick={finish}>
                Finish setup
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
