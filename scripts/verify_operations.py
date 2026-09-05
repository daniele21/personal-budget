#!/usr/bin/env python3
"""Validate Aura's repo-template-sw 0.9.2 operating contract."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

COMMANDS = ("setup", "doctor", "dev", "check", "test", "e2e", "build", "smoke", "package", "stop", "clean")
STATUSES = {"required", "recommended", "optional", "n/a"}
REQUIRED_NON_NA = {"setup", "check", "test", "build", "clean"}


def expect(section: dict, key: str, value: object, errors: list[str], prefix: str) -> None:
    if section.get(key) != value:
        errors.append(f"{prefix}.{key} must be {value!r}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--template-mode", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    errors: list[str] = []

    try:
        data = json.loads((root / ".engineering" / "commands.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: invalid .engineering/commands.json: {exc}")
        return 1

    expect(data, "schema_version", 1, errors, "commands")
    expect(data, "contract_version", "0.6.1", errors, "commands")

    commands = data.get("commands", {})
    if not isinstance(commands, dict):
        errors.append("commands must be an object")
        commands = {}
    for name in COMMANDS:
        entry = commands.get(name)
        if not isinstance(entry, dict):
            errors.append(f"commands.{name} missing")
            continue
        status = entry.get("status")
        if status not in STATUSES:
            errors.append(f"commands.{name}.status invalid")
        if name in REQUIRED_NON_NA and status == "n/a":
            errors.append(f"commands.{name} may not be n/a")
        if status != "n/a" and not str(entry.get("run", "")).strip():
            errors.append(f"commands.{name}.run required")

    velocity = data.get("development_velocity", {})
    expect(velocity, "default_stage", "iteration", errors, "development_velocity")
    expect(velocity, "stages", ["iteration", "integration", "release"], errors, "development_velocity")
    iteration = velocity.get("iteration", {})
    integration = velocity.get("integration", {})
    release = velocity.get("release", {})
    for key in ("exact_head_required", "full_diff_review_required", "durable_documentation_current_required", "remote_preflight_required"):
        expect(iteration, key, False, errors, "development_velocity.iteration")
    expect(iteration, "e2e_default", "risk_only", errors, "development_velocity.iteration")
    for key in ("exact_head_required", "full_diff_review_required", "durable_documentation_current_required", "remote_preflight_when_required_gates_unavailable_local", "automated_e2e_required_when_affected", "real_environment_deferred_to_release"):
        expect(integration, key, True, errors, "development_velocity.integration")
    expect(integration, "real_environment_blocking", False, errors, "development_velocity.integration")
    expect(integration, "e2e_default", "affected_critical_journeys", errors, "development_velocity.integration")
    for key in ("exact_head_required", "full_diff_review_required", "durable_documentation_current_required", "full_validation_required", "required_real_environment_blocking"):
        expect(release, key, True, errors, "development_velocity.release")
    expect(release, "e2e_default", "release_critical_journeys", errors, "development_velocity.release")
    expect(velocity, "parallel_development_prefers_early_convergence", True, errors, "development_velocity")
    expect(velocity, "stacked_publication_exception_only", True, errors, "development_velocity")

    publication = data.get("publication_gate", {})
    expect(publication, "applies_from_stage", "integration", errors, "publication_gate")
    for key in (
        "agent_preflight_required", "target_base_freshness_required", "full_diff_review_required",
        "material_ambiguity_must_be_resolved", "failure_root_cause_required",
        "execution_capability_classification_required", "blast_radius_profile_selection_required",
        "automatable_gates_must_not_be_delegated_to_user", "remote_automated_fallback_required_when_agent_local_unavailable",
        "deterministic_ci_command_parity_required", "non_automated_evidence_must_be_declared", "exact_head_evidence_required",
    ):
        expect(publication, key, True, errors, "publication_gate")

    execution = data.get("validation_execution", {})
    if not {"agent_local", "remote_automated", "real_environment"}.issubset(set(execution.get("classes") or [])):
        errors.append("validation_execution.classes incomplete")
    expect(execution, "no_human_runner_for_automatable_gates", True, errors, "validation_execution")
    expect(execution, "remote_automation_required_when_agent_local_unavailable", True, errors, "validation_execution")

    profiles = data.get("validation_profiles", {})
    expect(profiles, "default", "auto", errors, "validation_profiles")
    if not {"lean", "scoped", "strong", "full"}.issubset(set(profiles.get("profiles") or [])):
        errors.append("validation_profiles.profiles incomplete")
    expect(profiles, "selector_output", "risk_dimensions_and_required_gates", errors, "validation_profiles")
    for key in (
        "profiles_are_shorthand", "gate_selection_preferred_over_suite_selection", "unknown_executable_paths_fail_safe",
        "selector_changes_force_full", "promotion_validation_full", "automatic_escalation_allowed",
        "silent_downgrade_below_auto_forbidden", "report_selected_profile_and_reason",
    ):
        expect(profiles, key, True, errors, "validation_profiles")
    if not str(profiles.get("selector", "")).strip():
        errors.append("validation_profiles.selector required")

    remote = data.get("remote_preflight", {})
    if remote.get("status") not in {"required", "recommended", "n/a"}:
        errors.append("remote_preflight.status invalid")
    if remote.get("status") != "n/a":
        if not str(remote.get("trigger", "")).strip():
            errors.append("remote_preflight.trigger required")
        for key in (
            "stronger_profile_override_allowed", "weaker_profile_override_requires_explicit_justification", "exact_head_required",
            "reuse_successful_equivalent_evidence", "rerun_only_when_missing_stale_or_insufficient", "trusted_requesters_only",
            "same_repository_prs_only_by_default", "report_result_to_pr",
        ):
            expect(remote, key, True, errors, "remote_preflight")
        if remote.get("execution_job_write_credentials") is not False:
            errors.append("remote_preflight.execution_job_write_credentials must be false")
        if not {"head", "target_base", "required_gates", "profile", "e2e_environment"}.issubset(set(remote.get("evidence_identity_fields") or [])):
            errors.append("remote_preflight.evidence_identity_fields incomplete")

    e2e = data.get("end_to_end", {})
    for key in (
        "recommended_when_full_workflow_boundary_exists", "critical_journeys_prioritized", "lower_level_tests_remain_primary",
        "use_stack_native_tooling", "run_against_built_artifact_when_material", "failure_evidence_bounded", "zero_residue_required",
        "incidental_ui_does_not_force_full_media", "full_media_for_motion_timing_sequence_or_release_claims",
    ):
        expect(e2e, key, True, errors, "end_to_end")
    expect(e2e, "ui_evidence_modes", ["assertions", "screenshots", "full_media"], errors, "end_to_end")
    expect(e2e, "ui_evidence_selection", "risk_based", errors, "end_to_end")

    economics = data.get("validation_economics", {})
    expect(economics, "optimize_for", "sufficient-confidence-per-feedback-time", errors, "validation_economics")
    if not {"duration", "flake_rate", "unique_regression_signal", "overlap"}.issubset(set(economics.get("dimensions") or [])):
        errors.append("validation_economics.dimensions incomplete")
    expect(economics, "periodic_review", True, errors, "validation_economics")

    print("Project operating contract check")
    print(f"root: {root}")
    for error in errors:
        print(f"FAIL: {error}")
    if errors:
        print(f"RESULT: FAIL ({len(errors)} error(s))")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
