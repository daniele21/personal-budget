/**
 * Gemini Usage — Firestore persistence for model selection and usage tracking.
 *
 * Collections:
 * - `geminiConfig` — single document `settings` with the admin-selected model ID
 * - `geminiUsage`  — one document per API call, recording tokens, cost, user, model
 *
 * Design:
 * - Admin reads/writes model config
 * - Every Gemini API call logs a usage record
 * - Admin panel reads aggregated usage data
 * - Offline-tolerant: failures are logged, never thrown to the UI
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_MODEL_ID } from '../config/gemini';

// ─── Firestore collection names ─────────────────────────────────────

const CONFIG_COLLECTION = 'geminiConfig';
const CONFIG_DOC_ID = 'settings';
const USAGE_COLLECTION = 'geminiUsage';

// ─── Model Config (admin-selected model) ────────────────────────────

export interface GeminiSettings {
  /** Currently selected model ID */
  modelId: string;
  /** Timestamp of last update */
  updatedAt?: Timestamp;
  /** Admin email who last changed it */
  updatedBy?: string;
}

/**
 * Read the admin-selected Gemini model from Firestore.
 * Returns the default model ID if no config exists or Firestore is unreachable.
 */
export async function getSelectedModelId(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID));
    if (snap.exists()) {
      const data = snap.data() as GeminiSettings;
      return data.modelId || DEFAULT_MODEL_ID;
    }
    return DEFAULT_MODEL_ID;
  } catch (err) {
    console.warn('[GeminiConfig] Failed to read model config, using default:', err);
    return DEFAULT_MODEL_ID;
  }
}

/**
 * Save the admin-selected Gemini model to Firestore.
 * Only the admin should call this (enforced by Firestore rules).
 */
export async function setSelectedModelId(modelId: string, adminEmail: string): Promise<void> {
  await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID), {
    modelId,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  });
}

// ─── Usage Logging ──────────────────────────────────────────────────

export interface UsageRecord {
  /** Firestore auto-generated ID */
  id?: string;
  /** Which model was used */
  modelId: string;
  /** User email who triggered the call */
  userEmail: string;
  /** Firebase UID */
  userId: string;
  /** Input tokens consumed (from API response) */
  inputTokens: number;
  /** Output tokens consumed (from API response) */
  outputTokens: number;
  /** Estimated cost in USD for this call */
  estimatedCostUsd: number;
  /** What feature triggered this call */
  feature: string;
  /** Timestamp of the API call */
  createdAt?: Timestamp;
}

/**
 * Log a Gemini API usage record to Firestore.
 * Non-blocking: errors are logged but never thrown.
 */
export async function logUsage(record: Omit<UsageRecord, 'id' | 'createdAt'>): Promise<void> {
  try {
    await addDoc(collection(db, USAGE_COLLECTION), {
      ...record,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[GeminiUsage] Failed to log usage record:', err);
  }
}

// ─── Usage Reading (admin) ──────────────────────────────────────────

/** Parsed usage record with resolved date */
export interface ParsedUsageRecord {
  id: string;
  modelId: string;
  userEmail: string;
  userId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  feature: string;
  createdAt: Date;
}

/**
 * Read recent Gemini usage records from Firestore.
 * Returns the last N records ordered by most recent first.
 */
export async function getUsageRecords(maxRecords = 200): Promise<ParsedUsageRecord[]> {
  try {
    const q = query(
      collection(db, USAGE_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxRecords),
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        modelId: data.modelId || '',
        userEmail: data.userEmail || '',
        userId: data.userId || '',
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        estimatedCostUsd: data.estimatedCostUsd || 0,
        feature: data.feature || '',
        createdAt: data.createdAt?.toDate?.() || new Date(),
      };
    });
  } catch (err) {
    console.warn('[GeminiUsage] Failed to read usage records:', err);
    return [];
  }
}
