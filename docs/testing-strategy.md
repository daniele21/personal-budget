# Testing Strategy

## Purpose

Aura Finance handles personal financial data locally. Changes to transactions, reports, budgets, recurring entries, import/export, backup, or privacy-sensitive metadata can silently corrupt user trust if they are only checked manually.

This document defines the minimum automated test structure for meaningful changes.

## Test Layers

### Domain Tests

Use for pure financial rules and data transforms.

Examples:

- transaction totals
- analytics lenses
- budget calculations
- recurring generation and reconciliation
- category reference changes
- import classification helpers

Command:

```sh
npm run test
```

### Data Model Tests

Use for local-first persistence behavior.

Required when adding or changing persisted fields:

- legacy data without the field
- restored backup data
- generated demo data
- recurring transaction sync
- field normalization and defaulting

Command:

```sh
npm run test
```

### React Component Tests

Use for user-facing flows where the UI is the contract.

Required for major changes to:

- transaction create/edit flows
- quick edit flows
- history rows and batch actions
- reports and analytics lenses
- budget summaries
- import/export UX

Command:

```sh
npm run test:react
```

## Regression Gate For Large Changes

Run the full regression gate before considering a major change complete:

```sh
npm run test:regression
```

This runs:

- TypeScript check
- all Vitest tests
- production build

## Extra Transaction Analytics Coverage

The extra transaction feature has regression coverage for:

- manual transactions saving `reportingClass` and `reportingNote`
- recurring-linked transactions not exposing or saving extra metadata
- history extra badges
- Insights `Actual`, `Net of extras`, and `Extras` lenses
- Budgets defaulting to actual spend while showing net-of-extras context
- domain-level analytics lens totals
- data-model normalization that strips stale extra markers from recurring transactions

## When To Add More Tests

Add or update tests when a change affects:

- persisted data shape
- report calculations
- budget calculations
- recurring generation
- import/export fields
- backup or restore behavior
- privacy-sensitive metadata
- user-visible financial totals

Manual QA is acceptable only as a supplement. It should not replace automated regression coverage for financial calculations or data model behavior.

