# Security policy

Aura Finance handles personal financial information and intentionally minimizes the default data-exposure surface. Security changes must preserve the boundaries documented in `README.md`, `docs/04-privacy-gdpr/`, the accepted ADRs and the owning Android architecture docs.

## Core boundaries

- Canonical financial data is local-first.
- Optional cloud backup is opt-in and encrypted client-side before Firestore storage.
- Authentication/allowlist identity does not grant administrators plaintext access to user financial records.
- Android payment candidates are private, review-gated and excluded from canonical ledger/backup/export until the owning contract says otherwise.
- Production and debug Firebase/OAuth identities must remain isolated.
- Keystores, upload keys, passwords, tokens, local `.env*`, `google-services.json` and other credentials must never be committed, logged or bundled accidentally.

## Reporting a vulnerability

Do not publish exploit details, credentials, real financial records or other sensitive reproduction data in a public issue. Use GitHub's private security-reporting/advisory channel for the repository when available, and provide the smallest synthetic reproduction necessary to identify the affected boundary.

## Validation expectations

Security/data-lifecycle changes require affected unit/contract/integration evidence plus the strongest practical end-to-end environment needed by the claim. Browser/emulator evidence is not physical-device evidence. Release signing, real payment-source behavior, OEM lifecycle and other protected/physical properties remain separate evidence when they are material.

Never weaken a legitimate security/privacy gate merely to obtain a green build. Diagnose the owning invariant and update code, tests and durable documentation together.
