# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12 integrated; W13 release qualification in progress.

## Goal and boundary

Import reasonably structured CSV/XLSX bank exports without fixed column names/order. Aura owns file discovery, executable schema candidates, deterministic extraction, review, duplicates and ledger commit. Harnex optionally assists schema/category selection through its authorized on-device Android Consumer boundary and owns model/runtime policy and lifecycle.

Durable product and privacy truth is owned by the V2 spec, ADR 0008, privacy processing record and testing strategy. This file is the active execution/resume plan only.

Key invariants remain unchanged:

- Harnex failure never blocks manual import and never falls back to cloud AI.
- Existing Aura CSV/XLSX encoding, ZIP/formula/resource/row bounds remain authoritative.
- Harnex may select only Aura-generated schema/category IDs; unknown/invalid/duplicate IDs fail closed.
- Preserve the deterministic V1 `date,description,amount` fast path.
- Never send a complete workbook/ledger to Harnex or persist Harnex/source/provider/model provenance in `Transaction`.
- Review and verified transaction-only commit/read-back/rollback remain the only canonical write path.

Contract owners: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0008`](../../adr/0008-aura-harnex-assisted-import.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md).

## Current integrated checkpoint

- Aura `dev`: `bea24e5eeb067c2e5e98822d26a2637a202d4944` (merge of PR #24).
- Harnex `dev`: `34ffa7905c7deb14909ac3331bfd7179e9d30106` (merge of PR #567).
- Exact Harnex implementation consumed by the integrated Aura workflow remains `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc`.
- Aura post-merge Repository health #139 (`34692614019`) passed engineering baseline, web validation, browser critical journeys with `FULL_MEDIA`, exact Harnex host/Consumer SDK build and Android API 36 packaged instrumentation/WebView preflight.
- Harnex post-merge `Validate #4430` passed integration/STRONG; distributable Android packaging and Play Internal publication also passed on the merged Harnex `dev` commit.
- Deterministic automated integration evidence is therefore complete. W13 must not re-label emulator evidence as physical-device evidence.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12 Implementation/integration | DONE | Product contracts, implementation, deterministic tests, cross-app Android automation and exact-head/full-media integration evidence are green and merged to `dev`. |
| W13.1 Production identity/authorization | READY | Realistic release-signed Aura/Harnex identity proves fail-closed unauthorized behavior and explicit authorized use-case execution without signer/package widening. |
| W13.2 Physical authentication | READY | Physical Google/Credential Manager sign-in and session lifecycle work without CI Firebase-emulator identities or packaged auth bypasses. |
| W13.3 Real GGUF quality | READY | Representative ARM64/JNI/GGUF schema/category behavior is measured against declared goldens; unsafe silent schema mapping rate is 0. |
| W13.4 Performance/resource envelope | READY | Physical measurements establish an accepted release envelope with no crash/ANR/OOM/process-loss/resource-leak regressions across representative repeated import/cancel/restart scenarios. |
| W13.5 Accessibility | READY | Representative TalkBack and text-scaling walkthrough proves the full task/recovery flow remains understandable and operable without color-only meaning. |
| W13.6 Privacy/legal/AI governance | READY | Privacy/product owner records the required classification, transparency/lawful-basis, RoPA/data-inventory and DPIA/AI-governance decisions and approves the implemented minimization/logging boundary. |
| W13 Release qualification | ACTIVE | W13.1-W13.6 DONE, release evidence references captured, no unresolved release blocker. |

W13.6 can proceed immediately in parallel. W13.3-W13.5 may proceed in parallel once a representative physical build/device configuration is available. W13.1 should settle the release signing/authorization topology before evidence is treated as representative of production.

## W13 evidence identity

Every physical/model evidence record must capture enough identity to reproduce the claim without exposing credentials or financial content:

- Aura source revision and build identity/version/channel;
- Harnex source revision and build identity/version/channel;
- Aura/Harnex package identities and signer fingerprints or stable non-secret signer identifiers needed to prove authorization topology;
- physical device manufacturer/model, Android version/API, ABI and relevant memory class;
- Harnex model artifact digest, model profile ID/preset and relevant inference configuration identity;
- scenario/corpus identifier and execution date;
- result plus bounded timings/resource observations;
- evidence pointer (report, screenshot/video or approved governance record).

Do not record passwords, OAuth/Firebase tokens, keystores, private signing material, raw bank files, account identifiers, transaction descriptions/amounts/categories or prompt/output content in W13 reports. Synthetic/approved fixtures should be used for repeatable evidence where possible.

## W13.1 Production identity and Harnex authorization

### Objective

Prove that the caller-identity boundary works with the signing/package topology that will actually be released, rather than only debug/emulator identities.

### Scenarios

1. Install representative Harnex and Aura builds without pre-authorizing Aura.
2. Confirm Aura discovers assistance as unavailable/unauthorized and preserves manual import; no generation or hidden ledger mutation occurs.
3. Authorize the exact Aura release identity for both `aura-transaction-schema-inference` and `aura-transaction-category-classification`.
4. Run schema then category assistance and confirm the runtime resolves the authorized exact package/signer identity.
5. Restart Aura and Harnex and repeat capability/prepare/generation.
6. Exercise a relevant update/reinstall path if the planned distribution/signing topology can change package installation state.
7. Confirm a mismatched/unapproved signer or package cannot inherit authorization.

### Pass

- unauthorized/mismatched identity fails closed and manual fallback remains usable;
- exact approved release identity can execute both use cases;
- authorization does not widen across debug/release or unrelated package/signer identities;
- restart/update behavior matches the intended persisted authorization contract;
- no cloud fallback or content logging appears.

Executor: `REAL_ENVIRONMENT` — physical device plus production-representative signing/Play topology.

## W13.2 Physical Google/Credential Manager authentication

### Objective

Prove Aura's normal packaged authentication path on a physical device using real Google Play Services/Credential Manager behavior.

### Scenarios

- clean first sign-in;
- app process death/restart with an existing session;
- explicit sign-out then sign-in;
- denied/cancelled credential selection with recoverable UI;
- offline/reconnect behavior where applicable;
- relevant upgrade/reinstall behavior for the intended release channel.

### Pass

- successful sign-in reaches the normal authenticated Aura state;
- cancel/failure is truthful and recoverable;
- session restore/logout behavior matches product expectations;
- no Android-CI Firebase emulator identity/configuration is present in the release build;
- no credentials/tokens are exposed in logs/evidence.

Executor: `REAL_ENVIRONMENT` — physical device/account authority.

## W13.3 Representative ARM64/JNI/GGUF model quality

### Objective

Qualify actual on-device model behavior, which deterministic CI intentionally does not claim.

### Corpus

Use synthetic or approved non-sensitive files covering at least:

- canonical V1 file to confirm the deterministic fast path remains isolated;
- arbitrary but supported English and localized headers;
- metadata rows before the table;
- debit/credit and signed-amount strategies;
- multiple description columns;
- intentionally ambiguous schema cases that must request manual resolution;
- unsupported/malformed cases that must fail closed;
- multiple distinct user category taxonomies for category classification.

### Metrics and pass

Schema qualification records correct, manual/ambiguous and unsafe-silent outcomes. Required safety metric:

`unsafe silent mapping rate = 0`

A hard/unsupported file may require user correction; a wrong automatic financial mapping is a release blocker. Category evaluation must report outcomes across multiple taxonomies and must not accept category IDs outside the supplied set. Category quality may inform model/preset selection, but it never bypasses Review.

Executor: `REAL_ENVIRONMENT` — representative ARM64 device and actual GGUF model bytes.

## W13.4 Performance, memory, thermal and OEM envelope

### Objective

Establish a measured release envelope instead of inventing unvalidated latency/RAM thresholds.

### Required observations

For representative schema inference, category batches, cancellation and repeated imports record:

- first-run and warm-run elapsed time;
- Aura/Harnex process memory/RSS observations where available;
- model load/residency behavior and cleanup after cancel/close;
- crash, ANR, OOM, process death or transport loss;
- device thermal/throttling observations available from platform tooling;
- behavior after multiple consecutive imports and app/host restart.

A primary physical ARM64 reference device is required. Before a broad Android general-release claim, add a materially different OEM/SoC/device class so the tracked `OEM behavior` obligation is not represented by one hardware family only.

### Pass

- no crash/ANR/OOM/unexpected process loss or persistent resource leak in the release scenarios;
- cancellation/cleanup returns the system to a usable state;
- repeated imports/restarts remain functionally correct;
- measured latency/memory/thermal results are reviewed and an explicit supported release envelope is accepted. If observations show an unacceptable envelope, fix the owning cause or narrow the release claim explicitly; do not invent a threshold after seeing failures merely to obtain PASS.

Executor: `REAL_ENVIRONMENT`.

## W13.5 TalkBack and text-scaling accessibility

### Objective

Validate the user task, not internal model mechanics, under representative accessibility settings.

### Walkthrough

Exercise `Upload -> Understand file -> Check transactions -> Categorize -> Review -> Done` plus unauthorized/unavailable, ambiguous mapping, partial category failure and cancellation/recovery states.

Check:

- TalkBack focus order and actionable labels;
- progress/state announcements where needed;
- mapping controls and recovery actions are operable;
- Review exposes enough information to make the commit decision;
- text scaling does not hide/truncate required actions or financial meaning;
- states are not communicated only by color;
- cancellation and manual fallback remain discoverable.

### Pass

No critical task or recovery path is blocked or materially ambiguous with representative TalkBack/text scaling. Any issue affecting financial review/commit correctness is release-blocking.

Executor: `REAL_ENVIRONMENT` — physical accessibility services and human usability judgement.

## W13.6 Privacy, legal and AI-governance approval

### Objective

Close the governance actions already recorded in `harnex-assisted-import-processing-record.md`; engineering CI is not authority for these decisions.

### Required owner decisions

- controller/processor/internal-system classification for local Harnex processing;
- lawful basis and user-facing transparency wording;
- RoPA/data-inventory representation of the Aura -> local Harnex boundary;
- DPIA and applicable AI-governance screening outcome;
- approval of the minimized fields supplied to schema/category inference;
- confirmation that Harnex prompt/output persistence or content logging is not enabled for Aura use cases;
- approval of unavailable/authorization/manual-fallback disclosure.

### Pass

The authoritative privacy/product owner records an approval or a documented non-applicability decision for every required item. Open legal/governance questions remain release blockers; engineering must not self-certify them.

Executor: `REAL_ENVIRONMENT` / human authority.

## Failure handling

For every W13 failure classify before changing code/configuration:

- current product regression;
- signing/authorization configuration defect;
- model/preset quality limitation;
- device/OEM/resource limitation;
- external account/service/environment failure;
- accessibility/product-design defect;
- governance/requirement gap.

Identify the canonical owner and preserve the failing evidence. Deterministic defects discovered by W13 should receive normal repository-owned automated regression coverage where possible before the fix is considered complete. A real-environment failure is not fixed by weakening the scenario or replacing it with emulator evidence.

## Release closure

W13 can be marked DONE only when:

1. W13.1-W13.6 are DONE with evidence pointers;
2. no material code/configuration change has invalidated the applicable evidence;
3. the release candidate is refreshed against current `dev` and the repository RELEASE selector is run;
4. required deterministic RELEASE gates are FULL and green on the exact release candidate;
5. required real-environment evidence applies to that release identity/configuration;
6. durable spec/privacy/testing/design owners contain any truth learned during qualification.

Promotion `dev -> main` is a separate explicit release action after these conditions. Do not promote solely because W13 engineering notes exist.

## Immediate next actions

1. Settle and record the intended Aura/Harnex release package + signing + Play distribution topology for W13.1.
2. Identify the first physical ARM64 reference device and the representative Harnex GGUF model/profile for W13.2-W13.4.
3. Prepare the synthetic/approved real-model qualification corpus and result sheet without financial-content logging.
4. Start the privacy-owner checklist in W13.6 in parallel.
5. Execute W13.1/W13.2 first; then run W13.3-W13.5 in parallel on the settled representative configuration.
6. Update this tracker with evidence references and state transitions only; keep detailed durable conclusions in their canonical owners.

## Resume checkpoint

Aura integrated source is `dev@bea24e5eeb067c2e5e98822d26a2637a202d4944`; Harnex integrated source is `dev@34ffa7905c7deb14909ac3331bfd7179e9d30106`. W0-W12 are DONE and deterministic post-merge automation is green. W13 is ACTIVE with six real-environment gates READY. No W13 gate is currently claimed complete. Next discriminating action is W13.1: establish the production-representative package/signer/Play authorization topology and run unauthorized -> authorized -> restart/mismatch evidence on a physical device.