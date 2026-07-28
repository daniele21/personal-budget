import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('payment detection data isolation', () => {
  it('keeps pending candidates out of canonical AppData and portable archives', () => {
    const appDataModel = readProjectFile('src/data/model.ts');
    const transactionType = readProjectFile('src/types.ts');
    const mapping = readProjectFile(
      'src/domain/payment-detection/candidateToTransaction.ts',
    );

    expect(appDataModel).not.toMatch(/\bPaymentCandidate\b/);
    expect(transactionType).not.toMatch(
      /\b(candidateId|sourceAppId|matchTier|acceptanceToken)\b/,
    );
    expect(mapping).not.toMatch(
      /\b(candidateId|sourceAppId|matchTier|acceptanceToken)\s*:/,
    );
  });

  it('keeps M8 orchestration local and outside Gemini, Firebase, analytics, and network code', () => {
    const provider = readProjectFile(
      'src/state/PaymentDetectionProvider.tsx',
    );
    const service = readProjectFile(
      'src/services/payment-detection/verifiedTransactionService.ts',
    );
    const source = `${provider}\n${service}`;

    expect(source).not.toMatch(
      /\b(fetch|XMLHttpRequest|Gemini|GoogleGenAI|firebase|analytics)\b/i,
    );
    expect(source).not.toContain('transactionCategorizer');
  });
});
