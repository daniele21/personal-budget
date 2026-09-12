# Harnex-assisted Transaction Import V2

Status: ACTIVE

## Goal

Import reasonably structured CSV/XLSX bank exports without fixed column names/order: Aura profiles locally, Harnex assists schema/category selection on-device, ambiguity stays reviewable, and only Aura's verified commit writes transactions.

## Boundary and non-goals

- Aura owns workflow, spreadsheet discovery, financial semantics, review, duplicates and ledger commit; Harnex owns authorization, use-case/model/runtime policy, Binder execution and lifecycle.
- Harnex is optional. Unavailable Harnex falls back to manual mapping; never to cloud AI.
- Out of scope: PDF/OCR, `.xls`/`.xlsm`, arbitrary parsing expressions, FX normalization, bank connectivity and financial advice.
- Never send a complete workbook/ledger to Harnex, persist Harnex/source provenance in `Transaction`, create categories silently or let Aura select Harnex models.
- Preserve the V1 `date,description,amount` fast path.

## Frozen contract owners

- feature contract: [`../specs/harnex-assisted-transaction-import-v2.md`](../specs/harnex-assisted-transaction-import-v2.md)
- trust/ownership: [`../../adr/0008-aura-harnex-assisted-import.md`](../../adr/0008-aura-harnex-assisted-import.md)
- privacy/data flow: [`../04-privacy-gdpr/harnex-assisted-import-processing-record.md`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md)

Material changes to data fields, model authority, network behavior, persistence or ledger/category semantics update the owner before implementation.

## Invariants

- Existing CSV/XLSX encoding, resource, ZIP, formula and row/file bounds remain Aura-local.
- AI may select only Aura-generated candidate/category IDs. Unknown, missing or duplicate IDs fail closed.
- Confirmed mapping -> deterministic Aura extraction of date, description, signed amount and type; unsafe silent mapping blocks release.
- Initial amount strategies: `signed-negative-expense`, `signed-positive-expense`, `debit-credit`, `amount-direction`; descriptions may join bounded columns.
- Schema output is `resolved | ambiguous | unsupported`; correctness never depends on model confidence.
- Categories resolve conservative normalized-description + type history first, then only supplied ephemeral IDs or unresolved.
- Harnex use cases are local, stateless, JSON-schema constrained, cancellable, cleanup-safe and content-free in ordinary logs: `aura-transaction-schema-inference`, `aura-transaction-category-classification`.
- Category batches are sequential and packed by advertised input budget.
- Harnex failure never blocks manual import. Verified commit, fingerprint, duplicate and undo semantics remain canonical.
- Packaged CI authentication uses the real Firebase Web SDK against process-local Auth/Firestore emulators with a synthetic `.invalid` identity; the serve-only browser E2E auth bypass is never packaged.

## Source checkpoint

- Aura W10 base: `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`.
- Current Harnex repair candidate: `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc`, PR #567. Its exact-head remote preflight Validate #4427 passed integration/STRONG, including Android validation, native packaging, repository validation and reusable evidence publication.
- Integrated Aura: #9 W1, #10 W2, #11 W4, #12 W5, #15 W6, #19 W7, #20 W8, #21 W9 implementation; Harnex #560 W3.
- Aura run #85 (`34276168216`) is **not** valid W9 lifecycle evidence: Harnex hit Room main-thread access and Aura's shell runner masked AndroidJUnitRunner failure as PASS. Its independent web/build evidence is unaffected.
- Harnex #565 repaired emulator shell threading and Aura package visibility; Aura also made AndroidJUnitRunner terminal success mandatory.
- Aura run #101 (`34453622256`) truthfully passed host-absent and Binder connect but failed the first schema capability probe. Root cause: Aura queried runtime capabilities before activating the Host-owned preset while Harnex's external-consumer profile resolution was activation-aware.
- Aura repair: discover assignment/default published preset -> activate -> query/validate capabilities and budgets -> prepare/session/generate, with probe/generate deactivation guaranteed and cleanup failure fail-closed. Packaged G2 reuses the already installed Aura APK instead of package-replacing it after Harnex authorization.
- Aura exact-head run #106 (`34466333324`) passed repository/baseline, E2E contract, type/engineering, unit/integration, production web build and browser `FULL_MEDIA`; Android host build, native unit/lint, packaged APK, emulator boot and base instrumentation also succeeded. The two-APK journey then failed before the Aura lifecycle when `DISABLE_AURA_SCHEMA` returned `A default binding must be enabled`.
- Harnex PR #567 repaired the default-binding fixture invariant and then the same-artifact schema -> category profile transition by protecting exact `(modelDigest, modelProfileId)` residency rather than every profile sharing a digest. Distinct Aura schema/category profiles remain distinct.
- Aura exact-head `b8df48bfabe8b5053c0988f4687474a40d83fa37`, Repository health #111 (`34622077635`), proved W9 end to end: host-absent fail-closed and the authorized packaged two-APK lifecycle both terminated with AndroidJUnitRunner `OK (1 test)`, including schema generation, category generation/profile switch, cancellation cleanup and reconnect/restart behavior.
- The same #111 run then failed only in packaged G2 UI setup because the bundled WebView was unauthenticated and correctly rendered `Continue with Google`; routing directly to `/history?import=1` cannot bypass `App.tsx`'s authenticated shell. The repair keeps product auth unchanged and provisions isolated Firebase Auth/Firestore emulators for the packaged CI artifact.
- The E2E contract declares `harnex-assisted-import-user-flow` as material Android UI evidence requiring `full_media`.
- W10 branch: `feat/import-v2-integrated-ux-w10`. Material edits invalidate older exact-head evidence.

## Material risks

| Risk | Level | Discriminating evidence |
| --- | --- | --- |
| Silent wrong schema | HIGH | Goldens; invalid/ambiguous results require editable review; unsafe-silent rate = 0. |
| Weak local model semantics | HIGH | Separate real-model qualification; deterministic CI never trusts self-confidence. |
| Wrong taxonomy | MEDIUM | Reject category IDs outside active Aura categories. |
| Lifecycle/resource leaks | HIGH | Cancel/close/retry/reconnect across Capacitor, Consumer SDK and two-APK automation. |
| Cross-repo drift | MEDIUM | Published SDK plus exact Harnex source identity. |
| V1 regression | MEDIUM | V1 fast path remains isolated and regression-tested. |
| Packaged auth drift | HIGH | Real Firebase SDK against isolated local emulators; no deployable auth bypass; packaged shell must authenticate before G2. |

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Depends | Acceptance |
| --- | --- | --- | --- |
| W0 Contract/privacy freeze | DONE | — | Spec, ADR and privacy contract frozen. |
| W1 Multi-source corpus | DONE | W0 | 21 synthetic supported/ambiguous/rejected source shapes. |
| W2 Generic discovery/profiler | DONE | W0 | Bounded local sheet/header/column profiling and executable candidates. |
| W3 Harnex host capability | DONE | W0 | Aura identities/use cases integrated; unauthorized/disabled/unready fail closed. |
| W4 Aura Consumer bridge | DONE | W0 | Published SDK lifecycle behind typed Capacitor boundary. |
| W5 UX task/state contract | DONE | W0 | Mapping, progress, recovery, cancellation and accessibility semantics implemented. |
| W6 Manual vertical slice G1 | DONE | W1,W2,W5 | Unknown source -> manual mapping -> deterministic extraction -> existing review/commit. |
| W7 Schema inference | DONE | W2,W3,W4,W6 | #19 bounded candidate selection; invalid output fails closed. |
| W8 Category engine | DONE | W3,W4,W6 | #20 history-first, bounded sequential batches, supplied-ID validation. |
| W9 Cross-app/eval lane | DONE | W3,W4 | #111 proved absent/auth/assignment/readiness/schema/category/profile-switch/cancel/reconnect lifecycle against exact Harnex `9074cf8d...`. |
| W10 Integrated UX G2 | ACTIVE | W7,W8,W9 | Prove authenticated packaged discovery -> assistance -> deterministic extraction -> categories -> review -> verified commit with `full_media`. |
| W11 Hardening/docs | BLOCKED | W10 | Privacy/security/offline/accessibility/limits/rollback/V1 current and tested. |
| W12 Integration preflight G3 | BLOCKED | W11 | Fresh exact heads; selector-owned deterministic gates green; material UI FULL_MEDIA. |
| W13 Release qualification | BLOCKED | W12 | Physical local-model/resource/accessibility/authorization evidence. |

## W10 implementation state

- Resolved Harnex schema output pre-fills only Aura IDs and still requires explicit editable mapping confirmation.
- Ambiguous/unsupported/unauthorized/unavailable/cancelled assistance stays manual and cannot commit.
- Aura deterministic extraction runs before category assistance.
- Categories use local history first, then bounded Harnex suggestions; only active Aura IDs modify ephemeral review state.
- Partial/cancelled category work preserves safe completed suggestions and leaves unresolved rows reviewable.
- No suggestion provenance enters canonical `Transaction`; Review/verified commit remains unchanged.
- Browser/Harnex-absent and V1 paths remain first-class regressions.
- Android Consumer lifecycle follows Host ownership: assignment/default preset discovery -> activation -> capability/limit validation -> prepare/session/generate -> guaranteed close/deactivation.
- Packaged G2 runs after W9 in the same authorized Host state without reinstalling Aura and is captured as material `full_media` evidence.
- The packaged CI shell authenticates through Firebase Auth + allowlist behavior against local `demo-*` Auth/Firestore emulators using a synthetic non-admin `.invalid` identity. Normal web/release and normal Android debug Firebase configuration remain unchanged, and the browser E2E auth bypass remains unbuildable.

## Validation

- W9 requires real Aura APK + real Harnex Host/Consumer on emulator. A PASS marker is valid only when AndroidJUnitRunner itself reports successful terminal status. #111 satisfies this requirement on the exact pinned Harnex candidate.
- W10/G2 additionally requires an authenticated packaged UI journey and `FULL_MEDIA`; lower-level Binder assertions alone are insufficient.
- Real-model quality is separate from deterministic CI.
- Missing local Android tooling is `REMOTE_AUTOMATED`, never user-run work.
- Physical Google/Credential Manager sign-in, ARM64/GGUF, thermal/memory/OEM, Play signer topology and representative TalkBack/text scaling remain release `REAL_ENVIRONMENT` evidence.

## Executable now

1. Run Aura selector-owned exact-head automation pinned to Harnex `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc`.
2. Require the packaged G2 UI verifier to authenticate through the isolated Firebase emulator lane, then complete schema/category assistance, explicit mapping confirmation, deterministic extraction, Review and verified commit with captured `FULL_MEDIA`.
3. Start W11 only after W10 G2 is green on the same material Aura HEAD.

## Resume checkpoint

Aura base `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`; W0-W9 DONE; Harnex exact candidate `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc` is STRONG-validated; W10 ACTIVE with its packaged UI auth precondition repaired through isolated Firebase emulators and awaiting exact-head FULL evidence; W11-W13 downstream. Next discriminating action: selector-owned FULL Aura automation, accepting W10 only if the authenticated packaged G2 journey is terminal and green.

Record failed hypotheses/evidence and deferred `REAL_ENVIRONMENT` obligations. Never reuse success from an older material HEAD.

## Durable destinations

Before deleting this completed plan, transfer settled truth to owning spec/ADR/privacy/security/testing/current-state/code documents.
