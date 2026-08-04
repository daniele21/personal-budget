# ADR 0006: Aura Android-Only Product Distribution

- Status: Accepted
- Date: 2026-08-04
- Amends: ADR 0002

## Context

ADR 0002 introduced Android as a Capacitor companion while retaining the PWA.
The product owner has since chosen to make Android the only application
distribution. Aura still needs public privacy, support and account-deletion
surfaces, and the Android package still depends on the React/Vite application
as bundled WebView assets.

Removing the web runtime would therefore be a full product rewrite, while
removing public PWA distribution is a bounded release and hosting change.

## Decision

Aura is distributed as an Android application. React/Vite remains the canonical
UI and financial-domain runtime, is built into Capacitor through `webDir: dist`,
and remains executable in a browser only as a development and E2E harness.

Production Android builds:

- package local bundled assets;
- never use a remote `server.url`;
- do not register a service worker or expose PWA installation actions;
- use typed native adapters for operating-system capabilities.

`aura.staituned.com` becomes a minimal public portal limited to landing,
privacy, support and account deletion. It is not the authenticated Aura
financial application.

The full hosted webapp is retired only after the public portal, external account
deletion, Android first-run, backup restore and rollback paths are verified.
Useful browser tests are retained as regression tests of the bundled React
runtime; tests that exist only for PWA installation or service-worker lifecycle
are removed.

## Alternatives Rejected

- Keep dual PWA and Android distribution: rejected because the owner no longer
  wants to operate two product channels.
- Rewrite Aura in Kotlin: rejected because it duplicates the UI, domain,
  storage, accessibility and recovery implementation without product benefit.
- Remote-host the Android WebView: rejected because it weakens offline behavior,
  release integrity, bridge isolation and Play traceability.
- Remove all public web surfaces: rejected because privacy, support and account
  deletion must remain reachable outside an installed app.

## Consequences

- The PWA install prompt, manifest, service worker and browser-notification
  delivery are removed from the product.
- Retained reminders require an Android local-notification adapter before the
  browser path is removed.
- Existing PWA users need a documented export/backup and cutover path.
- ADR 0002 remains authoritative for the Capacitor runtime and native bridge,
  except for its decision to retain PWA distribution.
- Release trackers and historical feature specs must distinguish browser test
  coverage from supported public web distribution.

