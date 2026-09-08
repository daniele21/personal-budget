import {
  createDescriptionMatchKey,
  groupPreparedRowsByDescription,
  normalizeImportDescription,
} from '../../../domain/import/descriptionMatching';
import type {
  DescriptionMatchKey,
  PreparedTransactionImport,
} from '../../../domain/import/structuredImportTypes';
import {
  HARNEX_CATEGORY_CLASSIFICATION_USE_CASE,
  harnexClient,
  type HarnexClient,
  type HarnexFailure,
} from '../../../platform/harnex';
import type { Transaction } from '../../../types';

const INPUT_SAFETY_MARGIN = 256;
const SCHEMA_SAFETY_MARGIN = 128;

export interface ImportV2CategorySuggestion {
  groupId: string;
  rowIds: readonly string[];
  category: string;
  source: 'local-history' | 'harnex';
}

export type ImportV2CategoryHarnexState =
  | { status: 'not-needed'; completedBatches: 0; totalBatches: 0 }
  | { status: 'completed'; completedBatches: number; totalBatches: number }
  | {
      status: 'unavailable' | 'partial-failure' | 'cancelled';
      completedBatches: number;
      totalBatches: number;
      failure: HarnexFailure;
    };

export interface ImportV2CategoryResolution {
  suggestions: readonly ImportV2CategorySuggestion[];
  unresolvedRowIds: readonly string[];
  harnex: ImportV2CategoryHarnexState;
}

export interface ResolveImportV2CategoriesOptions {
  client?: HarnexClient;
  signal?: AbortSignal;
}

interface CategoryGroup {
  id: string;
  matchKey: DescriptionMatchKey;
  rowIds: string[];
  description: string;
  type: 'expense' | 'income';
}

interface EphemeralCategory {
  id: string;
  label: string;
}

interface PackedBatches {
  batches: CategoryGroup[][];
  unfitGroupIds: Set<string>;
}

function failure(code: HarnexFailure['code'], message: string): HarnexFailure {
  return { code, message };
}

const cancelledFailure = () => failure('CANCELLED', 'Category assistance was cancelled.');

function categoryGroups(prepared: PreparedTransactionImport): CategoryGroup[] {
  const rowById = new Map(prepared.rows.map((row) => [row.rowId, row]));
  return groupPreparedRowsByDescription(prepared.rows).flatMap((group, index) => {
    const anchor = rowById.get(group.rowIds[0]!);
    if (!anchor) return [];
    return [{
      id: `group-${index + 1}`,
      matchKey: group.matchKey,
      rowIds: group.rowIds,
      description: anchor.description,
      type: anchor.type,
    }];
  });
}

function activeCategorySet(activeCategories: readonly string[]): Set<string> {
  return new Set(activeCategories.filter((category) => category !== 'Uncategorized'));
}

function ephemeralCategories(activeCategories: readonly string[]): EphemeralCategory[] {
  return [...activeCategorySet(activeCategories)].map((label, index) => ({
    id: `category-${index + 1}`,
    label,
  }));
}

function historicalCategories(
  ledger: readonly Transaction[],
): Map<DescriptionMatchKey, Set<string>> {
  const result = new Map<DescriptionMatchKey, Set<string>>();
  for (const transaction of ledger) {
    if (!transaction.category || transaction.category === 'Uncategorized') continue;
    const key = createDescriptionMatchKey(transaction.description, transaction.type);
    const categories = result.get(key);
    if (categories) categories.add(transaction.category);
    else result.set(key, new Set([transaction.category]));
  }
  return result;
}

function resolveLocalHistory(
  groups: readonly CategoryGroup[],
  ledger: readonly Transaction[],
  activeCategories: readonly string[],
): {
  suggestions: ImportV2CategorySuggestion[];
  unresolved: CategoryGroup[];
} {
  const history = historicalCategories(ledger);
  const active = activeCategorySet(activeCategories);
  const suggestions: ImportV2CategorySuggestion[] = [];
  const unresolved: CategoryGroup[] = [];

  for (const group of groups) {
    const categories = history.get(group.matchKey);
    if (categories?.size === 1) {
      const category = [...categories][0]!;
      if (active.has(category)) {
        suggestions.push({
          groupId: group.id,
          rowIds: group.rowIds,
          category,
          source: 'local-history',
        });
        continue;
      }
    }
    unresolved.push(group);
  }
  return { suggestions, unresolved };
}

function batchInput(categories: readonly EphemeralCategory[], groups: readonly CategoryGroup[]): string {
  return JSON.stringify({
    task: 'classify-transaction-categories',
    rules: [
      'Choose only a supplied category ID or null.',
      'Use only description and transaction type as evidence.',
      'Return null when the category is uncertain.',
    ],
    categories,
    items: groups.map((group) => ({
      id: group.id,
      description: normalizeImportDescription(group.description),
      type: group.type,
    })),
  });
}

function batchSchema(categories: readonly EphemeralCategory[], groups: readonly CategoryGroup[]): string {
  return JSON.stringify({
    type: 'object',
    additionalProperties: false,
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'categoryId'],
          properties: {
            id: { type: 'string', enum: groups.map((group) => group.id) },
            categoryId: {
              oneOf: [
                { type: 'string', enum: categories.map((category) => category.id) },
                { type: 'null' },
              ],
            },
          },
        },
      },
    },
  });
}

function fitsCapability(
  categories: readonly EphemeralCategory[],
  groups: readonly CategoryGroup[],
  capability: { maxInputCharacters: number; maxJsonSchemaCharacters: number },
): boolean {
  const inputLimit = Math.max(0, capability.maxInputCharacters - INPUT_SAFETY_MARGIN);
  const schemaLimit = Math.max(0, capability.maxJsonSchemaCharacters - SCHEMA_SAFETY_MARGIN);
  return batchInput(categories, groups).length <= inputLimit
    && batchSchema(categories, groups).length <= schemaLimit;
}

function packBatches(
  categories: readonly EphemeralCategory[],
  groups: readonly CategoryGroup[],
  capability: { maxInputCharacters: number; maxJsonSchemaCharacters: number },
): PackedBatches {
  const batches: CategoryGroup[][] = [];
  const unfitGroupIds = new Set<string>();
  let current: CategoryGroup[] = [];

  for (const group of groups) {
    const trial = [...current, group];
    if (fitsCapability(categories, trial, capability)) {
      current = trial;
      continue;
    }
    if (current.length > 0) {
      batches.push(current);
      current = [];
    }
    if (fitsCapability(categories, [group], capability)) current = [group];
    else unfitGroupIds.add(group.id);
  }
  if (current.length > 0) batches.push(current);
  return { batches, unfitGroupIds };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).length === allowed.size
    && Object.keys(value).every((key) => allowed.has(key));
}

function parseBatchAnswer(
  answer: string,
  groups: readonly CategoryGroup[],
  categories: readonly EphemeralCategory[],
): Map<string, string | null> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !hasOnlyKeys(parsed, ['items']) || !Array.isArray(parsed.items)) return null;

  const requestedIds = new Set(groups.map((group) => group.id));
  const categoryIds = new Set(categories.map((category) => category.id));
  const result = new Map<string, string | null>();
  for (const item of parsed.items) {
    if (!isRecord(item) || !hasOnlyKeys(item, ['id', 'categoryId'])) return null;
    if (typeof item.id !== 'string' || !requestedIds.has(item.id) || result.has(item.id)) return null;
    if (item.categoryId !== null && (typeof item.categoryId !== 'string' || !categoryIds.has(item.categoryId))) {
      return null;
    }
    result.set(item.id, item.categoryId as string | null);
  }
  return result;
}

function unresolvedRowIds(
  groups: readonly CategoryGroup[],
  suggestions: readonly ImportV2CategorySuggestion[],
): string[] {
  const resolved = new Set(suggestions.flatMap((suggestion) => suggestion.rowIds));
  return groups.flatMap((group) => group.rowIds.filter((rowId) => !resolved.has(rowId)));
}

function resolution(
  groups: readonly CategoryGroup[],
  suggestions: readonly ImportV2CategorySuggestion[],
  harnex: ImportV2CategoryHarnexState,
): ImportV2CategoryResolution {
  return {
    suggestions,
    unresolvedRowIds: unresolvedRowIds(groups, suggestions),
    harnex,
  };
}

export async function resolveImportV2Categories(
  prepared: PreparedTransactionImport,
  ledger: readonly Transaction[],
  activeCategories: readonly string[],
  options: ResolveImportV2CategoriesOptions = {},
): Promise<ImportV2CategoryResolution> {
  const groups = categoryGroups(prepared);
  const local = resolveLocalHistory(groups, ledger, activeCategories);
  const categories = ephemeralCategories(activeCategories);
  if (local.unresolved.length === 0 || categories.length === 0) {
    return resolution(groups, local.suggestions, {
      status: 'not-needed',
      completedBatches: 0,
      totalBatches: 0,
    });
  }
  if (options.signal?.aborted) {
    return resolution(groups, local.suggestions, {
      status: 'cancelled',
      completedBatches: 0,
      totalBatches: 0,
      failure: cancelledFailure(),
    });
  }

  const client = options.client ?? harnexClient;
  const suggestions = [...local.suggestions];
  let connected = false;
  let completedBatches = 0;
  let totalBatches = 0;
  let terminal: ImportV2CategoryHarnexState | undefined;
  const onAbort = () => { void client.cancel(); };
  options.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const connection = await client.connect();
    if (connection.status === 'unavailable') {
      terminal = {
        status: 'unavailable',
        completedBatches,
        totalBatches,
        failure: connection.failure,
      };
    } else {
      connected = true;
      const capability = await client.probe(HARNEX_CATEGORY_CLASSIFICATION_USE_CASE);
      if (capability.status === 'unavailable') {
        terminal = {
          status: 'unavailable',
          completedBatches,
          totalBatches,
          failure: capability.failure,
        };
      } else if (options.signal?.aborted) {
        terminal = {
          status: 'cancelled',
          completedBatches,
          totalBatches,
          failure: cancelledFailure(),
        };
      } else {
        const packed = packBatches(categories, local.unresolved, capability);
        totalBatches = packed.batches.length;
        const capabilityFailure = packed.unfitGroupIds.size > 0
          ? failure('INVALID_REQUEST', 'Some category groups exceed advertised Harnex capability limits.')
          : undefined;
        let failureOutcome: HarnexFailure | undefined;

        const categoryById = new Map(categories.map((category) => [category.id, category.label]));
        const groupById = new Map(local.unresolved.map((group) => [group.id, group]));
        for (const batch of packed.batches) {
          if (options.signal?.aborted) {
            failureOutcome = cancelledFailure();
            break;
          }
          const generated = await client.generate({
            useCaseId: HARNEX_CATEGORY_CLASSIFICATION_USE_CASE,
            input: batchInput(categories, batch),
            jsonSchema: batchSchema(categories, batch),
          });
          if (generated.status === 'failed') {
            failureOutcome = generated.failure;
            break;
          }
          if (options.signal?.aborted) {
            failureOutcome = cancelledFailure();
            break;
          }
          const parsed = parseBatchAnswer(generated.answer, batch, categories);
          if (!parsed) {
            failureOutcome = failure('INVALID_REQUEST', 'Category assistance returned an invalid constrained response.');
            break;
          }
          for (const [groupId, categoryId] of parsed) {
            if (categoryId == null) continue;
            const group = groupById.get(groupId);
            const category = categoryById.get(categoryId);
            if (!group || !category) continue;
            suggestions.push({
              groupId,
              rowIds: group.rowIds,
              category,
              source: 'harnex',
            });
          }
          completedBatches += 1;
        }

        failureOutcome ??= capabilityFailure;
        if (failureOutcome) {
          terminal = {
            status: failureOutcome.code === 'CANCELLED' ? 'cancelled' : 'partial-failure',
            completedBatches,
            totalBatches,
            failure: failureOutcome,
          };
        } else {
          terminal = { status: 'completed', completedBatches, totalBatches };
        }
      }
    }
  } catch {
    terminal = {
      status: 'partial-failure',
      completedBatches,
      totalBatches,
      failure: failure('RUNTIME_FAILURE', 'Category assistance failed.'),
    };
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    if (connected) {
      try {
        const disconnected = await client.disconnect();
        if (disconnected.status === 'failed') {
          terminal = {
            status: 'partial-failure',
            completedBatches,
            totalBatches,
            failure: disconnected.failure,
          };
        }
      } catch {
        terminal = {
          status: 'partial-failure',
          completedBatches,
          totalBatches,
          failure: failure('RUNTIME_FAILURE', 'Category assistance cleanup failed.'),
        };
      }
    }
  }

  return resolution(groups, suggestions, terminal ?? {
    status: 'partial-failure',
    completedBatches,
    totalBatches,
    failure: failure('RUNTIME_FAILURE', 'Category assistance failed.'),
  });
}
