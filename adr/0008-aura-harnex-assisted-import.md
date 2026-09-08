# ADR 0008: Harnex-Assisted Transaction Import Boundary

- Status: Accepted
- Date: 2026-09-08
- Relates to: ADR 0002, ADR 0006
- Supersedes: the V1 import assumption that arbitrary spreadsheet understanding and AI categorization are out of scope; V1 itself remains supported as the canonical fast path.

## Context

Aura's deterministic Transaction Import V1 intentionally accepts only `date,description,amount` and removed the former Gemini-assisted generic spreadsheet flow. That decision restored predictable local parsing and removed a remote AI/vendor boundary, but it requires users to reshape bank exports before import.

Aura now needs to understand reasonably structured CSV/XLSX exports with arbitrary/localized column names and to suggest categories from the user's existing taxonomy without reintroducing remote inference or allowing model output to own financial semantics.

Harnex is a separate Android local-AI runtime/control plane. Its Consumer boundary keeps model selection, runtime policy, Binder authorization, cancellation and resource lifecycle outside Aura while allowing an explicitly authorized Android consumer to request local structured inference. Aura remains an Android-first Capacitor product whose canonical financial domain is React/TypeScript.

## Decision

Aura may use Harnex for **optional on-device import assistance** through a typed native Capacitor adapter and the published Harnex Consumer SDK.

Ownership is split deliberately:

- **Aura owns** spreadsheet reading/profiling, candidate generation, deterministic parsing/extraction, finance semantics, duplicate/history matching, category-set authority, user review and ledger commit.
- **Harnex owns** caller authorization, use-case/model/preset/runtime policy, Binder execution, scheduling, cancellation and runtime resource lifecycle.

Harnex may only select from Aura-generated schema candidates and supplied category IDs. It must not become an executable parser, create Aura categories, choose ledger rules or write transactions.

The initial Harnex use cases are:

- `aura-transaction-schema-inference`;
- `aura-transaction-category-classification`.

They are expected to be stateless for this workflow and JSON-schema constrained. Aura does not select a Harnex model; model/preset binding remains host-owned.

Aura release and debug Android packages are separate Harnex consumer identities and follow Harnex package/signer authorization. Browser execution remains a development/E2E harness and uses the manual mapping path rather than another AI provider.

There is **no cloud inference fallback**. Harnex missing/unreachable, authorization denial, model/use-case unavailability, invalid structured output or inference failure must preserve a manual import/review path.

Financial content crossing the Aura/Harnex Binder boundary is minimized to the feature contract. Source files and the complete ledger are not transferred. Normal Aura/Harnex logs remain content-free for these requests, and no prompt/output/provider/model metadata is added to canonical `Transaction`.

## Why this does not violate Aura's local-first invariant

The existing invariant prohibits silent cloud fallback and AI categorization without an explicit product/security decision. This ADR is that explicit decision for a narrowly scoped, on-device, user-reviewable import capability.

Canonical financial ownership does not move out of Aura: model output is advisory input to Aura validation/review, and the existing verified Aura commit path remains the only ledger writer.

## Alternatives Rejected

- **Require V1 templates only:** rejected because it preserves unnecessary user preprocessing and prevents direct use of many bank exports.
- **Remote LLM/API:** rejected because it adds network/provider credential, recipient/subprocessor, retention/transfer and availability boundaries that are unnecessary when Harnex can execute locally.
- **Embed a model/runtime directly in Aura:** rejected because it duplicates Harnex-owned model/JNI/runtime/resource governance and couples Aura releases to native inference internals.
- **Let the model parse the complete workbook directly:** rejected because it increases data exposure, cost/latency and silent-corruption risk; Aura can deterministically generate bounded candidates first.
- **Automatic model-authoritative commit:** rejected because imported financial data must remain reviewable and deterministic before canonical persistence.
- **Single generic Harnex use case:** rejected initially because schema understanding and category classification have different input/output semantics, evaluation criteria and future policy/resource needs.

## Consequences

- Aura gains a new local cross-application/native capability boundary and must implement explicit availability, authorization, lifecycle and recovery states.
- The import feature requires a privacy/data-flow record even though no remote processor or cloud transfer is introduced.
- Harnex policy/configuration must explicitly authorize Aura consumer identities and the two use cases before automatic assistance works.
- Consumer SDK/public Binder compatibility and two-APK integration evidence become relevant validation surfaces.
- V1 remains an important fast path and regression contract.
- Real-model quality is qualification evidence separate from deterministic CI; ambiguous files may intentionally fall back to manual mapping.
- Any future cloud fallback, persistent prompt/result storage, category-learning persistence, additional financial fields sent to Harnex, or model-authoritative financial action requires a successor decision/privacy review.
