# Deterministic Transaction Import V1 Fixtures

These fixtures define the M0 behavioral corpus for
[`deterministic-transaction-import-v1.md`](../../../docs/specs/deterministic-transaction-import-v1.md).

Rules:

- all people, merchants and amounts are synthetic;
- fixture files must not contain production exports or personal data;
- CSV files are committed as UTF-8 text;
- XLSX cases are described by `xlsx-cases.json` and must be materialized in
  tests with ExcelJS rather than committing opaque binary workbooks;
- generated XLSX buffers are test artifacts and are never retained;
- expected issue codes are authoritative; UI copy is tested separately.

## Corpus

| Fixture | Expected result |
|---|---|
| `valid-comma.csv` | 4 valid rows; one duplicate group; one future-date warning relative to the fixed test date |
| `valid-semicolon-comma-decimal.csv` | 3 valid rows using European decimals |
| `invalid-header.csv` | `header_order` and `header_unknown` according to the parsed header contract |
| `invalid-rows.csv` | deterministic date, description, amount and column-count errors |
| `mixed-decimals.csv` | `mixed_decimal_format` |
| `formula-like-description.csv` | valid stored text; later export must formula-escape it |
| `aura-legacy.csv` | route to the existing Aura transaction CSV importer |
| `renamed-archive.csv` | generated in tests from the `AURAARC1` prefix; archive classification must stop parsing |
| `xlsx-cases.json` | declarative XLSX worksheet, formula, hidden-sheet and multi-sheet cases |
| large/oversized | generated programmatically at exact limit boundaries; do not commit large redundant text blobs |

The fixed domain test date is `2026-08-03`. Tests must not depend on the real
clock or local timezone.

