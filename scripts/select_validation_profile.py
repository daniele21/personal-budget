#!/usr/bin/env python3
"""Select Aura preflight depth from changed paths; unknown executable scope fails safe FULL."""
from __future__ import annotations
import argparse
import subprocess


def args():
    p = argparse.ArgumentParser()
    p.add_argument("--base-ref", required=True)
    p.add_argument("--head-ref", default="HEAD")
    return p.parse_args()


def changed(base: str, head: str) -> list[str]:
    proc = subprocess.run(["git", "diff", "--name-only", f"{base}...{head}"], text=True, capture_output=True)
    if proc.returncode != 0:
        raise SystemExit(f"unable to resolve validation scope: {proc.stderr.strip()}")
    return [line.strip() for line in proc.stdout.splitlines() if line.strip()]


def classify(paths: list[str]) -> tuple[str, str]:
    if not paths:
        return "lean", "no changed paths"
    full_exact = {"package.json", "package-lock.json", ".engineering/commands.json", "scripts/select_validation_profile.py"}
    full_prefix = (".github/workflows/",)
    strong_prefix = ("android/", "src/platform/", "src/data/", "docs/04-privacy-gdpr/", "docs/01-architecture/", "adr/", "design/")
    strong_exact = {"capacitor.config.ts", "firebase.json", "firestore.rules", "vite.config.ts", "vite.android-runtime.ts"}
    scoped_prefix = ("src/", "tests/", "scripts/")
    lean_prefix = ("docs/", "skills/", "brand-kit/", ".engineering/", ".github/")
    lean_suffix = (".md", ".png", ".jpg", ".jpeg", ".svg")
    if any(p in full_exact or p.startswith(full_prefix) for p in paths):
        return "full", "validation/build selector or workflow/package contract changed"
    if any(p in strong_exact or p.startswith(strong_prefix) for p in paths):
        return "strong", "native/platform/data/security/architecture/product-experience boundary changed"
    if any(p.startswith(scoped_prefix) for p in paths):
        return "scoped", "contained executable source/test/script change"
    if all(p.startswith(lean_prefix) or p.endswith(lean_suffix) or p in {"AGENTS.md", "CONTRIBUTING.md", "SECURITY.md", ".editorconfig", ".gitignore"} for p in paths):
        return "lean", "documentation/governance/brand-only change"
    return "full", "unknown or global executable path; fail-safe validation"


def main() -> int:
    a = args(); paths = changed(a.base_ref, a.head_ref); profile, reason = classify(paths)
    print(f"profile={profile}")
    print(f"reason={reason}")
    print("paths=" + ",".join(paths))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
