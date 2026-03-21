# Claude Code Usage

## Invocation

Invoke explicitly with:

```text
$frontend-i18n-orchestrator
```

Then request a task, for example:

```text
Use $frontend-i18n-orchestrator to internationalize this repo with auto-detection first and minimal decision questions.
```

## Script execution

Do not assume current directory is the skill folder.

Use explicit script path:

```bash
<skill_dir>/scripts/detect_i18n_profile.sh <repo_root>
<skill_dir>/scripts/validate_i18n_basics.sh <repo_root>
```

If you copied scripts into the target repo, use repo-relative paths instead.

## Tooling behavior

Use Claude Code native shell and file-edit tools for all execution.
The workflow remains the same:
1. detect facts
2. ask only unresolved business decisions
3. migrate in phases
4. validate and report
