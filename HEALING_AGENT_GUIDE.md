🚀 Healing Agent - Complete Guide
What's Fixed
Previously:

Issue #143 "Login Button Colour Green Colour" → Only markdown file (NO CODE)
Model returned NO_PATCH due to lack of context
Healing agent couldn't find relevant files
Now:

MCP Smart Analysis finds relevant files automatically
Enhanced Prompt FORCES code generation when context is available
Better Debugging shows exactly what happens at each step
How It Works Now
Step 1: Issue Created
User creates issue with ANY vague description:
"Login button should be green"
Step 2: MCP Smart Analysis
Healing Agent:
  1. Calls MCP issue:analyze with title + body
  2. MCP searches project for matching keywords
  3. Finds: login.component.ts, register.component.ts, styles
  4. Returns ranked list of relevant files + content previews
Step 3: OpenRouter Model Gets Rich Context
Model receives:
  - Issue description
  - Keywords extracted by MCP (login, button, green, color)
  - List of 10+ relevant files found
  - First 800 chars of content from top 5 files
  - Baseline files showing project structure
Step 4: Model Generates Code or NO_PATCH
Model thinks:
  "I see login.component.ts with red button styling"
  "I see template with [ngClass] binding"
  "I can change the CSS class from 'btn-red' to 'btn-green'"
  → GENERATES VALID PATCH
Step 5: Patch Applied to PR
Workflow:
  1. Extracts patch from markdown report
  2. Normalizes line endings and indentation
  3. Validates patch with git apply --check
  4. Applies patch with git apply --index
  5. Creates PR with code changes
Test Issues - Copy & Paste Ready
✅ Test #1: Button Styling
Title: Login button color should be green

Body:
The login and registration buttons currently show in red.
Change them to green (#22c55e).
What happens:

MCP finds: login.component.ts, register.component.ts
Model sees button styling code
Generates patch changing .btn-red to .btn-green
PR created with code changes ✅
✅ Test #2: Button Disabled State
Title: Disable login button during API request

Body:
When user clicks the login button, it should be disabled while 
waiting for the API response. Currently it stays enabled and 
user can click multiple times.
What happens:

MCP finds: login.component.ts, auth.service.ts, api calls
Model sees button template and auth service
Generates patch adding [disabled]="isLoading" binding
PR created with code changes ✅
✅ Test #3: Navigation Fix
Title: Fix browser back button closing app

Body:
When user presses the browser back button on the booking page,
the entire app closes instead of going to the previous page.
Should navigate to previous route or /home.
What happens:

MCP finds: app.ts, app.routes.ts, router code
Model sees navigation history tracking
Generates patch for back button handler
PR created with code changes ✅
✅ Test #4: UPI Payment Redirect
Title: Payment UPI redirect not working

Body:
UPI payment method redirect fails. When user selects UPI,
app should open Google Pay or PhonePe but nothing happens.
What happens:

MCP finds: payment.component.ts, payment.service.ts
Model sees payment redirect logic
Generates patch fixing UPI deeplink
PR created with code changes ✅
Workflow Status - How to Check
1. Go to Actions
https://github.com/goat82447-ops/enterprise-lunchbox-lms-prod/actions

2. Look for "PROXIMA 🚀 Healing Agent" workflow
3. Check Steps (from newest run):
Step: Collect repository context via MCP + smart analysis

✓ Found 'Proposed Patch' section
✓ Found 'issue:analyze' method
✓ Wrote smart analysis context to healing-reports/...
Step: Analyze issue and publish diagnostics

Status: Analysis posted successfully (or failed with reason)
Step: Apply OPEN_ROUTER patch if provided

✓ Found report at healing-reports/...
✓ Found 'Proposed Patch' section
✓ Extracted fenced block: 1234 bytes
✓ Normalized patch: 900 bytes
✓ Patch validation passed
✓ Patch applied successfully
✓ Valid source file changes detected
✓ patch_applied=true
Step: Create or update healing PR

Pull Request Created: OPEN_ROUTER code fix for issue #XX
Troubleshooting
❌ Problem: PR has NO code changes (only markdown)
Reason 1: Issue too vague

Issue: "Fix login button"
Body: "not working"

Solution: Reopen with more details
Title: "Login button should be disabled during API request"
Body: "When clicked, button should disable until response arrives"
Reason 2: MCP didn't find files

Check workflow logs for:
"ERROR: No 'diff --git' header found in patch"

Solution: Ensure issue mentions keywords (login, button, color, etc)
Reason 3: Patch validation failed

Check logs for:
"❌ git apply --check validation failed"
"First 80 lines of patch for debugging:"

This means model generated malformed diff
Reopen issue with different wording
MCP Methods Available
issue:analyze (NEW - Smart File Discovery)
Automatically finds relevant files based on issue description.

Example:

{
  "method": "issue:analyze",
  "params": {
    "title": "Login button should be disabled",
    "body": "When user clicks login, button should disable until response"
  }
}
Returns:

{
  "keywords": ["login", "button", "disabled", "api", "request"],
  "relevantFiles": [
    "Frontend/lunchbox-app/src/app/features/login/login.component.ts",
    "Frontend/lunchbox-app/src/app/features/login/login.component.html",
    "Frontend/lunchbox-app/src/app/core/services/auth.service.ts"
  ],
  "fileContents": [
    {
      "path": "login.component.ts",
      "content": "export class LoginComponent { ... }"
    }
  ]
}
Cost Analysis
Component	Cost
MCP Server	$0 (local Node.js)
GitHub Actions	$0 (free tier: 2000 min/month)
OpenRouter API	Pay for tokens used (your existing budget)
Setup Time	~30 min
Time Saved	~1-2 hours per issue
Best Practices
✅ DO:
Write descriptive issue titles
Mention keywords (button, login, fix, disable, etc)
Provide context (current behavior, desired behavior)
Let MCP find files automatically
❌ DON'T:
Write one-word issues
Manually list file paths (MCP finds them)
Describe vague problems without context
Next Steps
Test Issue #1 (Button Styling) - Should generate green button code
Test Issue #2 (Button Disabled) - Should generate disable binding
Test Issue #3 (Navigation) - Should generate back button fix
Test Issue #4 (UPI Payment) - Should generate redirect fix
If any test issue fails:

Check workflow logs for error messages
Look for which step failed (MCP, model, patch extraction, patch apply)
Report findings in issue comments
Recent Fixes
Commit 4b9dfe4 - Critical healing agent fixes:

Fixed MCP context collection JSON parsing
Enhanced OpenRouter prompt to FORCE code generation
Improved patch extraction with detailed logging
Added debugging info for validation failures
Proper error messages for NO_PATCH vs extraction failures
Commit 76894e7 - Smart file discovery:

Added issue:analyze method to MCP
Searches filenames, paths, and file contents
Scores and ranks files by relevance
Removes need for user-specified file paths
Support
For workflow issues:

Check GitHub Actions logs
Look for ✓/❌ symbols in step output
Read error message carefully
Reopen issue with more context if NO_PATCH
For MCP server issues:

cd mcp-server && npm test
For code issues: Check the healing-reports/ directory for diagnostic markdown.
