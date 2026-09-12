import { createHash } from 'node:crypto';

const projectId = 'demo-aura-android-ci';
const databaseId = 'budget-db';
const authBaseUrl = 'http://127.0.0.1:9099';
const firestoreBaseUrl = 'http://127.0.0.1:8080';
const email = process.env.AURA_ANDROID_CI_AUTH_EMAIL?.trim();
const password = process.env.AURA_ANDROID_CI_AUTH_PASSWORD?.trim();

if (!email || !password) {
  throw new Error('Synthetic Android CI Firebase auth identity is not configured.');
}

async function waitFor(url, label, attempts = 120) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${label} returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not become ready.${lastError ? ` ${lastError.message}` : ''}`);
}

await waitFor(
  `${authBaseUrl}/emulator/v1/projects/${projectId}/config`,
  'Firebase Auth emulator',
);
await waitFor(
  `${firestoreBaseUrl}/v1/projects/${projectId}/databases/${databaseId}/documents?pageSize=1`,
  'Firestore emulator',
);

const authResponse = await fetch(
  `${authBaseUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  },
);
if (!authResponse.ok) {
  const body = await authResponse.text();
  if (!body.includes('EMAIL_EXISTS')) {
    throw new Error(`Unable to seed Firebase Auth emulator: HTTP ${authResponse.status}.`);
  }
}

const emailHash = createHash('sha256')
  .update(email.toLowerCase())
  .digest('hex');
const allowlistResponse = await fetch(
  `${firestoreBaseUrl}/v1/projects/${projectId}/databases/${databaseId}/documents/allowedUsers/${emailHash}`,
  {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fields: {
        maskedEmail: { stringValue: 'an***@aura.invalid' },
        addedAt: { timestampValue: '2026-01-01T00:00:00Z' },
      },
    }),
  },
);
if (!allowlistResponse.ok) {
  throw new Error(`Unable to seed Firestore allowlist emulator: HTTP ${allowlistResponse.status}.`);
}

console.log('Seeded isolated Android CI Firebase Auth and allowlist state.');
