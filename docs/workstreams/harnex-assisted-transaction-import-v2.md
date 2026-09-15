# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12 integrated; W13 release qualification in progress.

## Goal and boundary

Aura imports reasonably structured CSV/XLSX without fixed headers. Aura owns profiling, executable schema candidates, deterministic extraction, Review and canonical commit; authorized on-device Harnex may select only Aura-owned schema/category IDs.

Invariants: no cloud fallback; manual import remains usable; V1 deterministic fast path remains isolated; complete workbook/ledger is never sent to Harnex; Harnex/provider/model provenance is not persisted in `Transaction`; Review + verified commit remains the only canonical write path.

Durable owners: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0008`](../../adr/0008-aura-harnex-assisted-import.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md). This file is only the active execution/resume plan.

## Integrated checkpoint

- Aura `dev`: `d6282e3c851c240741ccea041d9e1a8e1466a5eb` (PR #27 merged after the Harnex readiness/recovery remediation).
- Harnex `dev`: `772a66083d6fa3d5e22ae00f659506a067f412fd` (PR #569 authorization UX + PR #570 Play SDK bootstrap fix integrated).
- Integrated Harnex runtime implementation pin used by Aura automation remains `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc`; PR #569 changes the Host authorization UI/read presentation, not the Binder/public protocol. Compatibility with the newer Host was additionally proven by the exact-pair cross-repo run below.
- Aura PR #26 exact-head Repository health run `34939786383`: STRONG green, including browser `FULL_MEDIA`, web validation and Android API 36 packaged instrumentation/WebView evidence.
- Harnex PR #569 exact-head Validate run `34943646634`: FULL green; authorization UI `FULL_MEDIA` run `34940793083` proves `Needs approval -> Allow Aura Finance -> Connected` with source-bound media.
- Cross-repo exact-pair run `34942259376`: Aura `52c85c8b373ac1dccbe11e46b2068f1fbebcfa3b` + Harnex `4b7b22e594738edf428d19f2d73d780c87a7ee45` green for Host-absent fail-closed behavior, authorized packaged lifecycle and assisted import UI.
- Aura current-source qualification: product source `dev@d6282e3c851c240741ccea041d9e1a8e1466a5eb`, qualification commit `9ee8bbfd110d86279b62caa68e7ee6913f9ba96f`, Google Play Internal `1.0.10` / versionCode `100162`, package `com.staituned.aura`, track `internal`.
- Aura qualification Repository health run `34945603120`: FULL deterministic validation is green on the exact qualification candidate. The first Android-emulator attempt reached `AURA_HARNEX_TWO_APK result=PASS` before the emulator process went offline during media collection; rerunning only that same exact-head Android job completed instrumentation, Harnex two-APK, WebView and media evidence successfully. This classifies the first failure as runner/emulator instability rather than a product regression.
- Aura Google Play Internal publication run `34945602267` succeeded on rerun after the FULL gate was green. Signed qualification evidence artifact `10389205546` (`aura-internal-qualification-1.0.10-100162`), artifact ZIP SHA-256 `22ec3939665402ec46200618b6674a71ac57dc4311269584631363a285d6888c`.
- Harnex Google Play Internal publication run `34946104432` succeeded from `dev@772a66083d6fa3d5e22ae00f659506a067f412fd`: versionName `1.0.57`, versionCode `57`, package `io.github.daniele21.localllm.phonetest`, track `internal`. Released AAB evidence artifact `10387880763`, artifact ZIP SHA-256 `314a9bae1438f565616081ff5f4ed84f61ed2d797fa338017251e496880a03e3`.
- Deterministic automated integration, source-bound media evidence and controlled-track publication evidence are complete for the current W13 checkpoint. Emulator/CI/Play publication evidence does not replace physical-device W13.1-W13.6 evidence.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12 Implementation/integration | DONE | Contracts, implementation, tests, cross-app Android automation and integration evidence are green and merged. |
| W13.1 Production identity/authorization | READY | Release-representative Aura/Harnex signer/package topology fails closed when unauthorized and works only for the explicitly authorized exact identity. |
| W13.2 Physical authentication | READY | Physical Google/Credential Manager sign-in/session lifecycle works without CI Firebase-emulator identity or packaged auth bypass. |
| W13.3 Real GGUF quality | READY | Representative ARM64/JNI/GGUF schema/category evaluation passes; unsafe silent schema mapping rate is 0. |
| W13.4 Performance/resource/OEM | READY | Accepted measured release envelope; no crash/ANR/OOM/process-loss/resource leak in representative repeated/cancel/restart scenarios. |
| W13.5 Accessibility | READY | TalkBack/text scaling keeps task, Review and recovery flows understandable and operable without color-only meaning. |
| W13.6 Privacy/legal/AI governance | READY | Required classification, transparency/lawful-basis, RoPA/data inventory and DPIA/AI-governance decisions are recorded and approved. |
| W13 Release qualification | ACTIVE | W13.1-W13.6 DONE with applicable evidence and no unresolved release blocker. |

W13.6 can start immediately. W13.3-W13.5 can run in parallel after a representative physical build/device exists. W13.1 settles the signing/authorization topology before physical evidence is treated as production-representative.

## Evidence identity and privacy

Every physical/model record captures: Aura/Harnex source + build/channel identity; package identities and non-secret signer identifiers; physical device model/Android/API/ABI; model digest + profile/preset identity; scenario/corpus ID; execution date; bounded result/timing/resource observations; evidence pointer.

Never record credentials/tokens/keystores/private signing material, raw bank files, account identifiers, transaction descriptions/amounts/categories or prompt/output content. Prefer synthetic/approved fixtures.

## W13 gate matrix

### W13.1 Production identity and Harnex authorization

Scenarios:
- representative release builds installed with Aura initially unauthorized;
- unauthorized and mismatched package/signer paths fail closed and retain manual import;
- explicitly authorize exact Aura release identity for schema + category use cases;
- execute schema then category assistance, restart both apps and repeat;
- exercise relevant update/reinstall path for the planned distribution topology.

Pass:
- only exact approved identity executes both use cases;
- debug/release/unrelated identities do not inherit authorization;
- restart/update behavior matches the persisted authorization contract;
- no cloud fallback/content logging.

Executor: `REAL_ENVIRONMENT` — physical device and production-representative signing/Play topology.

### W13.2 Physical Google/Credential Manager authentication

Scenarios: clean first sign-in; process death/restart; logout/login; cancelled credential selection; applicable offline/reconnect and release-channel update/reinstall.

Pass: successful sign-in reaches normal authenticated Aura state; cancel/failure is truthful/recoverable; session restore/logout is correct; release build contains no Android-CI Firebase-emulator identity/config; logs/evidence expose no credentials/tokens.

Executor: `REAL_ENVIRONMENT`.

### W13.3 Representative ARM64/JNI/GGUF quality

Corpus uses synthetic/approved non-sensitive files covering: V1 fast path; arbitrary English/localized headers; metadata rows; debit/credit and signed-amount strategies; multiple description columns; ambiguous and unsupported cases; multiple user category taxonomies.

Pass:
- required schema metric: `unsafe silent mapping rate = 0`;
- difficult/unsupported files may require manual correction but wrong automatic financial mapping blocks release;
- returned categories remain within supplied IDs and quality is evaluated across multiple taxonomies;
- Review remains authoritative.

Executor: `REAL_ENVIRONMENT` — representative ARM64 device + actual GGUF bytes.

### W13.4 Performance, memory, thermal and OEM envelope

Record representative schema/category/cancel/repeat runs: first/warm elapsed time, available Aura/Harnex memory observations, model residency/cleanup, crash/ANR/OOM/process loss, thermal/throttling observations, consecutive imports and restart behavior.

Device requirement: one primary physical ARM64 reference device. Before a broad Android release claim, add a materially different OEM/SoC/device class so `OEM behavior` is not inferred from one hardware family.

Pass: no crash/ANR/OOM/unexpected process loss or persistent resource leak; cancel/cleanup returns to usable state; repeated imports/restarts remain correct; measured latency/memory/thermal results receive an explicit supported release-envelope decision. Do not invent thresholds after failures merely to obtain PASS.

Executor: `REAL_ENVIRONMENT`.

### W13.5 TalkBack and text-scaling accessibility

Walkthrough: `Upload -> Understand file -> Check transactions -> Categorize -> Review -> Done` plus unauthorized/unavailable, ambiguous mapping, partial failure and cancellation/manual recovery.

Pass: actionable labels/focus order are usable; required progress/state is understandable; mapping/recovery/Review controls remain operable; text scaling preserves required actions/financial meaning; no state is color-only; no critical task/recovery path is materially ambiguous.

Executor: `REAL_ENVIRONMENT` — physical accessibility services + human judgement.

### W13.6 Privacy, legal and AI-governance approval

Owner decisions required:
- local Harnex controller/processor/internal-system classification;
- lawful basis + user transparency wording;
- RoPA/data-inventory representation;
- DPIA/applicable AI-governance screening outcome;
- approval of minimized inference fields and content-free logging;
- confirmation Harnex prompt/output persistence is disabled/not used for Aura;
- approval of unavailable/authorization/manual-fallback disclosure.

Pass: authoritative owner records approval or documented non-applicability for every item. Open governance questions block release; engineering cannot self-certify them.

Executor: `REAL_ENVIRONMENT` / human authority.

## Failure handling

Classify each W13 failure before changing code/configuration: product regression; signing/authorization configuration; model/preset quality; device/OEM/resource limitation; external account/service/environment; accessibility/design; governance/requirement gap.

Preserve failing evidence and fix the canonical owner. Deterministic defects discovered by W13 should gain repository-owned automated regression coverage where possible. Do not replace a failed real-environment scenario with emulator evidence.

## Release closure

W13 is DONE only when W13.1-W13.6 are DONE, applicable evidence still matches the release identity/configuration, durable owners contain any learned truth, and the exact release candidate passes the repository RELEASE selector with FULL deterministic gates plus required real-environment confirmation.

Promotion `dev -> main` is a separate explicit action after release qualification.

## Immediate next actions

1. Install/update the Play-delivered Harnex `1.0.57` and Aura `1.0.10` candidates on the first physical ARM64 reference device; begin W13.1 with Aura initially unauthorized in Harnex.
2. In Aura, verify that import assistance reports the authorization-required state and offers the Harnex recovery action; in Harnex verify `Needs approval`, review the exact Aura identity and explicitly allow it. Return to Aura and verify readiness refreshes to ready without reinstall/sideload.
3. Execute schema then category assistance on synthetic/approved input, restart both apps and repeat, then exercise disabled/manual-fallback and the relevant update/reinstall/mismatch path for the planned Play topology.
4. Prepare/run the synthetic/approved W13.3 corpus and performance/result sheet without financial-content logging; run W13.3-W13.5 in parallel once the W13.1 topology is settled.
5. Start/continue W13.6 governance approval in parallel.
6. Record only evidence references/state transitions here; put durable conclusions in canonical owners.

## Resume checkpoint

Aura integrated source: `dev@d6282e3c851c240741ccea041d9e1a8e1466a5eb`; current Play Internal candidate `1.0.10` / `100162` from qualification `9ee8bbfd110d86279b62caa68e7ee6913f9ba96f`. Harnex integrated source: `dev@772a66083d6fa3d5e22ae00f659506a067f412fd`; current Play Internal build `1.0.57` / `57`. W0-W12 DONE; deterministic exact-head/cross-app automation, FULL/FULL_MEDIA evidence and controlled-track publication are current. W13 ACTIVE with six real-environment gates READY; none is claimed complete. Next discriminating action: execute W13.1 production-representative package/signer/Play authorization evidence on a physical ARM64 device using the Play-delivered builds.