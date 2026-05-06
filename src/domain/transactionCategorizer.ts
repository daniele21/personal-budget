/**
 * Transaction Categorizer — uses a Hybrid AI approach to import transactions.
 *
 * Approach:
 *   1. AI Column Detection: Sends only the first few rows to Gemini to identify 
 *      which columns contain Date, Description, and Amount.
 *   2. Local Cleaning: Uses the detected indices to parse the entire CSV locally 
 *      in TypeScript, filtering out invalid rows.
 *   3. AI Categorization: Sends only the clean, minimal transactions (description + amount)
 *      to Gemini in batches to assign the correct category and title.
 *
 * This hybrid approach reduces token usage by up to 80% and increases speed,
 * while maintaining the "zero-configuration" UX.
 *
 * PRIVACY: This service sends partial spreadsheet data to Google's Gemini API.
 * The data leaves the user's device.
 */
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_STATIC_CONFIG, getModelInfo } from '../config/gemini';
import { getSelectedModelId, logUsage } from '../lib/geminiUsage';

// ─── Types ──────────────────────────────────────────────────────────

/** Result of AI extraction + categorization for a single transaction */
export interface CategorizedTransaction {
  /** Sequential index (for tracking in the UI) */
  index: number;
  /** Description text from the spreadsheet */
  description: string;
  /** AI-assigned category from the app's category list */
  category: string;
  /** AI confidence: 'high' | 'medium' | 'low' */
  confidence: 'high' | 'medium' | 'low';
  /** Transaction type inferred from context or amount */
  type: 'expense' | 'income';
  /** Parsed amount */
  amount: number;
  /** Parsed date (ISO string or empty) */
  date?: string;
  /** Short title suggested by AI */
  title: string;
  /** True if the user explicitly deselected this transaction before import */
  isDeselected?: boolean;
}

/** Caller context for usage attribution */
export interface CallerContext {
  userEmail: string;
  userId: string;
  feature: string;
}

export interface ColumnMapping {
  dateCol: number;
  descCol: number;
  amountCol: number;
  amountDecimal: ',' | '.';
  dateFormat: string;
}

const EXCEL_SERIAL_DATE_EPOCH_OFFSET = 25569;
const MS_PER_DAY = 86_400_000;

// ─── Phase 1: Column Detection ────────────────────────────────────────

function buildColumnDetectionPrompt(rawRowsSample: string): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `You are a financial data parser.
Analyze the provided CSV rows and identify the column indices (0-indexed) for Date, Description, and Amount.
Also detect the format of the date and the decimal separator used in the amount.

Rules:
- Respond ONLY with a valid JSON object. No markdown, no explanation.
- Bank exports often have 10-20 rows of metadata (account info, balances) BEFORE the actual table. Ignore the metadata. Focus on the actual transaction table.
- Return the column index relative to the row array (0-indexed). If a column is not found, return -1.
- "amountDecimal" must be either "," or ".".
- "dateFormat" must be a string like "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", etc.

JSON Schema:
{
  "dateCol": number,
  "descCol": number,
  "amountCol": number,
  "amountDecimal": "," | ".",
  "dateFormat": "string"
}`;

  const userPrompt = `Analyze these rows:\n\n${rawRowsSample}`;
  return { systemInstruction, userPrompt };
}

function parseColumnDetectionResponse(responseText: string): ColumnMapping {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain a valid JSON object.');
  }
  return JSON.parse(jsonMatch[0]) as ColumnMapping;
}

// ─── Phase 2: Categorization ────────────────────────────────────────

function buildCategorizationPrompt(
  transactions: Array<{ id: number; description: string; amount: number }>,
  categories: string[]
): { systemInstruction: string; userPrompt: string } {
  const categoryList = categories.join(', ');

  const systemInstruction = `You are a financial classification assistant.
You will receive a JSON array of transactions.
Classify each transaction into one of the user's spending/income categories.

Available categories: ${categoryList}

Rules:
- You MUST assign one of the available categories. Do NOT invent new ones.
- If unsure, pick the closest match.
- If it looks like income (salary, refund, positive inflow), set type to "income". Otherwise "expense".
- Rate your confidence as "high", "medium", or "low".
- For the title, use the merchant name or a short summary (max 50 chars).
- Respond ONLY with a valid JSON array.

Output JSON schema for each element:
{
  "id": number,
  "title": "string",
  "category": "string",
  "confidence": "high" | "medium" | "low",
  "type": "expense" | "income"
}`;

  const userPrompt = `Classify these transactions:\n\n${JSON.stringify(transactions, null, 2)}`;
  return { systemInstruction, userPrompt };
}

function parseCategorizationResponse(
  responseText: string,
  categories: string[]
): Array<{ id: number; title: string; category: string; confidence: 'high'|'medium'|'low'; type: 'expense'|'income' }> {
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain a valid JSON array.');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const fallbackCategory = categories[0] || 'Uncategorized';

  return parsed.map((item: any) => {
    const matchedCategory = categories.find(
      (c) => c.toLowerCase() === item.category?.toLowerCase()
    );

    return {
      id: item.id,
      title: item.title || item.description?.slice(0, 50) || 'Transazione',
      category: matchedCategory || fallbackCategory,
      confidence: (['high', 'medium', 'low'].includes(item.confidence) ? item.confidence : 'low') as 'high' | 'medium' | 'low',
      type: item.type === 'income' ? 'income' : 'expense',
    };
  });
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Parses a localized amount string into a number.
 */
function parseAmountLocally(value: string, fallbackDecimal: ',' | '.'): number {
  if (!value) return 0;
  // Keep only digits, dots, commas, and minus signs
  const cleanStr = value.replace(/[^0-9,.-]/g, '');
  if (!cleanStr) return 0;

  const lastDot = cleanStr.lastIndexOf('.');
  const lastComma = cleanStr.lastIndexOf(',');

  let decimalChar = fallbackDecimal;

  // Heuristic deduction of decimal separator
  if (lastDot > -1 && lastComma > -1) {
    // Both exist: the last one is definitely the decimal separator
    decimalChar = lastDot > lastComma ? '.' : ',';
  } else if (lastDot > -1 && lastComma === -1) {
    // Only dot exists. If exactly 3 digits follow it, it's very likely a thousand separator.
    const afterDot = cleanStr.substring(lastDot + 1);
    if (afterDot.length === 3) {
      decimalChar = ','; // This means the dot is a thousand separator and will be removed
    } else {
      decimalChar = '.';
    }
  } else if (lastComma > -1 && lastDot === -1) {
    // Only comma exists. If exactly 3 digits follow it, it's very likely a thousand separator (English format).
    const afterComma = cleanStr.substring(lastComma + 1);
    if (afterComma.length === 3) {
      decimalChar = '.'; // This means the comma is a thousand separator and will be removed
    } else {
      decimalChar = ',';
    }
  }

  let normalized = cleanStr;
  if (decimalChar === ',') {
    // If decimal is comma: remove all dots (thousand separators), then replace last comma with dot
    normalized = cleanStr.replace(/\./g, '');
    const lastIdx = normalized.lastIndexOf(',');
    if (lastIdx > -1) {
      normalized = normalized.substring(0, lastIdx) + '.' + normalized.substring(lastIdx + 1);
    }
  } else {
    // If decimal is dot: remove all commas (thousand separators)
    normalized = cleanStr.replace(/,/g, '');
  }
  
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function toDateInputValue(year: number, month: number, day: number): string | undefined {
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Normalize bank-export dates to the YYYY-MM-DD format required by
 * HTML date inputs. Returns undefined when the source value is empty
 * or cannot be parsed safely.
 */
export function normalizeImportedDate(value: string | undefined, dateFormat?: string): string | undefined {
  const rawValue = value?.trim();
  if (!rawValue) return undefined;

  const serialDate = Number(rawValue);
  if (Number.isFinite(serialDate) && serialDate > 20_000 && serialDate < 80_000) {
    const date = new Date((serialDate - EXCEL_SERIAL_DATE_EPOCH_OFFSET) * MS_PER_DAY);
    return date.toISOString().slice(0, 10);
  }

  const isoMatch = rawValue.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    return toDateInputValue(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const localMatch = rawValue.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (!localMatch) return undefined;

  const first = Number(localMatch[1]);
  const second = Number(localMatch[2]);
  const rawYear = Number(localMatch[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const normalizedFormat = dateFormat?.toUpperCase() ?? '';
  const monthFirst = normalizedFormat.startsWith('MM') || (first <= 12 && second > 12);
  const day = monthFirst ? second : first;
  const month = monthFirst ? first : second;

  return toDateInputValue(year, month, day);
}

/**
 * Convert a 2D array of rows into a simple CSV-like text representation for the AI.
 */
function spreadsheetToText(rows: string[][]): string {
  return rows.map(row => row.join(' | ')).join('\n');
}

/**
 * Compute a SHA-256 hash for caching.
 */
async function computeHash(data: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Main entry point ───────────────────────────────────────────────

/**
 * Extract and categorize transactions from raw spreadsheet data using Gemini AI.
 *
 * - Reads the admin-selected model from Firestore
 * - Processes in batches
 * - Logs usage (tokens + cost) for each batch
 *
 * @param rawRows - All non-empty rows from the spreadsheet as a 2D array of strings
 * @param categories - Available category names in the app
 * @param caller - User context for usage attribution
 * @param onStatus - Optional callback reporting progress (0-100) and status message
 * @returns Array of extracted and categorized transactions
 *
 * ⚠️ PRIVACY WARNING: Sends raw spreadsheet data to Google's Gemini API.
 */
export async function extractAndCategorizeTransactions(
  rawRows: string[][],
  categories: string[],
  caller: CallerContext,
  onStatus?: (percent: number, message: string) => void,
  forceFresh: boolean = false
): Promise<CategorizedTransaction[]> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Gemini API key non configurata. Imposta VITE_GEMINI_API_KEY nel file .env.',
    );
  }

  // Check cache first to save tokens if the exact same file is parsed again
  const cacheKeyStr = JSON.stringify({ rawRows, categories });
  const hash = await computeHash(cacheKeyStr);
  const cacheKey = `gemini_import_cache_v3_${hash}`;

  if (!forceFresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        onStatus?.(100, 'Risultati caricati dalla cache locale (zero token usati).');
        return JSON.parse(cached) as CategorizedTransaction[];
      }
    } catch (err) {
      // Ignore cache read errors
    }
  }

  onStatus?.(5, 'Identificazione colonne in corso...');

  const modelId = await getSelectedModelId();
  const modelInfo = getModelInfo(modelId);
  const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // 1. Column Detection (Fase 1)
  // Prendi le prime 50 righe (invece di 10) perché molti export Excel bancari hanno intestazioni lunghissime
  const sampleRows = rawRows.slice(0, Math.min(50, rawRows.length));
  const sampleText = spreadsheetToText(sampleRows);
  const { systemInstruction: colSys, userPrompt: colUser } = buildColumnDetectionPrompt(sampleText);

  let colMapping: ColumnMapping;
  try {
    const colResponse = await genAI.models.generateContent({
      model: modelId,
      contents: colUser,
      config: {
        systemInstruction: colSys,
        temperature: 0.1, // Very low temp for strict JSON
      },
    });

    totalInputTokens += colResponse.usageMetadata?.promptTokenCount || 0;
    totalOutputTokens += colResponse.usageMetadata?.candidatesTokenCount || 0;

    colMapping = parseColumnDetectionResponse(colResponse.text || '');
  } catch (err) {
    console.error('[Gemini] Errore rilevamento colonne:', err);
    throw new Error('Impossibile comprendere la struttura del file. Assicurati che contenga date, descrizioni e importi.');
  }

  if (colMapping.descCol === -1 || colMapping.amountCol === -1) {
    throw new Error('Colonne necessarie (Descrizione o Importo) non trovate nel file.');
  }

  onStatus?.(15, 'Pulizia dati locale in corso...');

  // 2. Local Parsing (Fase 2)
  const cleanTransactions: Array<{ id: number; description: string; amount: number; date?: string; rawIndex: number }> = [];
  
  rawRows.forEach((row, i) => {
    // Skip row if it doesn't even have the required columns
    if (row.length <= Math.max(colMapping.descCol, colMapping.amountCol)) return;

    const descRaw = row[colMapping.descCol];
    const amountRaw = row[colMapping.amountCol];
    const dateRaw = colMapping.dateCol !== -1 ? row[colMapping.dateCol] : undefined;

    const amount = parseAmountLocally(amountRaw, colMapping.amountDecimal);
    
    // Filter out invalid rows (headers, empty amounts, etc.)
    if (amount !== 0 && descRaw && descRaw.trim().length > 2) {
      cleanTransactions.push({
        id: cleanTransactions.length,
        rawIndex: i,
        description: descRaw.trim(),
        amount: Math.abs(amount),
        date: normalizeImportedDate(dateRaw, colMapping.dateFormat)
      });
    }
  });

  if (cleanTransactions.length === 0) {
    throw new Error('Nessuna transazione valida trovata dopo la pulizia del file.');
  }

  // 3. Categorization (Fase 3) in batches
  const batchSize = GEMINI_STATIC_CONFIG.batchSize;
  const results: CategorizedTransaction[] = [];

  for (let i = 0; i < cleanTransactions.length; i += batchSize) {
    const batch = cleanTransactions.slice(i, i + batchSize);
    const isLastBatch = i + batch.length >= cleanTransactions.length;
    
    // Normalize progress between 20% and 95%
    const batchProgress = 20 + Math.round((i / cleanTransactions.length) * 75);
    onStatus?.(batchProgress, `Categorizzazione ${i + 1} a ${i + batch.length} di ${cleanTransactions.length}... (Modello: ${modelInfo.name})`);

    // Prepare minimal data to send
    const minimalBatch = batch.map(t => ({ id: t.id, description: t.description, amount: t.amount }));
    const { systemInstruction: catSys, userPrompt: catUser } = buildCategorizationPrompt(minimalBatch, categories);

    let catResponse;
    try {
      catResponse = await genAI.models.generateContent({
        model: modelId,
        contents: catUser,
        config: {
          systemInstruction: catSys,
          temperature: GEMINI_STATIC_CONFIG.temperature,
        },
      });
      
      totalInputTokens += catResponse.usageMetadata?.promptTokenCount || 0;
      totalOutputTokens += catResponse.usageMetadata?.candidatesTokenCount || 0;
    } catch (err) {
      console.error('[Gemini] Errore categorizzazione:', err);
      throw new Error('Errore durante la categorizzazione delle transazioni.');
    }

    onStatus?.(batchProgress + Math.round((batch.length / cleanTransactions.length) * 5), 'Salvataggio risultati...');

    try {
      const parsedBatch = parseCategorizationResponse(catResponse.text || '', categories);
      
      // Merge AI response with local clean data
      parsedBatch.forEach(aiResult => {
        const localTx = batch.find(t => t.id === aiResult.id);
        if (localTx) {
          results.push({
            index: results.length,
            description: localTx.description,
            amount: localTx.amount,
            date: localTx.date,
            title: aiResult.title,
            category: aiResult.category,
            confidence: aiResult.confidence,
            type: aiResult.type
          });
        }
      });
    } catch (err) {
      console.error('[Gemini] Errore di parsing categorizzazione:', catResponse.text);
      throw new Error(`Gemini ha restituito un formato non valido per questo blocco di dati. Riprova.`);
    }
  }

  // 4. Log total usage
  const inputCost = (totalInputTokens / 1_000_000) * modelInfo.inputPrice;
  const outputCost = (totalOutputTokens / 1_000_000) * modelInfo.outputPrice;

  logUsage({
    modelId,
    userEmail: caller.userEmail,
    userId: caller.userId,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    estimatedCostUsd: inputCost + outputCost,
    feature: caller.feature,
  });

  onStatus?.(100, 'Completamento in corso...');

  try {
    localStorage.setItem(cacheKey, JSON.stringify(results));
  } catch (err) {
    console.warn('[Gemini] Errore nel salvataggio della cache locale:', err);
  }

  return results;
}
