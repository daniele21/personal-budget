import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectFile = (relativePath: string) => fs.readFileSync(
  path.resolve(process.cwd(), relativePath),
  'utf8',
);

describe('public portal configuration', () => {
  it('loads Firebase environment values from the repository root and fails closed on missing build values', () => {
    const config = projectFile('vite.portal.config.ts');

    expect(config).toContain('envDir: PROJECT_ROOT');
    expect(config).toContain("loadEnv(mode, PROJECT_ROOT, '')");
    expect(config).toContain("if (command === 'build')");
    expect(config).toContain('Portal build requires Firebase configuration');
  });

  it('allows only the Google script origin required by portal authentication', () => {
    const portalHtml = projectFile('portal/index.html');
    const hosting = projectFile('firebase.json');

    expect(portalHtml).toContain("script-src 'self' https://apis.google.com");
    expect(hosting).toContain("script-src 'self' https://apis.google.com");
    expect(portalHtml).not.toContain("script-src 'self' https:;");
    expect(portalHtml).not.toContain("script-src 'self' https://*");
  });
});
