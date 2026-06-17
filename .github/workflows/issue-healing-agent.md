Updated todo list

Use these **full files** exactly.

### 1) `.github/workflows/issue-healing-agent.md`

```markdown
---
description: Automatically investigate actionable GitHub issues and open one dedicated fix PR per issue
on:
  issues:
    types: [opened, reopened, edited]

permissions: read-all

network: defaults

tools:
  github:
    toolsets: [context, repos, issues, pull_requests]
  bash:
    - "*"

safe-outputs:
  create-pull-request:
    labels: [copilot-healing, automated]
    protected-files: fallback-to-issue
    if-no-changes: warn
  add-comment:
  noop:

timeout-minutes: 45

steps:
  - name: Checkout repository
    uses: actions/checkout@v4
    with:
      fetch-depth: 0
      persist-credentials: false

  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: npm
      cache-dependency-path: |
        Frontend/lunchbox-app/package-lock.json
        Backend/microservices/package-lock.json

  - name: Setup .NET
    uses: actions/setup-dotnet@v4
    with:
      dotnet-version: 10.0.x

  - name: Install Angular frontend dependencies
    working-directory: Frontend/lunchbox-app
    run: npm ci

  - name: Install Node microservice dependencies
    working-directory: Backend/microservices
    run: npm install

  - name: Restore .NET projects
    shell: bash
    run: |
      find Backend/dotnet -name '*.csproj' -print0 | xargs -0 -n1 dotnet restore
---

# Issue Healing Agent

You are the repository's automated healing agent for `${{ github.repository }}`.

Your job is to turn a newly opened GitHub issue into exactly one of these outcomes:

1. A dedicated pull request that resolves the issue with code changes.
2. A clear issue comment that explains why the issue is not actionable yet.

## Core contract

- Follow **one issue -> one branch -> one pull request**.
- Work only on the issue that triggered this workflow: `#${{ github.event.issue.number }}`.
- Do not bundle fixes for any other issue into the same PR.
- Prefer the smallest safe implementation that fully resolves the issue.

## Investigation flow

1. Read the issue title, body, labels, and comments carefully.
2. Decide whether the issue is actionable right now.
3. Search for an existing open pull request already linked to this issue or clearly solving the same problem.
4. Identify the affected area of the repository before changing code.
5. Use the repository instructions in `.github/copilot-instructions.md` while working.

## When the issue is actionable

If the issue has enough detail to implement safely:

1. Make the minimal code changes needed to resolve it.
2. Run the relevant existing validation for the code you changed.
3. If validation passes and you produced real code changes, use `create-pull-request`.

The PR must:

- Be dedicated to this single issue.
- Include `Closes #${{ github.event.issue.number }}` in the PR body.
- Summarize the root cause, the fix, and the validation you ran.
- Mention any limitations or follow-up work that remains.

## When the issue is not actionable

Do **not** create a PR if any of these are true:

- The issue is missing the expected behavior or acceptance criteria.
- The issue cannot be reproduced from the details provided.
- The issue depends on credentials, infrastructure, or external access not available in the repository.
- The issue is so broad that it should be split into multiple smaller issues and PRs.
- There is already an active PR addressing the same issue.

In those cases, use `add-comment` to post a short, specific explanation of the blocker and what information or scope change is needed next. Then use `noop`.
```

---

### 2) `.github/workflows/agentic-workflow-compiler.yml`

```yaml
name: Agentic Workflow Compiler

on:
  push:
    branches: [main]
    paths:
      - ".github/workflows/*.md"
  workflow_dispatch:

jobs:
  compile-agents:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Install Agentic Workflow Extension
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh extension install github/gh-aw

      - name: Compile workflows
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh aw compile

      - name: Commit generated lock files
        run: |
          shopt -s nullglob
          files=(.github/workflows/*.lock.yml)
          if [ ${#files[@]} -eq 0 ]; then
            echo "No lock files generated."
            exit 1
          fi

          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

          git add .github/workflows/*.lock.yml

          if git diff --cached --quiet; then
            echo "No lock file changes to commit."
            exit 0
          fi

          git commit -m "chore: compile agentic workflow lock files"
          git push

      - name: Upload compiled lock files
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: compiled-workflows
          path: .github/workflows/*.lock.yml
          if-no-files-found: ignore
```