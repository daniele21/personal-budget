#!/usr/bin/env python3
"""Validate Aura's repo-template-sw 0.9.2 E2E environment contract."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

FIDELITY = ["host_or_fake", "simulated_or_emulated", "representative_virtual", "representative_physical", "target_environment"]
RANK = {name: index for index, name in enumerate(FIDELITY)}
UI_MODES = ["assertions", "screenshots", "full_media"]
FULL_MEDIA_TRIGGERS = {
    "material_ui_integration_outcome",
    "motion_or_animation",
    "timing_or_progression",
    "navigation_or_transition_sequence",
    "lifecycle_visibility",
    "release_acceptance",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--template-mode", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    errors: list[str] = []
    warnings: list[str] = []

    try:
        data = json.loads((root / ".engineering" / "e2e.json").read_text(encoding="utf-8"))
        commands = json.loads((root / ".engineering" / "commands.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: invalid engineering JSON: {exc}")
        return 1

    if data.get("schema_version") != 1:
        errors.append("schema_version must be 1")
    if data.get("contract_version") != "0.2.1":
        errors.append("contract_version must be 0.2.1")

    applicability = data.get("applicability", {})
    status = applicability.get("status")
    if status not in {"required", "recommended", "n/a"}:
        errors.append("applicability.status invalid")
    if not str(applicability.get("reason", "")).strip():
        errors.append("applicability.reason required")
    command_status = ((commands.get("commands") or {}).get("e2e") or {}).get("status")
    if status == "required" and command_status != "required":
        errors.append("required E2E requires commands.e2e.status=required")

    principles = data.get("principles", {})
    for key in (
        "final_environment_should_confirm_not_discover",
        "execution_capability_separate_from_environment_fidelity",
        "lowest_sufficient_test_level",
        "critical_journeys_only",
        "built_artifact_when_material",
        "residual_fidelity_gaps_explicit",
        "ui_evidence_risk_based",
    ):
        if principles.get(key) is not True:
            errors.append(f"principles.{key} must be true")

    stage_policy = data.get("stage_policy", {})
    integration = stage_policy.get("integration", {})
    release = stage_policy.get("release", {})
    expected_integration = {
        "automated_e2e_before_shared_integration": True,
        "real_environment_blocking": False,
        "real_environment_deferred_to_release": True,
        "material_ui_journey_minimum_evidence_mode": "full_media",
        "incidental_ui_may_use_assertions": True,
    }
    expected_release = {
        "full_validation_required": True,
        "release_critical_e2e_required": True,
        "required_real_environment_blocking": True,
    }
    for key, value in expected_integration.items():
        if integration.get(key) != value:
            errors.append(f"stage_policy.integration.{key} must be {value!r}")
    for key, value in expected_release.items():
        if release.get(key) != value:
            errors.append(f"stage_policy.release.{key} must be {value!r}")

    ui = data.get("ui_evidence", {})
    if ui.get("modes") != UI_MODES:
        errors.append("ui_evidence.modes invalid")
    if ui.get("default_mode") not in UI_MODES:
        errors.append("ui_evidence.default_mode invalid")
    if ui.get("assertions_allowed_when_ui_incidental") is not True:
        errors.append("ui_evidence.assertions_allowed_when_ui_incidental must be true")
    missing_triggers = FULL_MEDIA_TRIGGERS - set(ui.get("full_media_triggers") or [])
    if missing_triggers:
        errors.append("ui_evidence.full_media_triggers missing: " + ", ".join(sorted(missing_triggers)))

    if data.get("fidelity_order") != FIDELITY:
        errors.append("fidelity_order must match canonical order")

    targets = {item.get("id"): item for item in data.get("target_environments", []) if isinstance(item, dict) and item.get("id")}
    environments = {item.get("id"): item for item in data.get("execution_environments", []) if isinstance(item, dict) and item.get("id")}
    journeys = {item.get("id"): item for item in data.get("critical_journeys", []) if isinstance(item, dict) and item.get("id")}
    if status in {"required", "recommended"} and (not targets or not environments or not journeys):
        errors.append("E2E-applicable repository must declare target environments, execution environments and critical journeys")

    automated = set()
    for env_id, environment in environments.items():
        fidelity = environment.get("fidelity_class")
        if fidelity not in RANK:
            errors.append(f"execution_environments.{env_id}.fidelity_class invalid")
        automation = environment.get("automation")
        if automation not in {"automated", "real_environment"}:
            errors.append(f"execution_environments.{env_id}.automation invalid")
        elif automation == "automated":
            automated.add(env_id)
        if not str(environment.get("platform", "")).strip() or not str(environment.get("artifact_surface", "")).strip():
            errors.append(f"execution_environments.{env_id} platform/artifact_surface required")
        for ref in environment.get("target_environment_refs") or []:
            if ref not in targets:
                errors.append(f"execution_environments.{env_id} unknown target {ref}")

    for journey_id, journey in journeys.items():
        if not str(journey.get("claim", "")).strip():
            errors.append(f"critical_journeys.{journey_id}.claim required")
        if not isinstance(journey.get("ui_surface"), bool):
            errors.append(f"critical_journeys.{journey_id}.ui_surface must be boolean")
        mode = journey.get("minimum_ui_evidence_mode")
        if journey.get("ui_surface") is True and mode not in UI_MODES:
            errors.append(f"critical_journeys.{journey_id}.minimum_ui_evidence_mode invalid")
        if journey.get("ui_surface") is False and mode not in {None, "assertions"}:
            errors.append(f"critical_journeys.{journey_id} non-UI evidence must be assertions/absent")
        refs = journey.get("automated_environment_refs") or []
        for ref in refs:
            if ref not in environments:
                errors.append(f"critical_journeys.{journey_id} unknown automated environment {ref}")
            elif ref not in automated:
                errors.append(f"critical_journeys.{journey_id} automated ref {ref} is not automated")
        minimum = journey.get("minimum_automated_fidelity")
        if minimum not in RANK:
            errors.append(f"critical_journeys.{journey_id}.minimum_automated_fidelity invalid")
        else:
            ranks = [RANK[environments[ref]["fidelity_class"]] for ref in refs if ref in environments and environments[ref].get("fidelity_class") in RANK]
            if ranks and max(ranks) < RANK[minimum]:
                errors.append(f"critical_journeys.{journey_id} automated fidelity below {minimum}")
        confirmation = journey.get("real_environment_confirmation")
        if confirmation not in {"required", "conditional", "not_required"}:
            errors.append(f"critical_journeys.{journey_id}.real_environment_confirmation invalid")
        residual = journey.get("residual_gaps")
        if not isinstance(residual, list):
            errors.append(f"critical_journeys.{journey_id}.residual_gaps must be a list")
        if confirmation == "not_required" and residual:
            warnings.append(f"critical_journeys.{journey_id} has residual gaps but real_environment_confirmation=not_required")

    print("E2E environment fidelity contract check")
    print(f"root: {root}")
    print(f"applicability: {status}")
    for warning in warnings:
        print(f"WARN: {warning}")
    for error in errors:
        print(f"FAIL: {error}")
    if errors:
        print(f"RESULT: FAIL ({len(errors)} error(s), {len(warnings)} warning(s))")
        return 1
    print(f"RESULT: PASS ({len(warnings)} warning(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
