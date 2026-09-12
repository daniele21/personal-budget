import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const releaseWorkflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/google-play-release.yml'),
  'utf8',
);
const qualificationWorkflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/google-play-qualification.yml'),
  'utf8',
);
const healthWorkflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/repository-health.yml'),
  'utf8',
);

describe('Android Google Play release workflows', () => {
  it('keeps every play-release branch on the repository release validation stage', () => {
    expect(healthWorkflow).toContain('"play-release/**"');
    expect(healthWorkflow).toContain('main|play-release/*) STAGE="release"');
  });

  it('keeps normal internal and production publication main-gated', () => {
    expect(releaseWorkflow).toContain(
      'if ! git merge-base --is-ancestor "$source_sha" origin/main; then',
    );
    expect(releaseWorkflow).toContain(
      'Release source_sha must already belong to main.',
    );
    expect(releaseWorkflow).not.toContain('qualification=true');
  });

  it('limits W13 qualification to a dedicated internal branch family', () => {
    expect(qualificationWorkflow).toContain(
      '- "play-release/qualification/internal/**"',
    );
    expect(qualificationWorkflow).toContain(
      'prefix="play-release/qualification/internal/"',
    );
    expect(qualificationWorkflow).toContain(
      'trigger_track" != "internal"',
    );
    expect(qualificationWorkflow).toContain(
      'qualification" != "true"',
    );
    expect(qualificationWorkflow).toContain('track: internal');
  });

  it('requires the qualification source to equal current dev exactly', () => {
    expect(qualificationWorkflow).toContain(
      'git fetch --no-tags origin dev:refs/remotes/origin/dev',
    );
    expect(qualificationWorkflow).toContain(
      'current_dev_sha="$(git rev-parse refs/remotes/origin/dev)"',
    );
    expect(qualificationWorkflow).toContain(
      'if [[ "$source_sha" != "$current_dev_sha" ]]; then',
    );
    expect(qualificationWorkflow).toContain(
      'Qualification source_sha must equal current dev:',
    );
  });

  it('permits only the qualification trigger file to differ from current dev', () => {
    expect(qualificationWorkflow).toContain(
      'if (( ${#qualification_delta[@]} != 1 )) || [[ "${qualification_delta[0]:-}" != "$trigger" ]]; then',
    );
    expect(qualificationWorkflow).toContain(
      'Qualification branch may differ from source_sha only by $trigger.',
    );
  });

  it('requires successful repository release validation for the exact qualification commit', () => {
    expect(qualificationWorkflow).toContain(
      '"repos/${GITHUB_REPOSITORY}/actions/workflows/repository-health.yml/runs"',
    );
    expect(qualificationWorkflow).toContain('-f head_sha="$candidate_sha"');
    expect(qualificationWorkflow).toContain('-f event=push');
    expect(qualificationWorkflow).toContain(
      'Repository health $run_id passed for exact candidate $candidate_sha',
    );
  });
});
