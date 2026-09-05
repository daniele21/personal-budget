---
name: structured-change
description: Guard meaningful Aura changes against duplicated ownership, unsafe data/resource lifecycle, weak UX hierarchy, contract drift and incomplete failure handling.
---

# Structured Change

Before meaningful behavior, architecture, persistence, security, build/runtime or UI edits:

1. Find the canonical owner and inspect direct consumers/tests before editing a shared boundary.
2. Resolve material product/contract ambiguity from repository evidence; do not silently guess security, persistence, migration or user-visible semantics.
3. Prefer the smallest solution and established dependencies/components over speculative machinery.
4. Read `.engineering/commands.json`; preserve native npm/Playwright/Gradle/Capacitor commands and their build/runtime/cleanup semantics.
5. For `product-ui`, read `design/ux-contract.json` and `design/brand-kit.json`; structural/interaction changes use `design-product-experience` first.
6. Define owner, lifetime, bounds, cancellation and cleanup for processes, listeners, storage, workers, test state and temporary artifacts.
7. Treat invalid input, dependency failure, timeout, cancellation, shutdown, restart/recovery and partial persistence as normal paths.
8. Preserve Aura's local-first, encrypted-backup, review-gated payment-candidate and credential-isolation contracts.
9. Update affected adapters/consumers/tests and durable documentation together.

Before publication verify one source of truth, bounded resources, coherent recovery, privacy-safe evidence, design-system reuse and the narrowest sufficient validation profile.
