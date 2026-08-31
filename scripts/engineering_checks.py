#!/usr/bin/env python3
"""Zero-dependency repo-template-sw 0.8.0 contract checks specialized for Aura."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

CORE_SKILLS = (
    "plan-workstream", "structured-change", "design-product-experience", "validate-change",
    "preflight-change", "remote-preflight", "finalize-workstream", "review-reference-quality",
)
FIDELITY = ["host_or_fake", "simulated_or_emulated", "representative_virtual", "representative_physical", "target_environment"]
PLACEHOLDERS = ("<REPLACE_WITH_", "<PROJECT_NAME>", "<DESCRIBE_", "<LIST_")


def load(path: Path, errors: list[str]) -> dict:
    if not path.is_file():
        errors.append(f"missing required file: {path}")
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"invalid JSON {path}: {exc}")
        return {}
    if not isinstance(data, dict):
        errors.append(f"expected object in {path}")
        return {}
    return data


def emit(title: str, errors: list[str], warnings: list[str] | None = None) -> int:
    warnings = warnings or []
    print(title)
    for item in warnings:
        print(f"WARN: {item}")
    for item in errors:
        print(f"FAIL: {item}")
    if errors:
        print(f"RESULT: FAIL ({len(errors)} error(s), {len(warnings)} warning(s))")
        return 1
    print(f"RESULT: PASS ({len(warnings)} warning(s))")
    return 0


def no_placeholders(value: object) -> bool:
    if isinstance(value, str):
        return not any(marker in value for marker in PLACEHOLDERS)
    if isinstance(value, list):
        return all(no_placeholders(v) for v in value)
    if isinstance(value, dict):
        return all(no_placeholders(v) for v in value.values())
    return True


def verify_repository(root: Path) -> int:
    required = (
        "README.md", "AGENTS.md", "CONTRIBUTING.md", "SECURITY.md", ".editorconfig", ".gitignore",
        ".engineering/baseline.json", ".engineering/documentation-policy.json", ".engineering/commands.json", ".engineering/e2e.json",
        ".github/pull_request_template.md", ".github/workflows/repository-health.yml", "docs/README.md", "docs/architecture.md",
        "docs/current-state.md", "docs/features/README.md", "docs/adr/README.md", "docs/workstreams/README.md",
        "scripts/verify_operations.py", "scripts/verify_e2e.py", "scripts/verify_product_experience.py",
    )
    errors: list[str] = []
    warnings: list[str] = []
    for rel in required:
        if not (root / rel).is_file(): errors.append(f"missing required file: {rel}")
    for name in CORE_SKILLS:
        if not (root / "skills" / name / "SKILL.md").is_file(): errors.append(f"missing core skill: skills/{name}/SKILL.md")
    baseline = load(root / ".engineering/baseline.json", errors)
    if baseline:
        if baseline.get("schema_version") != 1: errors.append("baseline schema_version must be 1")
        standard = baseline.get("standard", {})
        if standard.get("source") != "daniele21/repo-template-sw": errors.append("baseline standard.source mismatch")
        if standard.get("version") != "0.8.0": errors.append("baseline standard.version must be 0.8.0")
        if baseline.get("target_level") not in {"L0", "L1", "L2"}: errors.append("target_level must be L0/L1/L2")
        profiles = baseline.get("profiles")
        if not isinstance(profiles, list): errors.append("baseline profiles must be a list")
        skills = baseline.get("skills", {})
        for name in CORE_SKILLS:
            entry = skills.get(name) if isinstance(skills, dict) else None
            if not isinstance(entry, dict) or not entry.get("source_version") or not isinstance(entry.get("customized"), bool):
                errors.append(f"invalid baseline skill metadata: {name}")
    for rel in ("README.md", "AGENTS.md", "SECURITY.md", "docs/architecture.md"):
        path = root / rel
        if path.is_file() and not no_placeholders(path.read_text(encoding="utf-8")): errors.append(f"unresolved adopter placeholder in {rel}")
    if not any((root / n).is_file() for n in ("LICENSE", "LICENSE.md", "LICENSE.txt")):
        warnings.append("no explicit project license detected")
    return emit("Repository baseline check", errors, warnings)


def verify_operations(root: Path) -> int:
    errors: list[str] = []
    data = load(root / ".engineering/commands.json", errors)
    if not data: return emit("Project operating contract check", errors)
    if data.get("schema_version") != 1: errors.append("schema_version must be 1")
    if data.get("contract_version") != "0.5.0": errors.append("contract_version must be 0.5.0")
    commands = data.get("commands", {})
    names = ("setup", "doctor", "dev", "check", "test", "e2e", "build", "smoke", "package", "stop", "clean")
    statuses = {"required", "recommended", "optional", "n/a"}
    for name in names:
        entry = commands.get(name) if isinstance(commands, dict) else None
        if not isinstance(entry, dict): errors.append(f"missing command intent: {name}"); continue
        if entry.get("status") not in statuses: errors.append(f"invalid status for {name}")
        if name in {"setup", "check", "test", "build", "clean"} and entry.get("status") == "n/a": errors.append(f"{name} may not be n/a")
        if entry.get("status") != "n/a" and not str(entry.get("run", "")).strip(): errors.append(f"missing run command for {name}")
        if not no_placeholders(entry): errors.append(f"unresolved command placeholder: {name}")
    required_true = {
        "publication_gate": ("agent_preflight_required", "target_base_freshness_required", "full_diff_review_required", "material_ambiguity_must_be_resolved", "failure_root_cause_required", "execution_capability_classification_required", "blast_radius_profile_selection_required", "automatable_gates_must_not_be_delegated_to_user", "remote_automated_fallback_required_when_agent_local_unavailable", "deterministic_ci_command_parity_required", "non_automated_evidence_must_be_declared", "exact_head_evidence_required"),
        "end_to_end": ("recommended_when_full_workflow_boundary_exists", "critical_journeys_prioritized", "lower_level_tests_remain_primary", "use_stack_native_tooling", "run_against_built_artifact_when_material", "failure_evidence_bounded", "zero_residue_required"),
        "ephemeral_resources": ("run_identity", "isolated_workspace", "stale_resource_recovery", "ownership_required_before_cleanup", "post_cleanup_verification"),
    }
    for section, keys in required_true.items():
        obj = data.get(section, {})
        for key in keys:
            if not isinstance(obj, dict) or obj.get(key) is not True: errors.append(f"{section}.{key} must be true")
    execution = data.get("validation_execution", {})
    if set(execution.get("classes", [])) < {"agent_local", "remote_automated", "real_environment"}: errors.append("validation_execution.classes incomplete")
    for key in ("no_human_runner_for_automatable_gates", "remote_automation_required_when_agent_local_unavailable"):
        if execution.get(key) is not True: errors.append(f"validation_execution.{key} must be true")
    profiles = data.get("validation_profiles", {})
    if profiles.get("default") != "auto" or set(profiles.get("profiles", [])) < {"lean", "scoped", "strong", "full"}: errors.append("validation profiles must include auto lean/scoped/strong/full")
    if not str(profiles.get("selector", "")).strip() or not no_placeholders(profiles.get("selector")): errors.append("validation profile selector missing/unresolved")
    remote = data.get("remote_preflight", {})
    if remote.get("status") not in {"required", "recommended", "n/a"}: errors.append("invalid remote_preflight.status")
    if remote.get("status") != "n/a" and not str(remote.get("trigger", "")).strip(): errors.append("remote preflight trigger required")
    if remote.get("execution_job_write_credentials") is not False: errors.append("remote preflight execution job must not have write credentials")
    identity = data.get("build_identity", {})
    for key in ("unique_per_build", "source_revision_required", "dirty_state_required"):
        if identity.get(key) is not True: errors.append(f"build_identity.{key} must be true")
    if set(identity.get("lineage_fields", [])) < {"project", "platform", "architecture", "channel", "variant"}: errors.append("build identity lineage fields incomplete")
    if set(identity.get("artifact_name_fields", [])) < {"product", "product_version", "build_id", "source_revision"}: errors.append("artifact name fields incomplete")
    artifacts = data.get("artifact_lifecycle", {})
    for key in ("immutable_successful_artifacts", "promote_only_after_success", "manifest_required", "release_artifacts_immutable"):
        if artifacts.get(key) is not True: errors.append(f"artifact_lifecycle.{key} must be true")
    if str(artifacts.get("checksum_algorithm", "")).lower() != "sha256": errors.append("artifact checksum must be sha256")
    delta = data.get("build_delta", {})
    if delta.get("required") is not True or delta.get("bundle_with_artifact") is not True or delta.get("compare_to") != "previous-successful-comparable-build": errors.append("build delta contract incomplete")
    runtime = data.get("local_runtime", {})
    if runtime.get("applicable") is True:
        if runtime.get("bind_default") != "loopback" or runtime.get("port_strategy") != "configurable-with-collision-check": errors.append("local runtime must default to loopback/collision-aware ports")
        for key in ("foreground_default", "readiness_required", "graceful_shutdown_required", "verify_no_project_listener_after_stop"):
            if runtime.get(key) is not True: errors.append(f"local_runtime.{key} must be true")
    cleanup = set(data.get("ephemeral_resources", {}).get("cleanup_paths", []))
    if cleanup < {"success", "failure", "timeout", "cancellation", "interrupt", "partial-initialization"}: errors.append("ephemeral cleanup paths incomplete")
    return emit("Project operating contract check", errors)


def verify_e2e(root: Path) -> int:
    errors: list[str] = []
    data = load(root / ".engineering/e2e.json", errors)
    commands = load(root / ".engineering/commands.json", errors)
    if not data: return emit("E2E environment fidelity contract check", errors)
    if data.get("schema_version") != 1 or data.get("contract_version") != "0.1.0": errors.append("invalid E2E schema/contract version")
    app = data.get("applicability", {})
    status = app.get("status")
    if status not in {"required", "recommended", "n/a"} or not str(app.get("reason", "")).strip(): errors.append("invalid E2E applicability")
    cmd_status = commands.get("commands", {}).get("e2e", {}).get("status") if commands else None
    if status == "required" and cmd_status != "required": errors.append("required E2E requires commands.e2e required")
    principles = data.get("principles", {})
    for key in ("final_environment_should_confirm_not_discover", "execution_capability_separate_from_environment_fidelity", "lowest_sufficient_test_level", "critical_journeys_only", "built_artifact_when_material", "residual_fidelity_gaps_explicit"):
        if principles.get(key) is not True: errors.append(f"principles.{key} must be true")
    if data.get("fidelity_order") != FIDELITY: errors.append("canonical fidelity order mismatch")
    targets = {x.get("id"): x for x in data.get("target_environments", []) if isinstance(x, dict) and x.get("id")}
    envs = {x.get("id"): x for x in data.get("execution_environments", []) if isinstance(x, dict) and x.get("id")}
    journeys = data.get("critical_journeys", [])
    if status != "n/a" and (not targets or not envs or not journeys): errors.append("E2E-applicable repo needs targets, execution environments and journeys")
    for eid, env in envs.items():
        if env.get("fidelity_class") not in set(FIDELITY): errors.append(f"invalid fidelity: {eid}")
        if env.get("automation") not in {"automated", "real_environment"}: errors.append(f"invalid automation: {eid}")
        if not str(env.get("platform", "")).strip() or not str(env.get("artifact_surface", "")).strip(): errors.append(f"incomplete environment: {eid}")
        for ref in env.get("target_environment_refs", []):
            if ref not in targets: errors.append(f"unknown target ref {ref} in {eid}")
    for journey in journeys:
        if not isinstance(journey, dict) or not journey.get("id") or not str(journey.get("claim", "")).strip(): errors.append("invalid critical journey"); continue
        refs = journey.get("automated_environment_refs", [])
        for ref in refs:
            if ref not in envs or envs[ref].get("automation") != "automated": errors.append(f"invalid automated ref {ref} in {journey.get('id')}")
        if journey.get("minimum_automated_fidelity") not in set(FIDELITY): errors.append(f"invalid minimum fidelity in {journey.get('id')}")
        if journey.get("real_environment_confirmation") not in {"required", "conditional", "not_required"}: errors.append(f"invalid real confirmation in {journey.get('id')}")
        if not isinstance(journey.get("residual_gaps"), list): errors.append(f"residual_gaps must be list in {journey.get('id')}")
        if not refs and not str(journey.get("automation_gap_reason", "")).strip(): errors.append(f"missing automation gap reason in {journey.get('id')}")
    if not no_placeholders(data): errors.append("unresolved E2E placeholder")
    return emit("E2E environment fidelity contract check", errors)


def verify_product_experience(root: Path) -> int:
    errors: list[str] = []
    baseline = load(root / ".engineering/baseline.json", errors)
    if "product-ui" not in baseline.get("profiles", []): return emit("Product experience contract check (not applicable)", errors)
    ux = load(root / "design/ux-contract.json", errors); brand = load(root / "design/brand-kit.json", errors)
    if ux:
        if ux.get("schema_version") != 1 or ux.get("applicable") is not True: errors.append("invalid UX schema/applicability")
        for key in ("design_source_of_truth", "experience_context", "decision_model", "principles", "accessibility", "design_system", "motion", "graphics", "evidence"):
            if not isinstance(ux.get(key), dict): errors.append(f"ux-contract.{key} must be object")
        if not set(ux.get("critical_states", [])) >= {"loading", "empty", "error", "disabled"}: errors.append("UX critical states incomplete")
        if not ux.get("critical_journeys"): errors.append("UX critical journeys required")
        for section in (ux.get("decision_model", {}), ux.get("principles", {}), ux.get("evidence", {})):
            if any(v is not True for v in section.values() if isinstance(v, bool)): errors.append("UX required boolean contract contains false value")
    if brand:
        if brand.get("schema_version") != 1 or not brand.get("product_name"): errors.append("invalid brand schema/product name")
        for key in ("logo_primary", "logo_compact", "logo_monochrome", "app_icon", "favicon"):
            if not str(brand.get("assets", {}).get(key, "")).strip(): errors.append(f"missing brand asset mapping: {key}")
        colors = brand.get("tokens", {}).get("colors", {})
        if set(colors) < {"surface", "surface_elevated", "text_primary", "text_secondary", "primary", "success", "warning", "error", "border", "focus"}: errors.append("brand semantic colors incomplete")
        motion = brand.get("motion_tokens", {})
        if set(motion.get("durations", {})) < {"instant", "fast", "standard", "large"}: errors.append("motion duration tokens incomplete")
        if set(motion.get("easing", {})) < {"enter", "exit", "move"}: errors.append("motion easing tokens incomplete")
        if set(motion.get("spring", {})) < {"default", "bounce"}: errors.append("motion spring tokens incomplete")
    if not no_placeholders(ux) or not no_placeholders(brand): errors.append("unresolved product-experience placeholder")
    return emit("Product experience contract check", errors)


def verify_docs(root: Path) -> int:
    errors: list[str] = []
    policy = load(root / ".engineering/documentation-policy.json", errors)
    if not policy: return emit("Documentation health", errors)
    chars = int(policy.get("estimated_token_characters", 4)); budgets = policy.get("budgets", {})
    def check(path: Path, key: str) -> None:
        if not path.is_file() or key not in budgets: return
        text = path.read_text(encoding="utf-8"); lines = len(text.splitlines()); tokens = math.ceil(len(text) / chars); budget = budgets[key]
        if lines > budget["max_lines"]: errors.append(f"{path.relative_to(root)} lines {lines}>{budget['max_lines']}")
        if tokens > budget["max_estimated_tokens"]: errors.append(f"{path.relative_to(root)} tokens ~{tokens}>{budget['max_estimated_tokens']}")
    check(root / "AGENTS.md", "root_agents"); check(root / "docs/current-state.md", "current_state"); check(root / "docs/architecture.md", "architecture")
    for path in root.rglob("AGENTS.md"):
        if path != root / "AGENTS.md" and ".git" not in path.parts: check(path, "scoped_agents")
    for path in (root / "docs/features").glob("*.md") if (root / "docs/features").is_dir() else []:
        if path.name != "README.md": check(path, "feature_doc")
    markers = [m.lower() for m in policy.get("completed_workstream_markers", [])]
    for path in (root / "docs/workstreams").glob("*.md") if (root / "docs/workstreams").is_dir() else []:
        if path.name == "README.md" or path.name.startswith("_"): continue
        check(path, "active_workstream"); text = path.read_text(encoding="utf-8").lower()
        if any(m in text for m in markers): errors.append(f"completed workstream retained as active: {path.relative_to(root)}")
    return emit("Documentation health", errors)


def verify_agent_context(root: Path) -> int:
    errors: list[str] = []
    policy = load(root / ".engineering/documentation-policy.json", errors)
    if not policy: return emit("Agent context health", errors)
    chars = int(policy.get("estimated_token_characters", 4)); targets = policy.get("context_targets", {})
    def estimate(path: Path) -> int: return math.ceil(len(path.read_text(encoding="utf-8")) / chars) if path.is_file() else 0
    root_tokens = estimate(root / "AGENTS.md")
    scoped = max((estimate(p) for p in root.rglob("AGENTS.md") if p != root / "AGENTS.md" and ".git" not in p.parts), default=0)
    work = max((estimate(p) for p in (root / "docs/workstreams").glob("*.md") if p.name != "README.md" and not p.name.startswith("_")), default=0) if (root / "docs/workstreams").is_dir() else 0
    if root_tokens > targets.get("bootstrap_max_estimated_tokens", 2500): errors.append("root AGENTS exceeds bootstrap token target")
    if root_tokens + scoped + work > targets.get("root_scoped_workstream_max_estimated_tokens", 6000): errors.append("focused routing bundle exceeds token target")
    print(f"root AGENTS: ~{root_tokens} tokens; largest scoped: ~{scoped}; largest workstream: ~{work}")
    return emit("Agent context health", errors)


def main(kind: str, root: str = ".") -> int:
    fn = {
        "repository": verify_repository,
        "operations": verify_operations,
        "e2e": verify_e2e,
        "product": verify_product_experience,
        "docs": verify_docs,
        "agent": verify_agent_context,
    }[kind]
    return fn(Path(root).resolve())


if __name__ == "__main__":
    if len(sys.argv) < 2: raise SystemExit("usage: engineering_checks.py repository|operations|e2e|product|docs|agent [root]")
    raise SystemExit(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "."))
