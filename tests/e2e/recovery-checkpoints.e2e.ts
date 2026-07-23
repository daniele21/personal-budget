import { test } from '@playwright/test';
import { seedPortableWorkspace } from './support/portableArchive';
import {
  DISCARD_CHECKPOINTS,
  RESUME_CHECKPOINTS,
  ROLLBACK_CHECKPOINTS,
  recoverCheckpoint,
} from './support/recoveryCheckpoints';

test.describe('Aura startup recovery checkpoints', () => {
  test.beforeEach(async ({ page }) => {
    await seedPortableWorkspace(page);
  });

  test('discards every interrupted pre-commit checkpoint after a real reload', async ({ page }) => {
    for (const status of DISCARD_CHECKPOINTS) {
      await test.step(status, () => recoverCheckpoint(page, status, 'previous'));
    }
  });

  test('resumes every committed target checkpoint after a real reload', async ({ page }) => {
    for (const status of RESUME_CHECKPOINTS) {
      await test.step(status, () => recoverCheckpoint(page, status, 'target'));
    }
  });

  test('rolls back every ambiguous or failed checkpoint after a real reload', async ({ page }) => {
    for (const status of ROLLBACK_CHECKPOINTS) {
      await test.step(status, () => recoverCheckpoint(page, status, 'previous'));
    }
  });
});
