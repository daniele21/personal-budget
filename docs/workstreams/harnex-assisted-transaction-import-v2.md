# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12.1 integrated; W13 release qualification in progress.

## Goal and boundary

Aura imports reasonably structured CSV/XLSX without fixed headers. Aura owns technical file gates, profiling, Aura-owned executable schema candidates, deterministic extraction, Review and canonical commit. Authorized on-device Harnex may select only supplied schema/category IDs. A technically safe file with unfamiliar columns must continue to Harnex/manual schema understanding rather than fail Upload because local heuristics cannot already prove a complete mapping.

Invariants: no cloud fallback; manual import remains usable; V1 deterministic fast path stays isolated; complete workbook/ledger is never sent to Harnex; no model-generated executable parser or ledger rule; Harnex/provider/model provenance is not persisted in `Transaction`; Review + verified commit remains the only canonical write path.

Durable owners: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0008`](../../adr/0008-aura-harnex-assisted-import.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md). This file is only the active execution/resume plan.

## Integrated checkpoint

- Aura W12.1 product correction merged through PR #29 at `dev@9bb9ed3b3cfb3fec84e2a3d441afa711f933b19d`; exact-head STRONG repository-health run `34963959305` passed required web, browser FULL_MEDIA, Harnex host and Android emulator gates.
- Android FULL_MEDIA gate hardening/diagnostics merged through PR #30 at `dev@f31d4cb7d5e1e715a57869d3de5223c789c6939c`; exact-head FULL repository-health run `34972468025` passed repository health, web validation, browser FULL_MEDIA and Android API 36 emulator validation.
- Harnex `dev@772a66083d6fa3d5e22ae00f659506a067f412fd`; Aura automation pin remains Harnex `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc`.
- Play Internal baseline remains Aura `1.0.10` / `100162`; Harnex `1.0.57` / `57`.
- W13 physical/release evidence remains separate; emulator evidence does not satisfy real-device, signer, model-quality, thermal/OEM, accessibility or governance gates.

## W12.1 schema-discovery routing correction

Observed behavior: Aura could show Harnex ready and then return to Upload with `Aura could not find a safe date, amount, and description mapping for this file.` before schema assistance ran.

Root cause: UI and inference orchestration treated strict local candidate completeness as a prerequisite to Harnex. That inverted the intended boundary: unfamiliar-but-readable schema is exactly the case Harnex/manual mapping should resolve.

Integrated correction:

- technical/resource safety rejects remain local and authoritative;
- canonical V1 remains the deterministic fast path;
- V2 profiling prefers strong local evidence but may expose a bounded fallback set of Aura-owned parser/amount possibilities for safe weakly typed columns;
- `mapping-required` enters schema assistance/manual recovery rather than a complete-mapping precheck;
- Harnex may inspect an incomplete bounded profile and return `ambiguous`/`unsupported`; `resolved` stays JSON-schema constrained to advertised IDs;
- explicit mapping confirmation plus deterministic full-row extraction/validation remains the correctness gate before categorization, Review and commit;
- formula/merged/resource protections and verified-commit invariants remain unchanged.

Regression evidence covers weakly typed arbitrary-header profiling, strong candidates beyond speculative fallback bounds, Harnex invocation for incomplete candidate sets, wizard routing without the former Upload error, V1/manual/ambiguous regressions, and packaged Android `harnex-assisted-import-user-flow` with `FULL_MEDIA`.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12 Implementation/integration | DONE | Contracts, implementation and prior deterministic integration evidence are merged. |
| W12.1 Schema-discovery routing correction | DONE | Unknown-but-safe schema reaches Harnex/manual mapping; deterministic validation remains fail-closed; exact-head automated integration and material UI evidence passed and the correction is integrated into `dev`. |
| W13.1 Production identity/authorization | READY | Release signer/package topology authorizes only the exact Aura identity. |
| W13.2 Physical authentication | READY | Physical Google/Credential Manager lifecycle works without CI bypass. |
| W13.3 Real GGUF quality | READY | Representative ARM64/JNI/GGUF evaluation has unsafe silent schema mapping rate `0`. |
| W13.4 Performance/resource/OEM | READY | Accepted latency/memory/thermal/OEM envelope with no crash/ANR/OOM/leak. |
| W13.5 Accessibility | READY | TalkBack/text scaling keep task and recovery operable. |
| W13.6 Privacy/legal/AI governance | READY | Required approvals or documented non-applicability are complete. |
| W13 Release qualification | ACTIVE | W13.1-W13.6 DONE and release candidate passes required release gates. |

W13 real-environment gates remain release work and are not replaced by emulator evidence.

## W13 gate notes

- **W13.1 `REAL_ENVIRONMENT`:** Play/release-representative Aura starts unauthorized; approve the exact identity; verify schema/category assistance, restart/update/reinstall and mismatch behavior.
- **W13.2 `REAL_ENVIRONMENT`:** clean sign-in, process death/restart, logout/login, cancel and offline/reconnect with release configuration.
- **W13.3 `REAL_ENVIRONMENT`:** representative ARM64 + actual GGUF over synthetic/approved V1, arbitrary-header, debit/credit, signed, ambiguous and unsupported fixtures. Wrong automatic financial mapping blocks release.
- **W13.4 `REAL_ENVIRONMENT`:** first/warm/cancel/repeat runs, memory/residency cleanup, crash/ANR/OOM/process loss and thermal behavior; add materially different OEM/SoC before broad claims.
- **W13.5 `REAL_ENVIRONMENT`:** TalkBack/text scaling through `Upload -> Understand file -> Check transactions -> Categorize -> Review -> Done` plus unavailable/ambiguous/cancel/recovery states.
- **W13.6 human authority:** lawful basis/transparency, data inventory/RoPA, DPIA/AI-governance screening, bounded inference fields/content-free logging and no prompt/output persistence.

Physical/model evidence records build/channel, non-secret identity, device/API/ABI, model digest/profile, scenario/corpus, date and bounded timing/resource results. Never record credentials, signing material or real bank content.

## Failure handling and closure

Classify failures before patching: current regression; signing/authorization; model/preset quality; device/OEM/resource; environment/toolchain; accessibility/design; or governance/requirement. Fix the canonical owner and add deterministic regression coverage where possible. Never replace failed real-environment evidence with emulator evidence.

W12.1 is DONE: the corrected product path and required automated/material UI evidence are integrated into `dev`. W13 is DONE only when W13.1-W13.6 are complete against the release identity/configuration. Promotion `dev -> main` remains separate.

## Immediate next actions

1. Execute W13.1 production identity/authorization against a Play/release-representative Aura build and exact Harnex authorization topology.
2. Execute W13.2-W13.5 physical authentication, GGUF quality, resource/OEM and accessibility evidence with bounded non-secret records.
3. Complete W13.6 privacy/legal/AI-governance authority or record explicit non-applicability where justified.
4. Only after W13.1-W13.6 are DONE, run release-stage validation and consider promotion `dev -> main`.

## Resume checkpoint

W0-W12.1 DONE and integrated through `dev@f31d4cb7d5e1e715a57869d3de5223c789c6939c`. PR #29 delivered the schema-discovery correction; PR #30 hardened the Android FULL_MEDIA gate and corrected validation scope for Android/Harnex E2E runners. W13 remains ACTIVE with W13.1-W13.6 READY and no real-environment gate complete yet.
