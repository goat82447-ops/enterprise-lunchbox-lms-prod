# Issue Healing Agent - Secrets and Variables Setup

This document shows the exact configuration required for:

- `.github/workflows/issue-healing-agent.lock.yml`

## Reference screenshots

### Actions secrets page

![Actions secrets page](docs/images/healing-agent-secrets-page.png)

### Actions variables page

![Actions variables page](docs/images/healing-agent-variables-page.png)

## Recommended setup

Use **Repository-level** secrets and variables for this workflow.

GitHub path:

`Repository -> Settings -> Secrets and variables -> Actions`

---

## Repository secrets

Add these under **Actions -> Secrets**:

| Name | Value | Required |
|---|---|---|
| `COPILOT_GITHUB_TOKEN` | PAT from a Copilot-enabled user | Yes |
| `GH_AW_GITHUB_TOKEN` | Same PAT (recommended) | Recommended |

### PAT requirements

- The PAT owner must have an active GitHub Copilot seat/entitlement.
- If your organization uses SSO, authorize this PAT for SSO.
- If PAT was exposed in a variable before, revoke it and generate a new one.

---

## Repository variables

Add these under **Actions -> Variables**:

| Name | Value | Required |
|---|---|---|
| `GH_AW_MODEL_AGENT_COPILOT` | `gpt-5-mini` | Yes |
| `GH_AW_DEFAULT_MODEL_COPILOT` | `gpt-5-mini` | Recommended |

---

## Environment secrets

For this workflow, **do not rely on environment-scoped settings** unless your job explicitly targets that environment in workflow YAML.

If you add values only in an environment and the job does not use that environment, workflow will not read them.

So for this healing agent:

- Prefer **Repository secrets** and **Repository variables**
- Keep environment entries empty unless you intentionally wire environment usage in workflow

---

## Common mistakes to avoid

1. Adding `COPILOT_GITHUB_TOKEN` under **Variables** instead of **Secrets**
2. Adding `GH_AW_MODEL_AGENT_COPILOT` under **Secrets** instead of **Variables**
3. Keeping model vars only at environment scope (and not repository scope)
4. Re-running an old failed run instead of triggering a fresh run

---

## Validation checklist

After saving secrets/variables, trigger a fresh issue-healing run and verify logs:

- Model is `gpt-5-mini` (not `claude-sonnet-4.6`)
- No `HTTP 401` on `/models`

If still `401`, token entitlement/SSO is still the blocker.
