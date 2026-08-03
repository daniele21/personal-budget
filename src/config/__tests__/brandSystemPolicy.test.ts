import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const sourceRoot = resolve(projectRoot, 'src');

function readPngDimensions(path: string): [number, number] {
  const buffer = readFileSync(resolve(projectRoot, path));
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return extname(entry.name) === '.tsx' ? [path] : [];
  });
}

describe('Aura digital brand policy', () => {
  it('defines the primary RGB bridge for both light and dark themes', () => {
    const styles = readFileSync(resolve(sourceRoot, 'index.css'), 'utf8');

    expect(styles.match(/--aura-primary-rgb:/g)).toHaveLength(2);
    expect(styles).toContain('--aura-primary-rgb: 0, 52, 97;');
    expect(styles).toContain('--aura-primary-rgb: 96, 165, 250;');
  });

  it('keeps palette literals in the token layer instead of React surfaces', () => {
    const violations = collectTsxFiles(sourceRoot).flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      const lines = source.split('\n');

      return lines.flatMap((line, index) =>
        /#[0-9a-f]{3,8}\b/i.test(line)
          ? [`${relative(projectRoot, path)}:${index + 1}`]
          : [],
      );
    });

    expect(violations).toEqual([]);
  });

  it('ships the canonical square marks required by the compact UI', () => {
    const assets: Array<[string, [number, number]]> = [
      ['public/aura-mark-light.png', [512, 512]],
      ['public/aura-mark-dark.png', [512, 512]],
      ['public/icon-192.png', [192, 192]],
      ['public/icon-512.png', [512, 512]],
      ['public/icon-maskable-512.png', [512, 512]],
      ['public/apple-touch-icon.png', [180, 180]],
      ['public/favicon.png', [64, 64]],
    ];

    for (const [asset, dimensions] of assets) {
      expect(existsSync(resolve(projectRoot, asset)), asset).toBe(true);
      expect(readPngDimensions(asset), asset).toEqual(dimensions);
    }
  });

  it('does not reference the retired primary RGB variable', () => {
    const guidedTour = readFileSync(
      resolve(sourceRoot, 'components/GuidedTour.tsx'),
      'utf8',
    );

    expect(guidedTour).not.toContain('--color-primary-rgb');
    expect(guidedTour).toContain('--aura-primary-rgb');
  });
});
