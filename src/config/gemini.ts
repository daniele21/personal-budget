/**
 * Gemini AI configuration.
 *
 * - API key is read from VITE_GEMINI_API_KEY in .env
 * - Model list and pricing are defined here for admin selection
 * - The active model is persisted to Firestore by the admin
 * - Default model is used when no Firestore config exists
 */

// ─── API Key ─────────────────────────────────────────────────────────

/** Client-exposed API key. Set via VITE_GEMINI_API_KEY in .env */
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// ─── Model definitions ──────────────────────────────────────────────

export interface ModelInfo {
  /** Model ID sent to the Gemini API */
  id: string;
  /** Human-readable name for the admin UI */
  name: string;
  /** Context window size (display only) */
  contextWindow: string;
  /** Input price per 1M tokens in USD */
  inputPrice: number;
  /** Output price per 1M tokens in USD */
  outputPrice: number;
  /** Short description of the model's strengths */
  description: string;
}

export const GEMINI_MODELS: ModelInfo[] = [
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3 Flash-Lite',
    contextWindow: '1M tokens',
    inputPrice: 0.075,
    outputPrice: 0.30,
    description: 'Extremely fast and lightweight, ideal for small tasks at minimal cost.',
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    contextWindow: '1M tokens',
    inputPrice: 0.15,
    outputPrice: 0.60,
    description: 'A new generation of fast models with stronger reasoning capabilities.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3 Pro',
    contextWindow: '2M tokens',
    inputPrice: 1.50,
    outputPrice: 6.00,
    description: 'State-of-the-art logical and scientific reasoning with advanced code generation.',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    contextWindow: '1M tokens',
    inputPrice: 0.10,
    outputPrice: 0.40,
    description: 'A balanced mix of speed and capability for standard workflows.',
  },
];

/** Default model when no admin selection is stored */
export const DEFAULT_MODEL_ID = 'gemini-3.1-flash-lite-preview';

// ─── Static config ──────────────────────────────────────────────────

export const GEMINI_STATIC_CONFIG = {
  /** Maximum rows to send in a single batch request */
  batchSize: 50,
  /** Temperature for classification (low = more deterministic) */
  temperature: 0.1,
} as const;

/**
 * Look up full model info by ID. Falls back to default model.
 */
export function getModelInfo(modelId: string): ModelInfo {
  return GEMINI_MODELS.find((m) => m.id === modelId) || GEMINI_MODELS[0];
}
