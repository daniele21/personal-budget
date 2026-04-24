# Solution Strategy

## Chosen Direction

Aura Finance remains a local-first personal budget PWA. Cloud storage is limited to an explicit opt-in encrypted backup used for restore across devices.

## Decisions

### Cloud Backup

Chosen: opt-in encrypted backup with visible status.

Rationale: financial records are sensitive; users should know when data leaves the device. Firestore stores only encrypted backup payloads tied to the authenticated UID.

### Categories

Chosen: archive categories instead of deleting historical meaning.

Rationale: deleting a category from the active picker should not erase the semantic label attached to old transactions, budgets, recurring items, or reports.

### Recurring Entries

Chosen: model recurring entries as monthly templates with explicit start and end dates plus month-specific overrides.

Rationale: a recurring payment must stay stable as the source pattern while still allowing one-off adjustments, such as a single mortgage installment changing from 100 to 102 without rewriting the whole plan.

### AI

Chosen: no AI in current scope.

Rationale: the product value is reliable budgeting and reporting. AI would add privacy, governance, cost, and explanation burden without a confirmed user need.

### Admin

Chosen: admin manages access allowlist only.

Rationale: the admin should decide who can access the app, not read personal financial records.

## Accepted Tradeoffs

- Local-first storage favors privacy and simplicity, but large transaction histories may eventually need IndexedDB-backed domain repositories.
- Encrypted Firestore backup improves restore capability, but requires clear user-facing status and deletion controls.
- Category archive is simpler than a full category entity model; a future migration to category IDs may be needed for stronger rename semantics.
