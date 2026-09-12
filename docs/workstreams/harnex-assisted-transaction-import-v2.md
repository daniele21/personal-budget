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
- Android debug cleartext remains denied by default; the CI emulator lane permits only `10.0.2.2` for local Auth/Firestore HTTP endpoints.

## Source checkpoint

- Aura base: `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`.
- Harnex exact candidate: `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc`, PR #567. Validate #4427 passed integration/STRONG including Android validation, native packaging, repository validation and reusable evidence publication.
- Integrated Aura: #9 W1, #10 W2, #11 W4, #12 W5, #15 W6, #19 W7, #20 W8, #21 W9 implementation; Harnex #560 W3.
- W9 exact evidence: Aura `b8df48bfabe8b5053c0988f4687474a40d83fa37`, Repository health #111 (`34622077635`), proved host-absent fail-closed and authorized two-APK lifecycle including schema/category profile switch, cancellation cleanup and reconnect/restart. Its packaged G2 then exposed the unauthenticated WebView precondition.
- The packaged-auth repair keeps product auth unchanged and uses isolated Firebase Auth/Firestore emulators with a synthetic non-admin `.invalid` identity. Normal web/release and ordinary Android debug configuration remain unchanged.
- Harnex PR #567 also repaired exact `(modelDigest, modelProfileId)` residency/protection so distinct Aura schema/category profiles sharing an artifact can transition safely.
- W10 first accepted exact evidence: Aura `9dd9dde0ad2f8c70e71fbd054fffea9b7fc0331d`, Repository health #132 (`34678973020`), passed selector FULL, engineering baseline, web validation, browser `FULL_MEDIA`, exact Harnex host build and Android API 36 preflight.
- #132 Android evidence contains terminal `OK (1 test)` for host-absent and packaged lifecycle plus packaged G2 `status: PASS`: date/amount/description mapping selected, `ledgerBeforeConfirm=0`, review remained outside the ledger, both synthetic transactions were reviewed, categorized `Food`, committed as expenses with clean metadata, and `AURA_HARNEX_TWO_APK result=PASS`. Android instrumentation, Harnex G2 and WebView each produced non-empty video and screenshot evidence.
- W10 exact-head confirmation after tracker/CI hardening: Aura `944c818da900588b68e5318f88aa0aa166780d6d`, Repository health #134 (`34681900077`), FULL success across selector, engineering baseline, web, browser `FULL_MEDIA`, exact Harnex host and Android API 36 preflight. The two-APK lane again produced host-absent and packaged-lifecycle `OK (1 test)`, G2 `status: PASS`, two reviewed/committed `Food` expenses with clean metadata and all required media, followed by a successful generic WebView journey.
- Runs #129/#133 had already reached G2 PASS before the API 36 emulator went `offline` during post-journey media/WebView collection. After the repeated signature, the diagnostic strategy changed: the harness now releases completed Gradle/Kotlin daemons before Harnex G2 and records ADB/emulator/memory/cgroup health checkpoints. #134 stayed `device/alive` through G2 and WebView; the failure was CI resource lifecycle, not Aura/Harnex product semantics.
- The E2E contract declares `harnex-assisted-import-user-flow` material Android UI requiring `full_media`.
- Branch: `feat/import-v2-integrated-ux-w10`. Material edits invalidate older exact-head evidence.

## Material risks

| Risk | Level | Discriminating evidence |
| --- | --- | --- |
| Silent wrong schema | HIGH | Goldens; invalid/ambiguous results require editable review; unsafe-silent rate = 0. |
| Weak local model semantics | HIGH | Separate real-model qualification; deterministic CI never trusts self-confidence. |
| Wrong taxonomy | MEDIUM | Reject category IDs outside active Aura categories. |
| Lifecycle/resource leaks | HIGH | Cancel/close/retry/reconnect across Capacitor, Consumer SDK and two-APK automation. |
| Cross-repo drift | MEDIUM | Published SDK plus exact Harnex source identity. |
| V1 regression | MEDIUM | V1 fast path remains isolated and regression-tested. |
| Packaged auth drift | HIGH | Real Firebase SDK against isolated local emulators; no deployable auth bypass; authenticated packaged shell required. |

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
| W9 Cross-app/eval lane | DONE | W3,W4 | #111 proved absent/auth/assignment/readiness/schema/category/profile-switch/cancel/reconnect against exact Harnex `9074cf8d...`. |
| W10 Integrated UX G2 | DONE | W7,W8,W9 | #132 accepted packaged discovery -> assistance -> deterministic extraction -> categories -> review -> verified commit; #134 reconfirmed exact-head FULL + `full_media` after CI resource hardening. |
| W11 Hardening/docs | DONE | W10 | Privacy/security/offline/accessibility/limits/rollback/V1 contracts reconciled with implemented behavior and existing automated tests/evidence. |
| W12 Integration preflight G3 | ACTIVE | W11 | Fresh exact head after W11; selector-owned deterministic gates green; material UI FULL_MEDIA. |
| W13 Release qualification | BLOCKED | W12 | Physical local-model/resource/accessibility/authorization evidence. |

## W10 accepted behavior

- Resolved Harnex schema output pre-fills only Aura IDs and still requires explicit editable mapping confirmation.
- Ambiguous/unsupported/unauthorized/unavailable/cancelled assistance stays manual and cannot commit.
- Aura deterministic extraction runs before category assistance.
- Categories use local history first, then bounded Harnex suggestions; only active Aura IDs modify ephemeral review state.
- Partial/cancelled category work preserves safe completed suggestions and leaves unresolved rows reviewable.
- No suggestion provenance enters canonical `Transaction`; Review/verified commit remains unchanged.
- Android Consumer lifecycle follows Host ownership: assignment/default preset discovery -> activation -> capability/limit validation -> prepare/session/generate -> guaranteed close/deactivation.
- Packaged G2 executes after W9 in the same authorized Host state without reinstalling Aura.
- Browser/Harnex-absent and V1 paths remain first-class regressions.

## W11 hardening closure

- V1 is documented as the implemented deterministic fast path; V2 is a separate extension, not an AI/network fallback inside V1.
- V2 implementation status, privacy processing record, privacy notes, discovery/current-state and testing strategy now reflect the implemented local Harnex boundary rather than the retired Gemini workflow or a pending-runtime state.
- Existing Aura file/ZIP/formula/row limits remain authoritative and are covered by domain/service/browser tests; V2 profiling does not weaken them.
- Existing verified transaction-only commit/read-back/rollback and undo remain canonical; Harnex never owns persistence.
- Harnex unavailable/unauthorized/unready/invalid/ambiguous/cancelled/offline paths retain manual recovery with no cloud fallback.
- Harnex-specific task UI already exposes busy/live/alert/progress semantics, named controls, focus trapping and non-color-only meaning, with focused component/state tests.
- Cross-app tests cover authorization/readiness/profile transitions/cancellation/reconnect; packaged G2 verifies ledger stays unchanged before Review and committed transactions contain no Harnex/import provenance.
- Privacy owner governance (lawful basis/transparency/RoPA/DPIA/AI-governance) remains a release obligation; automated engineering evidence does not claim legal approval.

## Validation and deferred release evidence

- Deterministic W9/W10 emulator evidence is complete and reconfirmed by exact Aura FULL #134 on `944c818da900588b68e5318f88aa0aa166780d6d` with exact Harnex `9074cf8d...`.
- #134 resource checkpoints remained `adb_state=device` and `emulator_state=alive` through packaged G2; post-G2 memory remained healthy and the following WebView journey passed. Required Android instrumentation/Harnex/WebView media were non-empty.
- Real-model quality is separate from deterministic CI.
- Missing local Android tooling is `REMOTE_AUTOMATED`, never user-run work.
- Physical Google/Credential Manager sign-in, ARM64/JNI/GGUF behavior and model quality, thermal/memory/OEM lifecycle, Play signer topology, and representative TalkBack/text scaling remain release `REAL_ENVIRONMENT` evidence. Emulator success does not satisfy them.

## Executable now

1. W12: validate the fresh post-W11 exact head against the unchanged base using the selector-owned integration gates; do not reuse #134 after this documentation change.
2. Review the complete PR diff/base freshness and confirm no unrelated/debug/generated changes before any merge-readiness claim.
3. Preserve the isolated packaged-auth lane, exact Harnex pin and bounded debug cleartext exception; do not weaken `FULL_MEDIA` or deterministic Android evidence to avoid resource pressure.
4. Keep W13 physical/model/privacy-governance obligations deferred to release; integration automation cannot satisfy them.

## Resume checkpoint

Aura base `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`; W0-W11 DONE; Harnex exact `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc` STRONG-validated; W10 reconfirmed by Aura FULL #134 on `944c818da900588b68e5318f88aa0aa166780d6d`; W12 ACTIVE because this W11 documentation commit creates a new exact head; W13 remains release-only downstream. Next action: fresh exact-head W12 integration preflight, full diff/base-freshness review, then transfer final evidence to PR/current-state owners while retaining all deferred `REAL_ENVIRONMENT` obligations.

## Durable destinations

Before deleting this completed plan, transfer settled truth to owning spec/ADR/privacy/security/testing/current-state/code documents and preserve every deferred release obligation.
