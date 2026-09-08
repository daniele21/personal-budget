import { readImportV2MappedSheet } from '../../data/import/importV2MappedFileReader';
import {
  extractImportV2Rows,
  resolveImportV2Mapping,
  type ImportV2MappingSelection,
  type SpreadsheetProfile,
} from '../../domain/import/v2';
import type { StructuredImportValidationResult } from '../../domain/import';

export interface ExecuteImportV2MappingOptions {
  today?: string;
}

export async function executeImportV2Mapping(
  file: File,
  profile: SpreadsheetProfile,
  mapping: ImportV2MappingSelection,
  options: ExecuteImportV2MappingOptions = {},
): Promise<StructuredImportValidationResult> {
  const resolved = resolveImportV2Mapping(profile, mapping);
  const source = await readImportV2MappedSheet(file, resolved);
  return extractImportV2Rows(source.rows, resolved, {
    sourceKind: source.sourceKind,
    csvDelimiter: source.csvDelimiter,
    today: options.today,
  });
}
