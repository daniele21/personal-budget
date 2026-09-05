#!/usr/bin/env python3
"""Select Aura validation from delivery stage and changed paths."""
from __future__ import annotations

import argparse
import subprocess

STAGES = ("iteration", "integration", "release")


def args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-ref", required=True)
    parser.add_argument("--head-ref", default="HEAD")
    parser.add_argument("--stage", choices=STAGES, default="integration")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def changed(base: str, head: str) -> list[str]:
    proc = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...{head}"],
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(f"unable to resolve validation scope: {proc.stderr.strip()}")
    return [line.strip() for line in proc.stdout.splitlines() if line.strip()]


def classify(paths: list[str], stage: str) -> tuple[str, str, list[str], list[str]]:
    if stage == "release":
        return (
            "full",
            "release stage requires reference-grade validation",
            ["release"],
            ["repository-health", "web-validation", "browser-e2e", "android-emulator", "real-environment"],
        )

    if not paths:
        return "lean", "no changed paths", [], ["repository-health"]

    full_exact = {
        "package.json",
        "package-lock.json",
        ".engineering/commands.json",
        ".engineering/e2e.json",
        "scripts/select_validation_profile.py",
    }
    full_prefix = (".github/workflows/",)
    product_prefix = (
        "android/",
        "src/domain/",
        "src/data/",
        "src/context/",
        "src/hooks/",
        "src/pages/",
        "src/components/",
        "src/platform/",
        "tests/e2e/",
        "design/",
        "docs/04-privacy-gdpr/",
        "docs/01-architecture/",
        "adr/",
    )
    strong_exact = {
        "capacitor.config.ts",
        "firebase.json",
        "firestore.rules",
        "vite.config.ts",
        "vite.android-runtime.ts",
        "playwright.config.ts",
    }
    scoped_prefix = ("src/", "tests/", "scripts/")
    lean_prefix = ("docs/", "skills/", "brand-kit/", ".engineering/", ".github/")
    lean_suffix = (".md", ".png", ".jpg", ".jpeg", ".svg")

    if any(path in full_exact or path.startswith(full_prefix) for path in paths):
        profile = "full"
        reason = "validation/build selector or workflow/package contract changed"
        risks = ["global-validation"]
        gates = ["repository-health", "web-validation", "browser-e2e", "android-emulator"]
    elif any(path in strong_exact or path.startswith(product_prefix) for path in paths):
        profile = "strong"
        reason = "product/native/data/privacy/UI boundary changed"
        risks = ["product-or-platform"]
        gates = ["repository-health", "web-validation", "browser-e2e", "android-emulator"]
    elif any(path.startswith(scoped_prefix) for path in paths):
        profile = "scoped"
        reason = "contained executable source/test/script change"
        risks = ["scoped-executable"]
        gates = ["repository-health", "web-validation"]
    elif all(
        path.startswith(lean_prefix)
        or path.endswith(lean_suffix)
        or path in {"AGENTS.md", "CONTRIBUTING.md", "SECURITY.md", ".editorconfig", ".gitignore"}
        for path in paths
    ):
        profile = "lean"
        reason = "documentation/governance/brand-only change"
        risks = ["governance-only"]
        gates = ["repository-health"]
    else:
        profile = "full"
        reason = "unknown or global executable path; fail-safe validation"
        risks = ["unknown-scope"]
        gates = ["repository-health", "web-validation", "browser-e2e", "android-emulator"]

    if stage == "iteration" and profile == "full":
        reason += "; profile reports risk but iteration should still execute only the cheapest useful falsifier"
    return profile, reason, risks, gates


def self_test() -> int:
    cases = [
        (["docs/README.md"], "integration", "lean"),
        (["src/pages/Home.tsx"], "integration", "strong"),
        (["android/app/build.gradle"], "integration", "strong"),
        (["package.json"], "integration", "full"),
        (["docs/README.md"], "release", "full"),
    ]
    for paths, stage, expected in cases:
        actual = classify(paths, stage)[0]
        if actual != expected:
            raise SystemExit(f"self-test failed: {paths} {stage}: {actual} != {expected}")
    print("selector self-test: PASS")
    return 0


def main() -> int:
    parsed = args()
    if parsed.self_test:
        return self_test()
    paths = changed(parsed.base_ref, parsed.head_ref)
    profile, reason, risks, gates = classify(paths, parsed.stage)
    print(f"stage={parsed.stage}")
    print(f"profile={profile}")
    print(f"reason={reason}")
    print("risk_dimensions=" + ",".join(risks))
    print("required_gates=" + ",".join(gates))
    print("paths=" + ",".join(paths))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
