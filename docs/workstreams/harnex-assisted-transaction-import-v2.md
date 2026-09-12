# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12 integrated; W13 release qualification in progress.

## Goal and boundary

Aura imports reasonably structured CSV/XLSX without fixed headers. Aura owns profiling, executable schema candidates, deterministic extraction, Review and canonical commit; authorized on-device Harnex may select only Aura-owned schema/category IDs.

Invariants: no cloud fallback; manual import remains usable; V1 deterministic fast path remains isolated; complete workbook/ledger is never sent to Harnex; Harnex/provider/model provenance is not persisted in `Transaction`; Review + verified commit remains the only canonical write path.

Durable owners: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0008`](../../adr/0008-aura-harnex-assisted-import.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md). This file is only the active execution/resume plan.

## Integrated checkpoint

- Aura `dev`: `bea24e5eeb067c2e5e98822d26a2637a202d4944` (PR #24 merged).
- Harnex `dev`: `34ffa7905c7deb14909ac3331bfd7179e9d30106` (PR #567 merged).
- Integrated Harnex implementation pin: `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc`.
- Aura post-merge Repository health #139 (`34692614019`): green including browser `FULL_MEDIA`, exact Harnex build and Android API 36 packaged instrumentation/WebView.
- Harnex post-merge Validate #4430, distributable Android packaging and Play Internal publication: green.
- Deterministic automated integration evidence is complete. Emulator evidence is not physical-device evidence.

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

1. Settle intended Aura/Harnex release package + signing + Play topology (W13.1).
2. Identify first physical ARM64 reference device and representative GGUF model/profile (W13.2-W13.4).
3. Prepare synthetic/approved qualification corpus and result sheet without financial-content logging.
4. Start W13.6 governance checklist in parallel.
5. Execute W13.1/W13.2 first, then W13.3-W13.5 in parallel on the settled configuration.
6. Record only evidence references/state transitions here; put durable conclusions in canonical owners.

## Resume checkpoint

Aura integrated source: `dev@bea24e5eeb067c2e5e98822d26a2637a202d4944`. Harnex integrated source: `dev@34ffa7905c7deb14909ac3331bfd7179e9d30106`. W0-W12 DONE; deterministic post-merge automation green. W13 ACTIVE with six real-environment gates READY; none is claimed complete. Next discriminating action: W13.1 production-representative package/signer/Play authorization topology and physical unauthorized -> authorized -> restart/mismatch evidence.