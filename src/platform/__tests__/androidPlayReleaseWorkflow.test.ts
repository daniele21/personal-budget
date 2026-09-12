import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const releaseWorkflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/google-play-release.yml'),
  'utf8',
);
const healthWorkflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/repository-health.yml'),
  'utf8',
);

describe('Android Google Play release workflow', () => {
  it('keeps play-release branches on the repository release validation stage', () => {
    expect(healthWorkflow).toContain('"play-release/**"');
    expect(healthWorkflow).toContain('main|play-release/*) STAGE="release"');
  });

  it('allows W13 qualification only on the internal track', () => {
    expect(releaseWorkflow).toContain(
      'Release qualification is supported only on the internal track.',
    );
    expect(releaseWorkflow).toContain(
      'qualification="${qualification:-false}"',
    );
    expect(releaseWorkflow).toContain(
      'echo "qualification=$qualification" >> "$GITHUB_OUTPUT"',
    );
  });

  it('requires an exact current-dev source for qualification', () => {
    expect(releaseWorkflow).toContain(
      'current_dev_sha="$(git rev-parse refs/remotes/origin/dev)"',
    );
    expect(releaseWorkflow).toContain(
      'if [[ "$source_sha" != "$current_dev_sha" ]]; then',
    );
    expect(releaseWorkflow).toContain(
      'Qualification source_sha must equal current dev:',
    );
  });

  it('preserves the main ancestry gate for normal internal and production releases', () => {
    expect(releaseWorkflow).toContain(
      'elif ! git merge-base --is-ancestor "$source_sha" origin/main; then',
    );
    expect(releaseWorkflow).toContain(
      'Release source_sha must already belong to main.',
    );
  });

  it('still permits only the release trigger file to differ from the source', () => {
    expect(releaseWorkflow).toContain(
      'if (( ${#release_delta[@]} != 1 )) || [[ "${release_delta[0]:-}" != "$trigger" ]]; then',
    );
    expect(releaseWorkflow).toContain(
      'Release branch may differ from source_sha only by $trigger.',
    );
  });
});
