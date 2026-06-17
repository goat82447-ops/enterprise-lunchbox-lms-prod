Repository instructions for Copilot
Project overview
This repository is a multi-surface Lunchbox LMS codebase with:

Frontend/lunchbox-app: Angular frontend.
Backend/microservices: Node.js workspace for API gateway and backend services.
Backend/dotnet: .NET backend services.
Focus on the smallest safe change that fully resolves the assigned issue. Do not mix unrelated work into the same pull request.

Working rules
Treat every issue as one issue -> one branch -> one pull request.
Start by reading the issue title, body, and existing comments. If reproduction details or acceptance criteria are missing, ask for them in an issue comment instead of guessing.
Reuse existing project structure and patterns. Do not introduce new frameworks or broad refactors unless the issue explicitly requires them.
Keep edits scoped to the files needed for the issue.
When a fix is ready, link the issue in the PR body with Closes #<issue-number>.
Validation guidance
For Angular frontend work, prefer running commands from Frontend/lunchbox-app such as npm run build.
For Node microservice work, use the scripts that already exist in Backend/microservices and its workspaces.
For .NET backend work, use dotnet restore and dotnet build on the affected project.
Run only the relevant existing validation for the area you changed. Do not invent new tooling.
Issue handling guidance
If the issue is actionable and reasonably scoped, implement the fix and open a PR.
If the issue is too broad, not reproducible, or depends on missing credentials or infrastructure, leave a clear issue comment explaining the blocker and what is needed next.
Do not create a PR when there is no defensible code change.
