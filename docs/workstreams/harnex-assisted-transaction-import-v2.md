# Harnex-assisted Transaction Import V2

Status: ACTIVE — W0-W12 integrated; W12.1 schema-discovery routing correction under validation; W13 release qualification in progress.

## Goal and boundary

Aura imports reasonably structured CSV/XLSX without fixed headers. Aura owns technical file gates, profiling, Aura-owned executable schema candidates, deterministic extraction, Review and canonical commit. Authorized on-device Harnex may select only supplied schema/category IDs. A technically safe file with unfamiliar columns must continue to Harnex/manual schema understanding rather than fail Upload because local heuristics cannot already prove a complete mapping.

Invariants: no cloud fallback; manual import remains usable; V1 deterministic fast path stays isolated; complete workbook/ledger is never sent to Harnex; no model-generated executable parser or ledger rule; Harnex/provider/model provenance is not persisted in `Transaction`; Review + verified commit remains the only canonical write path.

Durable owners: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0008`](../../adr/0008-aura-harnex-assisted-import.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md). This file is only the active execution/resume plan.

## Integrated checkpoint

- Aura integration base for W12.1: `dev@3e1c169af309adc2bf6b6ce302b0b8fd7a7aa961`.
- Harnex `dev@772a66083d6fa3d5e22ae00f659506a067f412fd`; Aura automation pin remains Harnex `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc`.
- Previous W12 integration evidence remains historical only: Aura PR #26 run `34939786383`, cross-repo run `34942259376`, Aura FULL run `34945603120` and Play run `34945602267`.
- Play Internal baseline: Aura `1.0.10` / `100162`; Harnex `1.0.57` / `57`.
- W12.1 requires new exact-head evidence; no older successful run can prove the corrected branch.

## W12.1 schema-discovery routing correction

Observed behavior: Aura could show Harnex ready and then return to Upload with `Aura could not find a safe date, amount, and description mapping for this file.` before schema assistance ran.

Root cause: UI and inference orchestration treated strict local candidate completeness as a prerequisite to Harnex. That inverted the intended boundary: unfamiliar-but-readable schema is exactly the case Harnex/manual mapping should resolve.

Correction contract:

- technical/resource safety rejects remain local and authoritative;
- canonical V1 remains the deterministic fast path;
- V2 profiling prefers strong local evidence but may expose a bounded fallback set of Aura-owned parser/amount possibilities for safe weakly typed columns;
- `mapping-required` always enters schema assistance/manual recovery rather than a complete-mapping precheck;
- Harnex may inspect an incomplete bounded profile and return `ambiguous`/`unsupported`; `resolved` stays JSON-schema constrained to advertised IDs;
- explicit mapping confirmation plus deterministic full-row extraction/validation remains the correctness gate before categorization, Review and commit;
- formula/merged/resource protections and verified-commit invariants remain unchanged.

Required regression proof: weakly typed arbitrary-header profiling, strong candidates beyond speculative fallback bounds, Harnex invocation for incomplete candidate sets, wizard routing without the former Upload error, V1/manual/ambiguous regressions, and packaged Android `harnex-assisted-import-user-flow` with `FULL_MEDIA`.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0-W12 Implementation/integration | DONE | Contracts, implementation and prior deterministic integration evidence are merged. |
| W12.1 Schema-discovery routing correction | ACTIVE | Unknown-but-safe schema reaches Harnex/manual mapping; deterministic validation still fails closed; exact-head automated integration and material UI evidence pass. |
| W13.1 Production identity/authorization | READY | Release signer/package topology authorizes only the exact Aura identity. |
| W13.2 Physical authentication | READY | Physical Google/Credential Manager lifecycle works without CI bypass. |
| W13.3 Real GGUF quality | READY | Representative ARM64/JNI/GGUF evaluation has unsafe silent schema mapping rate `0`. |
| W13.4 Performance/resource/OEM | READY | Accepted latency/memory/thermal/OEM envelope with no crash/ANR/OOM/leak. |
| W13.5 Accessibility | READY | TalkBack/text scaling keep task and recovery operable. |
| W13.6 Privacy/legal/AI governance | READY | Required approvals or documented non-applicability are complete. |
| W13 Release qualification | ACTIVE | W13.1-W13.6 DONE and release candidate passes required release gates. |

W12.1 automated integration validation can run independently of W13. W13 real-environment gates remain release work and are not replaced by emulator evidence.

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

W12.1 is DONE only when exact-head deterministic automation and required material UI evidence pass and the correction is integrated into `dev`. W13 is DONE only when W13.1-W13.6 are complete against the release identity/configuration. Promotion `dev -> main` remains separate.

## Immediate next actions

1. Complete W12.1 exact-head repository-health preflight for PR #29, including selector output, web/unit/build, browser `FULL_MEDIA`, Harnex host and packaged Android assisted-import journey.
2. Diagnose any failure against its owning invariant, update the exact branch HEAD, and rerun required deterministic automation.
3. When all required automated gates are green, integrate W12.1 into `dev` and update this checkpoint with the final source/run identity.
4. Continue W13.1-W13.6 independently as real-environment release qualification.

## Resume checkpoint

W0-W12 DONE. W12.1 ACTIVE on `fix/import-v2-schema-assistance-routing` from `dev@3e1c169af309adc2bf6b6ce302b0b8fd7a7aa961`; PR #29 is the integration vehicle. W13 remains ACTIVE with W13.1-W13.6 READY and no gate complete yet.
