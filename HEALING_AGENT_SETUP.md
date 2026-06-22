OPEN_AI ChatGPT Healing Agent - Secrets and Variables Setup
This document shows the exact configuration required for:

.github/workflows/openai-healing-agent.yml
Behavior:

Posts OPEN_AI diagnostics as an issue comment
Creates/updates a branch and PR automatically with healing-reports/issue-<number>.md
You can also use .github/workflows/openrouter-healing-agent.yml for OpenRouter-based diagnostics and PR automation
OpenRouter workflow now creates a PR only when valid Frontend/Backend source changes are applied (not report/docs/workflow files)
Reference screenshots
Actions secrets page
Actions secrets page

Actions variables page
Actions variables page

Recommended setup
Use Repository-level secrets and variables for this workflow.

GitHub path:

Repository -> Settings -> Secrets and variables -> Actions

Repository secrets
Add these under Actions -> Secrets:

Name	Value	Required
OPENAI_API_KEY	sk-ADD_YOUR_KEY (replace with your real key)	Yes
OPENROUTER_API_KEY	Your OpenRouter key (replace with real key)	For OpenRouter workflow
Repository variables
Add these under Actions -> Variables:

Name	Value	Required
OPENAI_MODEL	gpt-4o-mini (or any model your key can access)	Yes
OPENAI_API_BASE_URL	https://api.openai.com/v1	Optional
OPENROUTER_MODEL	openrouter/auto (or a model id like meta-llama/llama-3.1-8b-instruct:free)	For OpenRouter workflow
OPENROUTER_API_BASE_URL	https://openrouter.ai/api/v1	Optional
Environment secrets
For this workflow, use repository-level settings unless you intentionally wire an environment in the workflow.

Common mistakes to avoid
Adding OPENAI_API_KEY under Variables instead of Secrets
Typing the wrong model name in OPENAI_MODEL
Keeping values only in environment scope while workflow reads repository scope
Re-running an old failed job instead of triggering a fresh issue event
Validation checklist
After saving secrets/variables, trigger a fresh run and verify logs:

Workflow starts OPEN_AI ChatGPT Healing Agent
API call to ${OPENAI_API_BASE_URL}/chat/completions returns success
A comment is posted on the issue with model output
A branch open_ai-healing/issue-<number> and PR are created/updated automatically
