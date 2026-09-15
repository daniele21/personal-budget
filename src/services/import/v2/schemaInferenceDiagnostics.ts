import type { SpreadsheetProfile } from '../../../domain/import/v2';
import {
  ensureImportV2DiagnosticAttempt,
  recordImportV2Diagnostic,
} from '../../../lib/importV2Diagnostics';
import {
  inferImportV2SchemaWithHarnex as inferImportV2SchemaWithHarnexRaw,
  type InferImportV2SchemaOptions,
  type ImportV2SchemaInferenceOutcome,
} from './schemaInference';

function profileSummary(profile: SpreadsheetProfile) {
  const visibleSheets = profile.sheets.filter((sheet) => sheet.state === 'visible');
  const headers = visibleSheets.flatMap((sheet) => sheet.headerCandidates);
  const columns = headers.flatMap((header) => header.columns);
  const safeColumns = columns.filter((column) =>
    column.nonEmptyCount > 0
    && column.formulaCount === 0
    && column.mergedCellCount === 0,
  );
  const dateCandidates = headers.reduce((total, header) => total + header.dateCandidates.length, 0);
  const amountCandidates = headers.reduce((total, header) => total + header.amountCandidates.length, 0);
  const descriptionCandidates = headers.reduce(
    (total, header) => total + header.descriptionCandidateColumnIds.length,
    0,
  );
  const resolvableHeaders = headers.filter((header) =>
    header.dateCandidates.length > 0
    && header.amountCandidates.length > 0
    && header.descriptionCandidateColumnIds.length > 0,
  ).length;

  return {
    sourceKind: profile.sourceKind,
    visibleSheets: visibleSheets.length,
    profiledHeaders: headers.length,
    safeColumns: safeColumns.length,
    dateCandidates,
    amountCandidates,
    descriptionCandidates,
    resolvableHeaders,
    resolvedBranch: resolvableHeaders > 0,
  } as const;
}

function recordOutcome(
  outcome: ImportV2SchemaInferenceOutcome,
  profiledHeaders: number,
  attemptId: string,
): void {
  switch (outcome.status) {
    case 'resolved':
      recordImportV2Diagnostic('schema-outcome', 'resolved', {}, attemptId);
      return;
    case 'ambiguous':
      recordImportV2Diagnostic('schema-outcome', 'ambiguous', {
        ambiguityCodes: [...outcome.ambiguities].sort().join(','),
      }, attemptId);
      return;
    case 'unsupported':
      recordImportV2Diagnostic('schema-outcome', 'unsupported', {
        reasonCode: profiledHeaders === 0 ? 'no-profiled-header' : 'model-unsupported',
      }, attemptId);
      return;
    case 'assistance-unavailable':
      recordImportV2Diagnostic('schema-outcome', 'assistance-unavailable', {
        failureCode: outcome.failure.code,
      }, attemptId);
  }
}

export async function inferImportV2SchemaWithHarnex(
  profile: SpreadsheetProfile,
  options: InferImportV2SchemaOptions = {},
): Promise<ImportV2SchemaInferenceOutcome> {
  const attemptId = ensureImportV2DiagnosticAttempt(profile.sourceKind);
  const summary = profileSummary(profile);
  recordImportV2Diagnostic('schema-profile', 'profiled', summary, attemptId);
  if (options.feedback) {
    recordImportV2Diagnostic('schema-feedback', 'requested', {
      feedbackArea: options.feedback.area,
    }, attemptId);
  }

  try {
    const outcome = await inferImportV2SchemaWithHarnexRaw(profile, options);
    recordOutcome(outcome, summary.profiledHeaders, attemptId);
    return outcome;
  } catch (error) {
    recordImportV2Diagnostic('schema-outcome', 'threw', { reasonCode: 'unexpected-exception' }, attemptId);
    throw error;
  }
}
