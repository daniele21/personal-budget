# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12.2 are integrated on `dev`; W13 release qualification is active with current Aura/Harnex candidates published to Google Play Internal Testing.

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
| W13 release qualification | ACTIVE | Current Play-installed Aura/Harnex candidates exist; close all applicable real-environment/privacy gates before promotion. |
| W13.1 production identity/authorization | READY | Play-installed Aura release identity is authorized by Play-installed Harnex; missing/unauthorized paths fail closed to safe recovery. |
| W13.2 physical Google sign-in | READY | Physical-device Credential Manager/Google sign-in happy path, sign-out, cancellation and failure recovery are verified. |
| W13.3 real model quality | READY | ARM64/JNI/GGUF execution validates source interpretation, bounded repair and category assistance against the curated corpus; ambiguous cases stay reviewable/blocking. |
| W13.4 performance/resource/OEM | READY | Representative devices meet acceptable inference latency/memory/thermal behavior and lifecycle/OEM background behavior remains usable/fail-safe. |
| W13.5 material UX accessibility | READY | TalkBack and scaled-text walkthrough covers Harnex unavailable/authorization/model states, interpretation preview, explicit confirmation/feedback/reconfirmation, row-repair recovery, category review and final commit. |
| W13.6 privacy/legal/AI governance | READY | Privacy owner approves the processing record, minimization/retention/transparency/lawful-basis record and DPIA/AI-governance screening. |

## Validation and evidence

W12.2 final PR evidence is Repository Health #227 on Aura `e46bc8187ed309b8a00313b0c28ad704bdb38d9d`, with exact Harnex `b4dd636c220819aabc0ac046bb6e690e55ea80ae`. The FULL integration matrix passed engineering baseline, web type/tests/build, browser `FULL_MEDIA`, exact Harnex host/Consumer SDK identity, Android native unit/lint, packaged APK, API 36 emulator, packaged instrumentation/WebView journeys and evidence upload. PR #33 merged to `dev` as `e1227248a8281ca364610f4b53dd9eaa53cbbc8e`; post-merge Repository Health #228 passed on that exact merge head.

PR #34 then aligned the durable W13 tracker and merged to `dev` as product-source commit `322e25bd65b23a0c684d182b45f48e3041da9947`. The current Aura qualification candidate is `9478ee3e54cf626aecee4d6edafcf630714ca76f`, whose only delta from that source is `android/release-trigger.properties`.

Aura Google Play Internal qualification is complete for versionName `1.0.12`, versionCode `100232`, package `com.staituned.aura`, product source `322e25bd65b23a0c684d182b45f48e3041da9947` and qualification commit `9478ee3e54cf626aecee4d6edafcf630714ca76f`. Repository Health #232 / run `35093031951` selected release/FULL and passed engineering baseline, web validation, browser `FULL_MEDIA`, exact Harnex host/Consumer SDK and packaged Android API 36 instrumentation/WebView evidence. Google Play W13 qualification run `35093031651` then passed release-readiness, R8/release bundle/signature verification and published that exact candidate to the `internal` track. Evidence artifact `10445417326` has ZIP SHA-256 `974be36c4d17f3f7fb3f90942d09f543975118ad09e6469dd536aaafde0644b6`.

Harnex `b4dd636c220819aabc0ac046bb6e690e55ea80ae` is published to Google Play Internal Testing by Harnex `Publish Play Internal` run `35082206990` as package `io.github.daniele21.localllm.phonetest`, versionName `1.0.59`, versionCode `59`. This remains the exact Harnex W13 candidate unless its source changes.

The automated build/package/sign/publish path is therefore exercised on the current W13 candidate pair. This is `AUTOMATED_PREFLIGHT_CONFIRMED` plus controlled-track publication evidence; it does not satisfy W13.1-W13.6 real-environment/privacy evidence.

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

W12.2 and its W13 activation bookkeeping are integrated on `dev`. Aura `1.0.12` / `100232` and Harnex `1.0.59` / `59` are both available on Google Play Internal from the exact sources recorded above, and Aura FULL automated qualification/publication is green.

Immediate next action: execute **W13.1 production identity/authorization** on a physical device using those Play-installed candidates. Verify the unauthorized/missing path fails closed with manual recovery, explicitly authorize the exact Aura identity for both Harnex-assisted import use cases, exercise schema interpretation and category assistance, restart both apps and repeat, and cover the applicable update/reinstall path. W13.2-W13.5 can proceed on representative hardware once W13.1 establishes the production signer/authorization topology; W13.6 can proceed independently with the privacy/legal owner. Promotion to `main` remains blocked until every applicable W13 gate is complete.
