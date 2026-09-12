# Harnex-assisted Transaction Import V2

Status: ACTIVE

## Goal and boundary

Import reasonably structured CSV/XLSX bank exports without fixed column names/order. Aura owns file discovery, executable schema candidates, deterministic extraction, review, duplicates and ledger commit. Harnex optionally assists schema/category selection through its authorized on-device Android Consumer boundary and owns model/runtime policy and lifecycle.

- Harnex failure never blocks manual import and never falls back to cloud AI.
- Existing Aura CSV/XLSX encoding, ZIP/formula/resource/row bounds remain authoritative.
- Harnex may select only Aura-generated schema/category IDs; unknown/invalid/duplicate IDs fail closed.
- Preserve the deterministic V1 `date,description,amount` fast path.
- Never send a complete workbook/ledger to Harnex or persist Harnex/source/provider/model provenance in `Transaction`.
- Review and verified transaction-only commit/read-back/rollback remain the only canonical write path.

Contract owners: [`V2 spec`](../specs/harnex-assisted-transaction-import-v2.md), [`ADR 0008`](../../adr/0008-aura-harnex-assisted-import.md), [`privacy record`](../04-privacy-gdpr/harnex-assisted-import-processing-record.md).

## Key implementation invariants

- Schema output is `resolved | ambiguous | unsupported`; model confidence is never correctness authority.
- Initial amount strategies are Aura-owned: `signed-negative-expense`, `signed-positive-expense`, `debit-credit`, `amount-direction`.
- Category resolution uses conservative local history first, then only supplied ephemeral active-category IDs; batches are sequential and bounded by the advertised Harnex input limit.
- Harnex use cases `aura-transaction-schema-inference` and `aura-transaction-category-classification` are local, stateless, JSON-schema constrained, cancellable and cleanup-safe.
- Android lifecycle order is assignment/default preset discovery -> activation -> capability/limit validation -> prepare/session/generate -> guaranteed close/deactivation.
- Packaged CI uses the real Firebase Web SDK against process-local Auth/Firestore emulators with a synthetic `.invalid` identity. The browser E2E auth bypass is never packaged.
- Android debug cleartext remains denied by default; only the explicit CI emulator lane can reach the local Firebase endpoints at `10.0.2.2`.

## Source checkpoint

- Aura base: `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`; branch: `feat/import-v2-integrated-ux-w10`.
- Harnex exact candidate: `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc`, PR #567; Validate #4427 passed integration/STRONG. Harnex uses exact `(modelDigest, modelProfileId)` residency/protection so Aura schema/category profiles sharing one artifact can transition safely.
- W9: Aura Repository health #111 proved host-absent fail-closed and the authorized two-APK lifecycle including assignment/readiness, schema/category profile switch, cancellation cleanup and reconnect/restart.
- W10: exact Aura `944c818da900588b68e5318f88aa0aa166780d6d`, Repository health #134 (`34681900077`), passed selector FULL, engineering baseline, web, browser `FULL_MEDIA`, exact Harnex host and Android API 36 preflight. Android evidence contains host-absent and lifecycle `OK (1 test)`, packaged G2 `status: PASS`, ledger unchanged before Review, two reviewed/committed `Food` expenses with clean metadata, successful following WebView journey and non-empty required media.
- Runs #129/#133 had reached G2 PASS before the AVD became offline during post-G2 media/WebView collection. After the repeated signature the harness changed strategy: completed Gradle/Kotlin daemons are released before Harnex G2 and ADB/emulator/memory/cgroup checkpoints are recorded. #134 stayed `device/alive`; the defect was CI resource lifecycle, not Aura/Harnex product semantics.
- `.engineering/e2e.json` classifies `harnex-assisted-import-user-flow` as material Android UI requiring `full_media`.
- Any material edit invalidates older exact-head evidence.

## Execution DAG

States: `READY | ACTIVE | BLOCKED | DONE`.

| ID | State | Acceptance |
| --- | --- | --- |
| W0 Contract/privacy freeze | DONE | Spec, ADR and privacy contract frozen. |
| W1 Multi-source corpus | DONE | Synthetic supported/ambiguous/rejected inputs. |
| W2 Generic profiler | DONE | Bounded local profile and executable candidates. |
| W3 Harnex host capability | DONE | Aura identities/use cases; unavailable states fail closed. |
| W4 Aura Consumer bridge | DONE | Typed Capacitor boundary and Consumer lifecycle. |
| W5 UX task/state contract | DONE | Mapping, progress, recovery, cancellation, accessibility. |
| W6 Manual vertical slice G1 | DONE | Generic source -> manual mapping -> deterministic extraction -> review/commit. |
| W7 Schema inference | DONE | Bounded candidate selection; invalid output fails closed. |
| W8 Category engine | DONE | History-first, sequential bounded batches, supplied-ID validation. |
| W9 Cross-app/eval lane | DONE | #111 exact Harnex lifecycle evidence. |
| W10 Integrated UX G2 | DONE | #134 exact FULL packaged assistance -> deterministic extraction -> Review -> verified commit with `FULL_MEDIA`. |
| W11 Hardening/docs | DONE | Privacy/security/offline/accessibility/limits/rollback/V1 contracts reconciled with implementation and tests. |
| W12 Integration preflight G3 | ACTIVE | Fresh post-W11 exact head; selector-owned deterministic gates and material UI evidence green. |
| W13 Release qualification | BLOCKED | Physical/model/accessibility/authorization/privacy-governance evidence. |

## W11 closure

- V1 is documented as the implemented deterministic fast path; V2 is a separate extension, not an AI/network fallback inside V1.
- V2 spec, privacy processing record/notes, discovery/current-state and testing strategy now describe the implemented local Harnex boundary rather than the retired Gemini workflow or a pending runtime.
- Existing tests cover resource limits, verified commit/read-back/rollback, manual/unavailable/invalid/ambiguous/cancelled recovery, Harnex lifecycle, and accessible task-state semantics. No compensating runtime patch was required.
- Privacy/legal owner work remains separate: lawful basis/transparency, RoPA/data inventory, DPIA/AI-governance screening and formal approval are release obligations, not claims established by automated engineering evidence.

## Risks and release evidence

| Risk | Evidence/mitigation |
| --- | --- |
| Silent wrong schema | Editable review; invalid/ambiguous response fails closed; unsafe-silent rate target 0. |
| Weak local-model semantics | Real-model qualification remains separate from deterministic CI. |
| Lifecycle/resource leak | Cancel/cleanup/reconnect two-APK automation plus ADB/memory health checkpoints. |
| V1 regression | V1 fast path remains isolated and regression-tested. |
| Cross-repo/auth drift | Exact Harnex source identity; real packaged Firebase-emulator auth; no deployable auth bypass. |

Deterministic emulator evidence is complete through exact #134, but W12 needs a fresh post-W11 exact-head run. Missing local Android tooling is `REMOTE_AUTOMATED`, not user-run work.

W13 remains `REAL_ENVIRONMENT`: physical Google/Credential Manager sign-in; representative ARM64/JNI/GGUF model quality/performance; thermal/memory/OEM behavior; Play/production signer authorization topology; representative TalkBack/text scaling; and applicable privacy/legal governance approval. Emulator success does not satisfy these.

## Executable now

1. Run W12 against the fresh post-W11 exact head; do not reuse #134 as final evidence after documentation edits.
2. Review complete PR diff, base freshness and absence of unrelated/generated/debug changes before a merge-readiness claim.
3. Preserve exact Harnex pin, isolated packaged auth, bounded CI cleartext exception and required `FULL_MEDIA`; do not weaken evidence to avoid resource pressure.

## Resume checkpoint

Aura base `dev@4d816359470a0bff2d2397b567faa117ec1e4c89`; W0-W11 DONE; exact Harnex `9074cf8d7dd5b90f5e49f6b3fc41622512faccbc` STRONG-validated; W10 reconfirmed by FULL #134; W12 ACTIVE on the new documentation head; W13 release-only downstream. Final settled truth must remain in spec/ADR/privacy/testing/current-state owners with every deferred release obligation preserved.
