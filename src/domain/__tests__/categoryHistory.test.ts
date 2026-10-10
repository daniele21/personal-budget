import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../types';
import {
  buildActiveCategorySet,
  buildCategoryHistoryIndex,
  resolveUnambiguousHistoricalCategory,
} from '../categoryHistory';

function transaction(
  id: string,
  category: string,
  title = 'Merchant',
): Transaction {
  return {
    id,
    amount: 10,
    type: 'expense',
    category,
    date: '2026-09-01',
    title,
    description: title,
    paymentMethod: 'Card',
  };
}

describe('local category history', () => {
  it('resolves only one active historical category and reports its count', () => {
    const history = buildCategoryHistoryIndex(
      [
        transaction('tx-1', 'Groceries'),
        transaction('tx-2', 'Groceries'),
      ],
      (item) => item.title.toLowerCase(),
    );

    expect(resolveUnambiguousHistoricalCategory(
      history,
      'merchant',
      buildActiveCategorySet(['Groceries', 'Dining']),
    )).toEqual({
      category: 'Groceries',
      matchCount: 2,
    });
  });

  it('fails closed when historical categories conflict', () => {
    const history = buildCategoryHistoryIndex(
      [
        transaction('tx-1', 'Groceries'),
        transaction('tx-2', 'Dining'),
      ],
      (item) => item.title.toLowerCase(),
    );

    expect(resolveUnambiguousHistoricalCategory(
      history,
      'merchant',
      buildActiveCategorySet(['Groceries', 'Dining']),
    )).toBeNull();
  });

  it('does not revive an archived category as a suggestion', () => {
    const history = buildCategoryHistoryIndex(
      [transaction('tx-1', 'Archived category')],
      (item) => item.title.toLowerCase(),
    );

    expect(resolveUnambiguousHistoricalCategory(
      history,
      'merchant',
      buildActiveCategorySet(['Groceries']),
    )).toBeNull();
  });
});
