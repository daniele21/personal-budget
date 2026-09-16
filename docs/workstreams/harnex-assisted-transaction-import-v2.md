# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12.2 are integrated on `dev`; W13 release qualification is the active workstream stage.

Canonical contracts: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0009`](../../adr/0009-aura-interactive-harnex-import-interpretation.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md). ADR 0008 is superseded for the schema-understanding boundary.

## Goal and invariants

Aura accepts technically safe CSV/XLSX exports whose semantic structure is not known in advance. Aura owns safety/resource gates, bounded raw-document representation, the declarative transformation language, deterministic execution/provenance, Review and canonical commit. Authorized on-device Harnex may interpret bounded source content and propose only Aura-owned primitives.

A proposal has no authority until Aura renders a deterministic preview and the user explicitly confirms that exact proposal. Rejection or revision invalidates confirmation and requires a new preview/confirmation. After confirmed full execution, every candidate row is resolved or explicit unresolved; no row is silently invented or dropped.

For a small unresolved set, Aura may attempt bounded row repair. The confirmed sheet/layout stay immutable; Harnex may return only row-local parser/column/amount-strategy references, never canonical financial values. Aura deterministically re-executes each accepted repair. Any remaining unresolved row keeps preparation/commit blocked; `global-plan-wrong` returns to global interpretation feedback.

Cross-cutting invariants: no cloud fallback; no Harnex storage write; no model-generated executable parsing code; source/plan/preview/feedback/repair state is session-only; diagnostics are content-free; V1 remains the deterministic fast path; verified Review/commit remains the only ledger writer.

## Integrated implementation

W12.2 is integrated through PR #33. The canonical path now includes:

- bounded source-shaped CSV/XLSX read plus fresh full local execution read;
- JSON-schema-constrained Harnex transformation-plan inference from visible bounded source windows;
- Aura validation and deterministic provenance-bearing preview;
- mandatory `Check interpretation` with `Yes, this is correct` / `Something is wrong`;
- structured feedback requesting a complete replacement proposal and second confirmation gate;
- full-file execution only for the exact confirmed proposal;
- explicit unresolved-row accounting with no partial preparation/commit;
- bounded repair for at most eight unresolved rows, one Harnex generation per row, using only confirmed header + target-row context;
- repair output limited to Aura-owned semantic source references; deterministic Aura re-execution decides acceptance;
- `global-plan-wrong`, invalid repair, Harnex unavailability and residual unresolved rows remain blocking with global revision/manual recovery;
- category assistance and verified Review/commit remain downstream and unchanged.

Row repair reuses `aura-transaction-schema-inference`; it does not add a new Binder/use-case policy surface.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12 prior implementation | DONE | Candidate-based V2 baseline integrated. |
| W12.1 diagnostics/schema-routing correction | DONE | Unknown safe schema reaches assistance/manual path; content-free diagnostics integrated. |
| W12.2.1 contract/docs/raw reader | DONE | Bounded source-shaped reader and transformation-plan contract integrated. |
| W12.2.2 inference + preview | DONE | Only valid plan primitives accepted; deterministic provenance preview integrated. |
| W12.2.3 confirmation/feedback | DONE | Explicit correct/wrong gate and revised-proposal reconfirmation integrated. |
| W12.2.4 full executor/accounting | DONE | Confirmed-plan-only execution; every candidate row resolved or explicit unresolved. |
| W12.2.5 exception repair + category integration | DONE | Bounded row repair cannot mutate global layout or author values; category/cancel/cleanup invariants integrated. |
| W12.2.6 exact-head integration | DONE | Final W12.2 HEAD passed selector-required browser/Android `FULL_MEDIA` and all automated gates before merge. |
| W13 release qualification | ACTIVE | Qualify a fresh Play-installed Aura release candidate against the exact current Harnex release and close all applicable real-environment/privacy gates before promotion. |
| W13.1 production identity/authorization | READY | Play-installed Aura release identity is authorized by Play-installed Harnex; missing/unauthorized paths fail closed to safe recovery. |
| W13.2 physical Google sign-in | READY | Physical-device Credential Manager/Google sign-in happy path, sign-out, cancellation and failure recovery are verified. |
| W13.3 real model quality | READY | ARM64/JNI/GGUF execution validates source interpretation, bounded repair and category assistance against the curated corpus; ambiguous cases stay reviewable/blocking. |
| W13.4 performance/resource/OEM | READY | Representative devices meet acceptable inference latency/memory/thermal behavior and lifecycle/OEM background behavior remains usable/fail-safe. |
| W13.5 material UX accessibility | READY | TalkBack and scaled-text walkthrough covers Harnex unavailable/authorization/model states, interpretation preview, explicit confirmation/feedback/reconfirmation, row-repair recovery, category review and final commit. |
| W13.6 privacy/legal/AI governance | READY | Privacy owner approves the processing record, minimization/retention/transparency/lawful-basis record and DPIA/AI-governance screening. |

## Validation and evidence

W12.2 final PR evidence is Repository Health #227 on Aura `e46bc8187ed309b8a00313b0c28ad704bdb38d9d`, with exact Harnex `b4dd636c220819aabc0ac046bb6e690e55ea80ae`. The FULL integration matrix passed engineering baseline, web type/tests/build, browser `FULL_MEDIA`, exact Harnex host/Consumer SDK identity, Android native unit/lint, packaged APK, API 36 emulator, packaged instrumentation/WebView journeys and evidence upload. PR #33 merged to `dev` as `e1227248a8281ca364610f4b53dd9eaa53cbbc8e`; post-merge Repository Health #228 is the exact merge-head confirmation and must be green before its evidence is recorded as complete.

Harnex `b4dd636c220819aabc0ac046bb6e690e55ea80ae` is already published to Google Play Internal Testing by Harnex `Publish Play Internal` run `35082206990` as package `io.github.daniele21.localllm.phonetest`, versionName `1.0.59`, versionCode `59`. This is the Harnex release candidate for W13 unless its exact source changes.

Aura owns `.github/workflows/google-play-qualification.yml`. A W13 Aura candidate must come from the then-current `dev`, use a dedicated `play-release/qualification/internal/v<semver>` branch whose only delta is `android/release-trigger.properties`, pass release/FULL Repository Health, build/sign the release AAB and publish that exact candidate to Google Play Internal Testing. The semantic version is a release decision and is not inferred from `android/version.properties` or historical qualification branches.

W13.1-W13.6 remain `REAL_ENVIRONMENT` where they genuinely require Play-installed packages, physical hardware, representative model/runtime behavior, accessibility judgement or privacy-owner authority. Deterministic build/package/publish gates remain `REMOTE_AUTOMATED` and are never delegated to the user merely because the agent cannot execute them locally.

## W13 evidence contract

- **W13.1:** Play-installed Aura + Harnex package/version identity, positive authorization, negative/missing authorization and content-free logs.
- **W13.2:** physical-device screenshots/video and scrubbed logs for sign-in, sign-out, cancellation and recovery.
- **W13.3:** model identity plus curated-corpus summary and representative pass/fail/ambiguous cases for interpretation, repair and category assistance.
- **W13.4:** device/OS inventory plus latency, memory, thermal and lifecycle/OEM observations.
- **W13.5:** annotated TalkBack/scaled-text walkthrough and accessibility checklist for the material import journey.
- **W13.6:** approved privacy processing record/decision log, including no prompt/output/feedback persistence and bounded source/feedback minimization.

No release promotion is allowed while an applicable W13 gate remains unconfirmed.

## Resume checkpoint

W12.2 is integrated on `dev` via PR #33. Current canonical merge commit is `e1227248a8281ca364610f4b53dd9eaa53cbbc8e`; Repository Health #228 is the post-merge exact-head confirmation. Harnex Play Internal `1.0.59` is already available from exact source `b4dd636c220819aabc0ac046bb6e690e55ea80ae`.

Next automated action after #228 is green: select the Aura qualification semantic version from the release owner/policy, create the exact-current-`dev` Google Play qualification candidate and inspect its FULL/package/publish evidence. After Aura reaches Internal Testing, execute W13.1 first, then the remaining applicable real-environment/privacy gates. Promotion to `main` stays blocked until W13 is complete.