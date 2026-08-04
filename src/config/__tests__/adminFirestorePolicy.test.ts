import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADMIN_EMAILS } from '../adminAccess';

const firestoreRules = readFileSync(
  resolve(process.cwd(), 'firestore.rules'),
  'utf8',
);

describe('Firestore admin policy alignment', () => {
  it('contains every application administrator in the shared rule helper', () => {
    expect(firestoreRules).toContain('function isAdmin()');
    expect(firestoreRules).toContain('request.auth.token.email in [');

    for (const email of ADMIN_EMAILS) {
      expect(firestoreRules).toContain(`'${email}'`);
    }
  });

  it('routes every privileged rule through the shared admin helper', () => {
    expect(firestoreRules.match(/if isAdmin\(\);/g)).toHaveLength(3);
    expect(firestoreRules).not.toContain(
      "request.auth.token.email == 'danielemoltisanti@gmail.com'",
    );
  });

  it('keeps backup parents and version documents scoped to the authenticated UID', () => {
    expect(firestoreRules).toContain('match /backups/{userId}');
    expect(firestoreRules).toContain('match /versions/{versionId}');
    expect(firestoreRules.match(/request\.auth\.uid == userId/g)).toHaveLength(2);
  });
});
