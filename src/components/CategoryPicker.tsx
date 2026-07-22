import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check, X, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface CategoryPickerProps {
  categories: string[];
  value: string;
  onChange: (category: string) => void;
  onAddCategory?: (name: string) => void;
  label?: string;
  disabled?: boolean;
  density?: 'default' | 'compact';
}

export const CategoryPicker = ({
  categories,
  value,
  onChange,
  onAddCategory,
  label = 'Category',
  disabled = false,
  density = 'default',
}: CategoryPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `${label.toLowerCase().replace(/\s+/g, '-')}-picker-title`;

  const closePicker = () => {
    setIsOpen(false);
    setIsAdding(false);
    setNewName('');
  };

  useFocusTrap(dialogRef, isOpen, closePicker);

  const selectedCategory = useMemo(
    () => categories.find((category) => category === value) ?? value ?? categories[0] ?? '',
    [categories, value],
  );

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (trimmed && !categories.includes(trimmed) && onAddCategory) {
      onAddCategory(trimmed);
      onChange(trimmed);
      setIsOpen(false);
    }
    setNewName('');
    setIsAdding(false);
  };

  const handleSelect = (category: string) => {
    onChange(category);
    setIsOpen(false);
    setIsAdding(false);
    setNewName('');
  };

  return (
    <>
      <div className={cn(density === 'compact' && 'h-full')}>
        {density === 'default' && (
          <label className="mb-2 block text-micro font-bold text-on-surface-variant">{label}</label>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          className={cn(
            'flex w-full items-center text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60',
            density === 'compact'
              ? 'h-full min-h-16 gap-2.5 rounded-none bg-transparent px-3.5 py-3 hover:bg-primary/5 disabled:hover:bg-transparent'
              : 'gap-3 rounded-2xl bg-surface-container-high px-4 py-3 hover:bg-surface-container-low disabled:hover:bg-surface-container-high',
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`${label}: ${selectedCategory || 'not selected'}. Choose category`}
        >
          <div className={cn(
            'flex flex-shrink-0 items-center justify-center',
            density === 'compact'
              ? 'h-8 w-8 rounded-lg bg-primary text-on-primary shadow-sm shadow-primary/20'
              : 'h-10 w-10 rounded-xl bg-surface-container-lowest',
          )}>
            <CategoryIcon
              category={selectedCategory}
              className={cn('h-4 w-4', density === 'compact' ? 'text-on-primary' : 'text-primary')}
            />
          </div>
          <div className="min-w-0 flex-1">
            {density === 'compact' && (
              <p className="mb-0.5 text-micro font-bold text-on-surface-variant">{label}</p>
            )}
            <p className={cn('truncate font-bold text-on-surface', density === 'compact' ? 'text-xs' : 'text-sm')}>
              {selectedCategory || 'Select category'}
            </p>
            {density === 'default' && (
              <p className="text-micro font-bold text-on-surface-variant">{disabled ? 'Locked for this budget' : 'Tap to choose'}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
        </button>
      </div>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close category picker"
            className="absolute inset-0"
            onClick={() => {
              closePicker();
            }}
          />

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-2xl sm:rounded-3xl border border-outline-variant/10"
          >
            <div className="flex items-center justify-between border-b border-outline-variant/10 px-5 py-4">
              <div>
                <h3 id={titleId} className="font-headline text-lg font-bold text-primary">{label}</h3>
                <p className="text-micro font-bold text-on-surface-variant">Choose one category</p>
              </div>
              <button
                type="button"
                onClick={closePicker}
                className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
                aria-label="Close category picker"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto overscroll-contain px-4 py-4">
              <div className="space-y-2" role="listbox" aria-label={label}>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    role="option"
                    aria-selected={value === category}
                    onClick={() => handleSelect(category)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all text-sm',
                      value === category
                        ? 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container-low',
                    )}
                  >
                    <CategoryIcon category={category} className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1">{category}</span>
                    {value === category && <Check className="w-4 h-4 flex-shrink-0" />}
                  </button>
                ))}

                {onAddCategory && (
                  isAdding ? (
                    <div className="rounded-2xl bg-surface-container-high p-3 space-y-3">
                      <input
                        autoFocus
                        className="w-full rounded-xl bg-surface-container-lowest border-none px-3 py-3 text-sm focus:ring-2 focus:ring-primary"
                        placeholder="New category..."
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleAdd();
                          if (event.key === 'Escape') {
                            setIsAdding(false);
                            setNewName('');
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button onClick={handleAdd} className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-on-primary" type="button">
                          Save Category
                        </button>
                        <button
                          onClick={() => {
                            setIsAdding(false);
                            setNewName('');
                          }}
                          className="rounded-xl bg-surface-container-low px-3 py-2.5 text-sm font-bold text-on-surface-variant"
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAdding(true)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-surface-container-high text-on-surface hover:bg-surface-container-low transition-all text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="font-bold">Add New Category</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
