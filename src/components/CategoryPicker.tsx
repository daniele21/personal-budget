import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { CategoryIcon } from './CategoryIcon';

interface CategoryPickerProps {
  categories: string[];
  value: string;
  onChange: (category: string) => void;
  onAddCategory?: (name: string) => void;
  label?: string;
}

/**
 * Scrollable category list with optional "Add New" capability.
 * Designed to scale gracefully with many categories.
 */
export const CategoryPicker = ({
  categories,
  value,
  onChange,
  onAddCategory,
  label = 'Category',
}: CategoryPickerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (trimmed && !categories.includes(trimmed) && onAddCategory) {
      onAddCategory(trimmed);
      onChange(trimmed);
    }
    setNewName('');
    setIsAdding(false);
  };

  return (
    <div>
      <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">{label}</label>
      <div className="max-h-40 overflow-y-auto rounded-2xl bg-surface-container-high p-1.5 space-y-1 scrollbar-thin">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm',
              value === cat
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface hover:bg-surface-container-low',
            )}
          >
            <CategoryIcon category={cat} className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{cat}</span>
            {value === cat && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
          </button>
        ))}

        {/* Add new category */}
        {onAddCategory && (
          isAdding ? (
            <div className="flex items-center gap-2 px-1 pt-1">
              <input
                autoFocus
                className="flex-grow bg-surface-container-lowest border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                placeholder="New category..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') { setIsAdding(false); setNewName(''); }
                }}
              />
              <button onClick={handleAdd} className="p-2 bg-primary text-on-primary rounded-xl" type="button">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setIsAdding(false); setNewName(''); }} className="p-2 bg-surface-container-low text-on-surface-variant rounded-xl" type="button">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="font-bold">Add New</span>
            </button>
          )
        )}
      </div>
    </div>
  );
};
