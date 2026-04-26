import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { CategoryUsage, categoryExists, normalizeCategoryName } from '../domain/categories';
import { cn } from '../lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { ConfirmDialog } from './ConfirmDialog';

interface CategoryManagerDialogProps {
  isOpen: boolean;
  categories: string[];
  archivedCategories: string[];
  usageCounts: Record<string, CategoryUsage>;
  onAdd: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  onRestore: (name: string) => void;
  onClose: () => void;
}

function usageLabel(usage?: CategoryUsage): string {
  if (!usage || usage.total === 0) return 'Non usata';
  return `Usata ${usage.total} ${usage.total === 1 ? 'volta' : 'volte'}`;
}

function usageDetail(usage?: CategoryUsage): string {
  if (!usage || usage.total === 0) return 'Questa categoria non risulta collegata a dati esistenti.';

  const parts = [
    usage.transactions > 0 ? `${usage.transactions} transazioni` : null,
    usage.budgets > 0 ? `${usage.budgets} budget` : null,
    usage.recurring > 0 ? `${usage.recurring} ricorrenti` : null,
  ].filter(Boolean);

  return `Questa categoria è usata ${usage.total} ${usage.total === 1 ? 'volta' : 'volte'} (${parts.join(', ')}). I dati esistenti non verranno cancellati, ma la categoria non sarà più selezionabile per nuovi inserimenti.`;
}

export function CategoryManagerDialog({
  isOpen,
  categories,
  archivedCategories,
  usageCounts,
  onAdd,
  onRename,
  onDelete,
  onRestore,
  onClose,
}: CategoryManagerDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [newName, setNewName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setNewName('');
      setEditingCategory(null);
      setEditingName('');
      setDeleteTarget(null);
    }
  }, [isOpen]);

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.localeCompare(b)), [categories]);
  const sortedArchivedCategories = useMemo(
    () => [...archivedCategories].sort((a, b) => a.localeCompare(b)),
    [archivedCategories],
  );
  const normalizedNewName = normalizeCategoryName(newName);
  const addDuplicate = normalizedNewName ? categoryExists(categories, normalizedNewName) : false;
  const canAdd = normalizedNewName.length > 0 && !addDuplicate;

  const normalizedEditingName = normalizeCategoryName(editingName);
  const editDuplicate = editingCategory
    ? categoryExists(categories, normalizedEditingName, editingCategory)
    : false;
  const canRename = Boolean(
    editingCategory
      && normalizedEditingName.length > 0
      && normalizedEditingName !== editingCategory
      && !editDuplicate,
  );

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd(normalizedNewName);
    setNewName('');
  };

  const beginEdit = (category: string) => {
    setEditingCategory(category);
    setEditingName(category);
  };

  const handleRename = () => {
    if (!editingCategory || !canRename) return;
    onRename(editingCategory, normalizedEditingName);
    setEditingCategory(null);
    setEditingName('');
  };

  const deleteUsage = deleteTarget ? usageCounts[deleteTarget] : undefined;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[140] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-title"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="flex max-h-[88svh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest shadow-2xl sm:rounded-3xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-outline-variant/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <h3 id="category-manager-title" className="font-headline text-lg font-extrabold text-on-surface">
                  Gestione categorie
                </h3>
                <p className="text-xs leading-relaxed text-on-surface-variant">
                  Aggiungi, rinomina o archivia le categorie disponibili.
                </p>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
              aria-label="Chiudi gestione categorie"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-outline-variant/10 p-5">
            <label htmlFor="new-category-name" className="mb-2 block text-micro font-bold text-on-surface-variant">
              Nuova categoria
            </label>
            <div className="flex gap-2">
              <input
                id="new-category-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAdd();
                }}
                className="min-h-11 flex-1 rounded-xl border-none bg-surface-container-high px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary"
                placeholder="Es. Viaggi"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-headline text-sm font-extrabold text-on-primary transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Aggiungi
              </button>
            </div>
            {addDuplicate && (
              <p className="mt-2 text-xs font-medium text-tertiary">Categoria già presente.</p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="px-2 pb-2 text-micro font-bold text-on-surface-variant">
              Attive
            </p>
            {sortedCategories.length === 0 ? (
              <div className="p-6 text-center text-sm text-on-surface-variant">Nessuna categoria configurata.</div>
            ) : (
              <div className="space-y-1">
                {sortedCategories.map((category) => {
                  const usage = usageCounts[category];
                  const isEditing = editingCategory === category;

                  return (
                    <div
                      key={category}
                      className="rounded-2xl px-2 py-2 transition-colors hover:bg-surface-container-low"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') handleRename();
                              if (event.key === 'Escape') {
                                setEditingCategory(null);
                                setEditingName('');
                              }
                            }}
                            className="min-h-10 flex-1 rounded-xl border-none bg-surface-container-high px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={handleRename}
                            disabled={!canRename}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary disabled:pointer-events-none disabled:opacity-50"
                            aria-label={`Salva categoria ${category}`}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(null);
                              setEditingName('');
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant"
                            aria-label="Annulla modifica categoria"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-high">
                            <CategoryIcon category={category} className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-on-surface">{category}</p>
                            <p
                              className={cn(
                                'text-[11px] font-medium',
                                usage?.total ? 'text-tertiary' : 'text-on-surface-variant',
                              )}
                            >
                              {usageLabel(usage)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => beginEdit(category)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container-high"
                            aria-label={`Modifica categoria ${category}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(category)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-tertiary transition-colors hover:bg-tertiary/10"
                            aria-label={`Archivia categoria ${category}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {isEditing && editDuplicate && (
                        <p className="mt-2 px-1 text-xs font-medium text-tertiary">Categoria già presente.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {sortedArchivedCategories.length > 0 && (
              <div className="mt-5 border-t border-outline-variant/10 pt-3">
                <p className="px-2 pb-2 text-micro font-bold text-on-surface-variant">
                  Archiviate
                </p>
                <div className="space-y-1">
                  {sortedArchivedCategories.map((category) => {
                    const usage = usageCounts[category];
                    return (
                      <div key={category} className="flex items-center gap-3 rounded-2xl px-2 py-2 opacity-80">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-high">
                          <CategoryIcon category={category} className="h-5 w-5 text-on-surface-variant" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-on-surface">{category}</p>
                          <p className="text-[11px] font-medium text-on-surface-variant">{usageLabel(usage)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRestore(category)}
                          className="min-h-10 shrink-0 rounded-xl bg-surface-container-high px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
                        >
                          Ripristina
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Archivia categoria"
        message={deleteTarget ? `${usageDetail(deleteUsage)} La categoria verrà archiviata e potrà essere ripristinata.` : ''}
        confirmLabel="Archivia"
        cancelLabel="Annulla"
        variant={deleteUsage?.total ? 'danger' : 'default'}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
