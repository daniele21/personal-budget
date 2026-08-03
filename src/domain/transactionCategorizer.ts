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
  creditCol?: number;
  debitCol?: number;
  amountDecimal: ',' | '.';
  dateFormat: string;
}

export interface LocalImportedTransaction {
  id: number;
  description: string;
  amount: number;
  signedAmount: number;
  date?: string;
  rawIndex: number;
  typeHint?: 'expense' | 'income';
}

export interface CategorizationResult {
  id: number;
  title: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  type: 'expense' | 'income';
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
- If the export has separate inflow/outflow columns, set "creditCol" to the inflow column and "debitCol" to the outflow column. Keep "amountCol" as the most representative amount column or -1 if there is no single amount column.
- "amountDecimal" must be either "," or ".".
- "dateFormat" must be a string like "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", etc.

JSON Schema:
{
  "dateCol": number,
  "descCol": number,
  "amountCol": number,
  "creditCol": number,
  "debitCol": number,
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
- Return exactly one output object for every input transaction. Preserve each input "id".
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
): CategorizationResult[] {
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

function normalizeHeaderCell(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isCreditHeader(value: string): boolean {
  const normalized = normalizeHeaderCell(value);
  if ([
    'accrediti',
    'accredito',
    'entrate',
    'entrata',
    'crediti',
    'credito',
    'avere',
    'income',
    'inflow',
    'credit',
    'credits',
    'deposit',
    'deposits',
  ].includes(normalized)) return true;

  return (
    normalized.includes('accredit') ||
    normalized.includes('entrata') ||
    normalized.includes('entrate') ||
    normalized.includes('credit amount') ||
    normalized.includes('amount credit') ||
    normalized.includes('money in') ||
    normalized.includes('inflow') ||
    normalized.includes('deposit')
  );
}

function isDebitHeader(value: string): boolean {
  const normalized = normalizeHeaderCell(value);
  if ([
    'addebiti',
    'addebito',
    'uscite',
    'uscita',
    'debiti',
    'debito',
    'dare',
    'expense',
    'expenses',
    'outflow',
    'debit',
    'debits',
    'withdrawal',
    'withdrawals',
  ].includes(normalized)) return true;

  return (
    normalized.includes('addebit') ||
    normalized.includes('uscita') ||
    normalized.includes('uscite') ||
    normalized.includes('debit amount') ||
    normalized.includes('amount debit') ||
    normalized.includes('money out') ||
    normalized.includes('outflow') ||
    normalized.includes('withdrawal')
  );
}

function isDateHeader(value: string): boolean {
  const normalized = normalizeHeaderCell(value);
  if ([
    'date',
    'data',
    'data contabile',
    'booking date',
    'transaction date',
    'operation date',
    'accounting date',
    'posted date',
    'date comptable',
    'fecha',
    'fecha operacion',
  ].includes(normalized)) return true;

  return (
    normalized.includes('data contabile') ||
    normalized.includes('booking date') ||
    normalized.includes('transaction date') ||
    normalized.includes('operation date') ||
    normalized.includes('posted date') ||
    normalized.includes('accounting date')
  );
}

function isDescriptionHeader(value: string): boolean {
  const normalized = normalizeHeaderCell(value);
  if ([
    'descrizione',
    'description',
    'descrizione operazione',
    'causale',
    'causale operazione',
    'details',
    'detail',
    'transaction details',
    'merchant',
    'beneficiary',
    'beneficiario',
    'counterparty',
    'payee',
    'narrative',
    'libelle',
    'concepto',
  ].includes(normalized)) return true;

  return (
    normalized.includes('descrizion') ||
    normalized.includes('causale') ||
    normalized.includes('description') ||
    normalized.includes('details') ||
    normalized.includes('merchant') ||
    normalized.includes('beneficiar') ||
    normalized.includes('counterparty') ||
    normalized.includes('narrative')
  );
}

function isSingleAmountHeader(value: string): boolean {
  const normalized = normalizeHeaderCell(value);
  if ([
    'amount',
    'importo',
    'importo movimento',
    'transaction amount',
    'montant',
    'importe',
  ].includes(normalized)) return true;

  return (
    normalized.includes('amount') ||
    normalized.includes('importo') ||
    normalized.includes('montant') ||
    normalized.includes('importe')
  );
}

export function detectSplitAmountColumns(rawRows: string[][]): { creditCol: number; debitCol: number } | null {
  for (const row of rawRows.slice(0, 50)) {
    const creditCol = row.findIndex(isCreditHeader);
    const debitCol = row.findIndex(isDebitHeader);

    if (creditCol !== -1 && debitCol !== -1) {
      return { creditCol, debitCol };
    }
  }

  return null;
}

export function detectHeaderColumnMapping(rawRows: string[][]): Partial<ColumnMapping> {
  for (const row of rawRows.slice(0, 50)) {
    const dateCol = row.findIndex(isDateHeader);
    const descCol = row.findIndex(isDescriptionHeader);
    const splitColumns = {
      creditCol: row.findIndex(isCreditHeader),
      debitCol: row.findIndex(isDebitHeader),
    };
    const amountCol = row.findIndex((cell, index) => (
      isSingleAmountHeader(cell) &&
      index !== splitColumns.creditCol &&
      index !== splitColumns.debitCol
    ));

    if (
      dateCol !== -1 ||
      descCol !== -1 ||
      amountCol !== -1 ||
      (splitColumns.creditCol !== -1 && splitColumns.debitCol !== -1)
    ) {
      return {
        ...(dateCol !== -1 ? { dateCol } : {}),
        ...(descCol !== -1 ? { descCol } : {}),
        ...(amountCol !== -1 ? { amountCol } : {}),
        ...(splitColumns.creditCol !== -1 && splitColumns.debitCol !== -1 ? splitColumns : {}),
      };
    }
  }

  return {};
}

export function mergeColumnMapping(rawRows: string[][], aiMapping: ColumnMapping): ColumnMapping {
  const headerMapping = detectHeaderColumnMapping(rawRows);

  return {
    ...aiMapping,
    ...headerMapping,
    amountCol: headerMapping.amountCol ?? aiMapping.amountCol,
    amountDecimal: aiMapping.amountDecimal,
    dateFormat: aiMapping.dateFormat,
  };
}

function normalizeDetectedColumn(value: number | undefined): number {
  return Number.isInteger(value) && value !== undefined ? value : -1;
}

function getLocalAmountColumns(rawRows: string[][], colMapping: ColumnMapping) {
  const splitColumns = detectSplitAmountColumns(rawRows);
  const creditCol = normalizeDetectedColumn(colMapping.creditCol);
  const debitCol = normalizeDetectedColumn(colMapping.debitCol);

  if (splitColumns) return splitColumns;
  if (creditCol !== -1 && debitCol !== -1) return { creditCol, debitCol };
  return null;
}

function hasUsableColumnMapping(colMapping: Partial<ColumnMapping>): boolean {
  const hasDescription = normalizeDetectedColumn(colMapping.descCol) !== -1;
  const hasSingleAmount = normalizeDetectedColumn(colMapping.amountCol) !== -1;
  const hasSplitAmount = (
    normalizeDetectedColumn(colMapping.creditCol) !== -1 &&
    normalizeDetectedColumn(colMapping.debitCol) !== -1
  );

  return hasDescription && (hasSingleAmount || hasSplitAmount);
}

function buildHeaderColumnMapping(rawRows: string[][]): ColumnMapping | null {
  const headerMapping = detectHeaderColumnMapping(rawRows);
  if (!hasUsableColumnMapping(headerMapping)) return null;

  return {
    dateCol: normalizeDetectedColumn(headerMapping.dateCol),
    descCol: normalizeDetectedColumn(headerMapping.descCol),
    amountCol: normalizeDetectedColumn(headerMapping.amountCol),
    creditCol: headerMapping.creditCol,
    debitCol: headerMapping.debitCol,
    amountDecimal: ',',
    dateFormat: '',
  };
}

export function extractTransactionsLocally(
  rawRows: string[][],
  colMapping: ColumnMapping,
): LocalImportedTransaction[] {
  colMapping = mergeColumnMapping(rawRows, colMapping);

  const splitAmountColumns = getLocalAmountColumns(rawRows, colMapping);
  const amountColumnBound = splitAmountColumns
    ? Math.max(splitAmountColumns.creditCol, splitAmountColumns.debitCol)
    : colMapping.amountCol;
  const requiredColumnBound = Math.max(colMapping.descCol, amountColumnBound, colMapping.dateCol);

  const cleanTransactions: LocalImportedTransaction[] = [];

  rawRows.forEach((row, i) => {
    if (row.length <= requiredColumnBound) return;

    const descRaw = row[colMapping.descCol];
    const dateRaw = colMapping.dateCol !== -1 ? row[colMapping.dateCol] : undefined;
    const date = normalizeImportedDate(dateRaw, colMapping.dateFormat);

    let amount = 0;
    let signedAmount = 0;
    let typeHint: LocalImportedTransaction['typeHint'];

    if (splitAmountColumns) {
      const creditAmount = parseAmountLocally(row[splitAmountColumns.creditCol], colMapping.amountDecimal);
      const debitAmount = parseAmountLocally(row[splitAmountColumns.debitCol], colMapping.amountDecimal);

      if (creditAmount !== 0) {
        amount = Math.abs(creditAmount);
        signedAmount = amount;
        typeHint = 'income';
      } else if (debitAmount !== 0) {
        amount = Math.abs(debitAmount);
        signedAmount = -amount;
        typeHint = 'expense';
      }
    } else {
      const parsedAmount = parseAmountLocally(row[colMapping.amountCol], colMapping.amountDecimal);
      amount = Math.abs(parsedAmount);
      signedAmount = parsedAmount;
      typeHint = parsedAmount < 0 ? 'expense' : undefined;
    }

    const description = descRaw?.trim() || (
      date ? `${typeHint === 'income' ? 'Accredito' : 'Addebito'} ${date}` : ''
    );

    if (amount !== 0 && description.length > 2) {
      cleanTransactions.push({
        id: cleanTransactions.length,
        rawIndex: i,
        description,
        amount,
        signedAmount,
        date,
        typeHint,
      });
    }
  });

  return cleanTransactions;
}

function buildFallbackTitle(description: string): string {
  return description.trim().slice(0, 50) || 'Transazione';
}

export function mergeCategorizationResults(
  localTransactions: LocalImportedTransaction[],
  aiResults: CategorizationResult[],
  categories: string[],
): CategorizedTransaction[] {
  const fallbackCategory = categories.includes('Uncategorized')
    ? 'Uncategorized'
    : categories[0] || 'Uncategorized';
  const aiById = new Map(aiResults.map((result) => [result.id, result]));

  return localTransactions.map((localTx, index) => {
    const aiResult = aiById.get(localTx.id);

    return {
      index,
      description: localTx.description,
      amount: localTx.amount,
      date: localTx.date,
      title: aiResult?.title || buildFallbackTitle(localTx.description),
      category: aiResult?.category || fallbackCategory,
      confidence: aiResult?.confidence || 'low',
      type: localTx.typeHint ?? aiResult?.type ?? (localTx.signedAmount < 0 ? 'expense' : 'income'),
    };
  });
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
      'Gemini API key is not configured. Set VITE_GEMINI_API_KEY in the .env file.',
    );
  }

  // Check cache first to save tokens if the exact same file is parsed again
  const cacheKeyStr = JSON.stringify({ rawRows, categories });
  const hash = await computeHash(cacheKeyStr);
  const cacheKey = `gemini_import_cache_v6_${hash}`;

  if (!forceFresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        onStatus?.(100, 'Results loaded from the local cache (zero tokens used).');
        return JSON.parse(cached) as CategorizedTransaction[];
      }
    } catch (err) {
      // Ignore cache read errors
    }
  }

  const modelId = await getSelectedModelId();
  const modelInfo = getModelInfo(modelId);
  const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  let colMapping = buildHeaderColumnMapping(rawRows);

  if (colMapping) {
    onStatus?.(10, 'Columns identified from the file headers...');
  } else {
    onStatus?.(5, 'Identifying columns...');

    // 1. Column Detection (Fase 1)
    // Prendi le prime 50 righe (invece di 10) perché molti export Excel bancari hanno intestazioni lunghissime
    const sampleRows = rawRows.slice(0, Math.min(50, rawRows.length));
    const sampleText = spreadsheetToText(sampleRows);
    const { systemInstruction: colSys, userPrompt: colUser } = buildColumnDetectionPrompt(sampleText);

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

      colMapping = mergeColumnMapping(rawRows, parseColumnDetectionResponse(colResponse.text || ''));
    } catch (err) {
      console.error('[Gemini] Column detection failed:', err);
      throw new Error('The file structure could not be understood. Make sure it contains dates, descriptions, and amounts.');
    }
  }

  const splitAmountColumns = getLocalAmountColumns(rawRows, colMapping);
  if (colMapping.descCol === -1 || (colMapping.amountCol === -1 && !splitAmountColumns)) {
    throw new Error('Required columns (Description or Amount) were not found in the file.');
  }

  onStatus?.(15, 'Cleaning data locally...');

  // 2. Local Parsing (Fase 2)
  const cleanTransactions = extractTransactionsLocally(rawRows, colMapping);

  if (cleanTransactions.length === 0) {
    throw new Error('No valid transactions were found after cleaning the file.');
  }

  // 3. Categorization (Fase 3) in batches
  const batchSize = GEMINI_STATIC_CONFIG.batchSize;
  const results: CategorizedTransaction[] = [];

  for (let i = 0; i < cleanTransactions.length; i += batchSize) {
    const batch = cleanTransactions.slice(i, i + batchSize);
    // Normalize progress between 20% and 95%
    const batchProgress = 20 + Math.round((i / cleanTransactions.length) * 75);
    onStatus?.(batchProgress, `Categorizing ${i + 1} to ${i + batch.length} of ${cleanTransactions.length}... (Model: ${modelInfo.name})`);

    // Prepare minimal data to send
    const minimalBatch = batch.map(t => ({ id: t.id, description: t.description, amount: t.signedAmount }));
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
      console.error('[Gemini] Categorization failed:', err);
      throw new Error('An error occurred while categorizing the transactions.');
    }

    onStatus?.(batchProgress + Math.round((batch.length / cleanTransactions.length) * 5), 'Saving results...');

    try {
      const parsedBatch = parseCategorizationResponse(catResponse.text || '', categories);
      results.push(...mergeCategorizationResults(batch, parsedBatch, categories));
    } catch (err) {
      console.error('[Gemini] Categorization response parsing failed:', catResponse.text);
      throw new Error('Gemini returned an invalid format for this data batch. Try again.');
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

  onStatus?.(100, 'Finishing up...');

  try {
    localStorage.setItem(cacheKey, JSON.stringify(results));
  } catch (err) {
    console.warn('[Gemini] Failed to save the local cache:', err);
  }

  return results;
}
