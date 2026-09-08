# Transaction Import V2 Synthetic Corpus

This corpus is the golden input contract for `docs/specs/harnex-assisted-transaction-import-v2.md`.

Rules:
- every person, merchant, account-like value, date and amount is synthetic;
- never copy a real bank statement into this directory;
- CSV fixtures are committed as UTF-8 text;
- XLSX fixtures are declared in `xlsx-cases.json` and materialized in tests with ExcelJS; binary workbooks are never committed;
- `cases.json` owns expected schema/extraction outcomes; implementation-specific candidate IDs are intentionally excluded;
- `resolved` means one safe mapping is expected, `ambiguous` requires review, `unsupported` must not be silently coerced, and `rejected` is a structural/security failure;
- malformed/resource fixtures prove fail-closed behavior and are not model-quality examples.

The corpus intentionally varies naming, delimiter/decimal conventions, header placement, sheet layout, amount representation and ambiguity. W2/W7 tests may consume these goldens, but W1 itself does not call a model or implementation parser.
