import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '..');
const artifactRoots = [
  resolve(workspaceRoot, 'dist'),
  resolve(workspaceRoot, 'android/app/src/main/assets/public'),
];
const readableExtensions = new Set(['.html', '.js', '.json', '.css']);
const forbidden = [
  /@google\/genai/i,
  /VITE_GEMINI_API_KEY/,
  /generativelanguage\.googleapis\.com/i,
  /aiplatform\.googleapis\.com/i,
  /gemini-(?:\d|flash|pro)/i,
  /Google Gemini/i,
  /Select the active Gemini model/i,
  /Cumulative Gemini usage and cost/i,
];

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return readableExtensions.has(extname(entry.name)) ? [path] : [];
  });
}

const missingRoots = artifactRoots.filter((root) => !existsSync(root));
if (missingRoots.length > 0) {
  throw new Error(`Missing build artifacts: ${missingRoots.map((root) => relative(workspaceRoot, root)).join(', ')}`);
}

const findings = artifactRoots.flatMap((root) => filesUnder(root).flatMap((path) => {
  const source = readFileSync(path, 'utf8');
  return forbidden.some((pattern) => pattern.test(source))
    ? [relative(workspaceRoot, path)]
    : [];
}));

if (findings.length > 0) {
  throw new Error(`Retired Gemini runtime marker found in: ${findings.join(', ')}`);
}

console.log('Verified: web and Android artifacts contain no retired Gemini runtime markers.');
