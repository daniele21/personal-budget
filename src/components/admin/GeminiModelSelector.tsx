/**
 * GeminiModelSelector — Admin panel section for selecting the active Gemini model.
 *
 * Shows all available models with pricing info.
 * The selected model is saved to Firestore and used by all future AI calls.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  GEMINI_MODELS,
  DEFAULT_MODEL_ID,
  type ModelInfo,
} from '../../config/gemini';
import { getSelectedModelId, setSelectedModelId } from '../../lib/geminiUsage';

interface GeminiModelSelectorProps {
  adminEmail: string;
}

export function GeminiModelSelector({ adminEmail }: GeminiModelSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_MODEL_ID);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  /** Load the current model selection from Firestore */
  useEffect(() => {
    (async () => {
      try {
        const id = await getSelectedModelId();
        setSelectedId(id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** Save the new model selection to Firestore */
  const handleSelect = useCallback(async (modelId: string) => {
    if (modelId === selectedId || saving) return;

    setSaving(true);
    try {
      await setSelectedModelId(modelId, adminEmail);
      setSelectedId(modelId);
    } catch (err) {
      console.error('[GeminiModelSelector] Save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [selectedId, saving, adminEmail]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-on-surface">AI model</h2>
          <p className="text-xs text-on-surface-variant">Select the active Gemini model</p>
        </div>
      </div>

      {/* Model cards */}
      <div className="space-y-3">
        {GEMINI_MODELS.map((model) => {
          const isActive = model.id === selectedId;
          return (
            <button
              key={model.id}
              type="button"
              disabled={saving}
              onClick={() => handleSelect(model.id)}
              className={cn(
                'w-full text-left rounded-2xl border p-4 transition-all',
                isActive
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-outline-variant/10 bg-surface-container-low hover:bg-surface-container-high',
                saving && 'opacity-60 cursor-wait',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-on-surface">{model.name}</p>
                    {isActive && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-on-primary text-micro font-bold">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">{model.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-micro font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-lg">
                      {model.contextWindow}
                    </span>
                    <span className="text-micro text-on-surface-variant">
                      Input: <strong>${model.inputPrice.toFixed(3)}</strong>/1M tok
                    </span>
                    <span className="text-micro text-on-surface-variant">
                      Output: <strong>${model.outputPrice.toFixed(2)}</strong>/1M tok
                    </span>
                  </div>
                </div>
                {/* Selection indicator */}
                <span className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border flex-shrink-0 mt-1',
                  isActive ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/30',
                )}>
                  {isActive && <Check className="h-3 w-3" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
