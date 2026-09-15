# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12 integrated; W13 release qualification in progress.

## Goal and boundary

Aura imports reasonably structured CSV/XLSX without fixed headers. Aura owns profiling, executable schema candidates, deterministic extraction, Review and canonical commit; authorized on-device Harnex may select only Aura-owned schema/category IDs.

Invariants: no cloud fallback; manual import remains usable; V1 deterministic fast path stays isolated; complete workbook/ledger is never sent to Harnex; Harnex/provider/model provenance is not persisted in `Transaction`; Review + verified commit remains the only canonical write path.

Durable owners: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0008`](../../adr/0008-aura-harnex-assisted-import.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md). This file is only the active execution/resume plan.

## Integrated checkpoint

- Aura `dev`: `d6282e3c851c240741ccea041d9e1a8e1466a5eb`; Harnex `dev`: `772a66083d6fa3d5e22ae00f659506a067f412fd`.
- Aura automation runtime pin remains Harnex `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc`; PR #569 changed Host authorization UI/read presentation, not Binder/public protocol. Newer-Host compatibility is separately proven by the exact-pair run below.
- Aura PR #26 run `34939786383`: STRONG green with browser `FULL_MEDIA`, web and Android packaged evidence. Harnex PR #569 run `34943646634`: FULL green; authorization `FULL_MEDIA` run `34940793083` proves `Needs approval -> Allow Aura Finance -> Connected`.
- Cross-repo run `34942259376`: Aura `52c85c8b373ac1dccbe11e46b2068f1fbebcfa3b` + Harnex `4b7b22e594738edf428d19f2d73d780c87a7ee45` green for Host-absent fail-closed, authorized lifecycle and assisted import UI.
- Aura current-source Play Internal: `1.0.10` / `100162`, package `com.staituned.aura`, product source `d6282e3c851c240741ccea041d9e1a8e1466a5eb`, qualification `9ee8bbfd110d86279b62caa68e7ee6913f9ba96f`. FULL run `34945603120` is green; its first Android attempt reached `AURA_HARNEX_TWO_APK result=PASS` before emulator loss during media capture, while an exact-head rerun passed the full Android/media/WebView gate. Play run `34945602267` succeeded; artifact `10389205546`, ZIP SHA-256 `22ec3939665402ec46200618b6674a71ac57dc4311269584631363a285d6888c`.
- Harnex current Play Internal: `1.0.57` / `57`, package `io.github.daniele21.localllm.phonetest`, source `772a66083d6fa3d5e22ae00f659506a067f412fd`. Play run `34946104432` succeeded; artifact `10387880763`, ZIP SHA-256 `314a9bae1438f565616081ff5f4ed84f61ed2d797fa338017251e496880a03e3`.
- Deterministic integration, source-bound media and controlled-track publication are complete for this checkpoint. They do not replace physical W13.1-W13.6 evidence.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12 Implementation/integration | DONE | Contracts, implementation, tests and cross-app automation are green and merged. |
| W13.1 Production identity/authorization | READY | Release-representative signer/package topology fails closed when unauthorized and works only for the explicitly authorized exact identity. |
| W13.2 Physical authentication | READY | Physical Google/Credential Manager session lifecycle works without CI identity/bypass. |
| W13.3 Real GGUF quality | READY | Representative ARM64/JNI/GGUF schema/category evaluation passes; unsafe silent schema mapping rate is 0. |
| W13.4 Performance/resource/OEM | READY | Accepted release envelope; no crash/ANR/OOM/process-loss/resource leak in representative repeat/cancel/restart scenarios. |
| W13.5 Accessibility | READY | TalkBack/text scaling keeps task, Review and recovery understandable and operable without color-only meaning. |
| W13.6 Privacy/legal/AI governance | READY | Required privacy, transparency, inventory/DPIA and AI-governance decisions are approved or documented non-applicable. |
| W13 Release qualification | ACTIVE | W13.1-W13.6 DONE with current evidence and no unresolved release blocker. |

W13.6 can start immediately. W13.3-W13.5 can run in parallel after a representative physical device exists. W13.1 settles signing/authorization topology before physical evidence is production-representative.

## Evidence identity and privacy

Physical/model evidence records Aura/Harnex build/channel, package + non-secret signer identity, physical device/API/ABI, model digest/profile, scenario/corpus, execution date and bounded result/timing/resource observations. Never record credentials, signing material, real bank content, transaction fields or prompt/output content; prefer synthetic/approved fixtures.

## W13 gate matrix

### W13.1 Production identity and Harnex authorization

Run Play/release-representative builds with Aura initially unauthorized; verify unauthorized/mismatched identities fail closed with manual import, explicitly approve exact Aura identity for both use cases, run schema then category assistance, restart/repeat, and exercise the relevant update/reinstall path.

Pass: only the exact approved identity executes; other identities do not inherit authorization; persistence/update behavior matches contract; no cloud fallback/content logging.

Executor: `REAL_ENVIRONMENT` — physical device + production-representative signing/Play topology.

### W13.2 Physical Google/Credential Manager authentication

Exercise clean sign-in, process death/restart, logout/login, cancelled selection and applicable offline/reconnect/update paths. Pass when sign-in/session restore/logout are correct and recoverable, release build has no CI Firebase identity/config, and evidence leaks no credentials/tokens.

Executor: `REAL_ENVIRONMENT`.

### W13.3 Representative ARM64/JNI/GGUF quality

Use synthetic/approved files spanning V1 fast path, arbitrary/localized headers, metadata rows, debit/credit and signed amounts, multiple descriptions, ambiguous/unsupported cases and multiple category taxonomies.

Pass: `unsafe silent mapping rate = 0`; unsupported inputs may require manual correction but wrong automatic financial mapping blocks release; category outputs stay within supplied IDs; Review remains authoritative.

Executor: `REAL_ENVIRONMENT` — representative ARM64 + actual GGUF bytes.

### W13.4 Performance, memory, thermal and OEM envelope

Measure first/warm schema/category/cancel/repeat runs, memory/residency cleanup, crash/ANR/OOM/process loss, thermal behavior and restarts on one primary ARM64 device; add a materially different OEM/SoC before a broad Android claim.

Pass: no crash/ANR/OOM/unexpected process loss or persistent leak; cancel/cleanup returns usable state; repeat/restart remains correct; measured latency/memory/thermal data receives an explicit supported-envelope decision.

Executor: `REAL_ENVIRONMENT`.

### W13.5 TalkBack and text-scaling accessibility

Walk `Upload -> Understand file -> Check transactions -> Categorize -> Review -> Done` plus unauthorized/unavailable, ambiguous mapping, partial failure, cancellation and manual recovery.

Pass: labels/focus/progress are usable; mapping/recovery/Review remain operable under text scaling; no required state is color-only or materially ambiguous.

Executor: `REAL_ENVIRONMENT` — physical accessibility services + human judgement.

### W13.6 Privacy, legal and AI-governance approval

Record authoritative decisions for local Harnex classification, lawful basis/transparency, RoPA/data inventory, DPIA/AI-governance screening, minimized inference fields/content-free logging, no Aura prompt/output persistence, and unavailable/authorization/manual-fallback disclosure.

Pass: each item is approved or documented non-applicable. Open governance questions block release; engineering cannot self-certify them.

Executor: `REAL_ENVIRONMENT` / human authority.

## Failure handling and closure

Classify W13 failures before changing code/config: product regression; signing/authorization; model/preset quality; device/OEM/resource; external environment; accessibility/design; governance/requirement. Preserve evidence, fix the canonical owner, and add deterministic regression coverage where possible; never replace failed real-environment evidence with emulator evidence.

W13 is DONE only when W13.1-W13.6 are DONE, evidence still matches release identity/configuration, durable owners contain learned truth, and the exact release candidate passes RELEASE/FULL plus required real-environment confirmation. Promotion `dev -> main` remains a separate explicit action.

## Immediate next actions

1. Install/update Play-delivered Harnex `1.0.57` and Aura `1.0.10` on the first physical ARM64 reference device; start W13.1 with Aura unauthorized.
2. Verify Aura reports authorization required and can open Harnex; Harnex shows `Needs approval`; approve exact Aura identity, return, and verify Aura refreshes to ready without sideload/reinstall.
3. Run schema + category assistance on synthetic input, restart/repeat, then disabled/manual-fallback and relevant update/reinstall/mismatch scenarios.
4. Run W13.3-W13.5 in parallel after W13.1 topology is settled; continue W13.6 governance in parallel. Record only bounded evidence/state here; durable conclusions belong to canonical owners.

## Resume checkpoint

Aura `dev@d6282e3c851c240741ccea041d9e1a8e1466a5eb`, Play Internal `1.0.10` / `100162` from qualification `9ee8bbfd110d86279b62caa68e7ee6913f9ba96f`. Harnex `dev@772a66083d6fa3d5e22ae00f659506a067f412fd`, Play Internal `1.0.57` / `57`. W0-W12 DONE; deterministic exact-head/cross-app automation, FULL/FULL_MEDIA and controlled-track publication are current. W13 ACTIVE with six `REAL_ENVIRONMENT` gates READY; none is complete. Next discriminating action: W13.1 package/signer/Play authorization evidence on a physical ARM64 device using the Play-delivered builds.