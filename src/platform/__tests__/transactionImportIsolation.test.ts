import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const IMPORT_PRODUCTION_PATHS = [
  'src/components/import',
  'src/data/import',
  'src/domain/import',
  'src/services/import',
] as const;

function productionSource(path: string): string {
  const absolute = resolve(process.cwd(), path);
  return readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.name !== '__tests__')
    .map((entry) => {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) return productionSource(child);
      return ['.ts', '.tsx'].includes(extname(entry.name))
        ? readFileSync(resolve(process.cwd(), child), 'utf8')
        : '';
    })
    .join('\n');
}

describe('deterministic transaction import isolation', () => {
  it('has no AI provider, Firebase, analytics, or network dependency', () => {
    const source = IMPORT_PRODUCTION_PATHS.map(productionSource).join('\n');
    expect(source).not.toMatch(
      /(?:@google\/genai|GoogleGenAI|generativelanguage|aiplatform|firebase|analytics|\bfetch\s*\(|XMLHttpRequest)/i,
    );
  });

  it('removes the retired provider modules and client configuration', () => {
    const removedPaths = [
      'src/config/gemini.ts',
      'src/lib/geminiUsage.ts',
      'src/domain/transactionCategorizer.ts',
      'src/components/admin/GeminiModelSelector.tsx',
      'src/components/admin/GeminiUsageDashboard.tsx',
    ];
    expect(removedPaths.every((path) => !existsSync(resolve(process.cwd(), path)))).toBe(true);

    const packageJson = readFileSync(resolve(process.cwd(), 'package.json'), 'utf8');
    const environmentExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8');
    const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
    const androidRuntime = readFileSync(resolve(process.cwd(), 'vite.android-runtime.ts'), 'utf8');
    const adminPage = readFileSync(resolve(process.cwd(), 'src/pages/AdminPage.tsx'), 'utf8');
    expect(`${packageJson}\n${environmentExample}\n${viteConfig}\n${androidRuntime}\n${adminPage}`)
      .not.toMatch(/@google\/genai|VITE_GEMINI_API_KEY|GeminiModelSelector|GeminiUsageDashboard/);
  });
});
