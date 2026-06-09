## Description
<!-- What does this PR do? Briefly explain the change and why it's needed. -->



## Related Issue / Ticket
<!-- Link to the issue or task: Fixes #123 -->
Fixes #

---

## 🔗 Work Item

#### [work-item-check](https://aka.ms/ocProxima_workItem) — All work item references must be validated before merge.

<!-- Add your Azure Boards work item link below. Format: AB#<id> -->
<!-- Example: AB#6432013 -->

- [ ] Work item linked: `AB#` <!-- replace with your work item ID, e.g. AB#6432013 -->

> Links Azure DevOps work items to this PR. Use `AB#<id>` in the description or commit message to auto-link.

---

## ✅ Must — Required Before Merge

> These items **must** be completed. PR will not be merged until all are checked.

- [ ] Code builds without errors (`npm run build`)
- [ ] No TypeScript errors or lint failures
- [ ] Feature/fix works as expected on mobile viewport (375px)
- [ ] No `console.log` / debug statements left in code
- [ ] No hardcoded credentials, API keys, or secrets
- [ ] All affected routes tested (auth guard, customer guard)
- [ ] PR targets the correct branch (`feature.3` or `main`)
- [ ] PR description is filled out (not blank)

---

## 🟡 Should — Strongly Recommended

> These items **should** be done unless there is a clear reason not to.

- [ ] UI change tested on both light and dark backgrounds
- [ ] Loading and error states are handled (spinners, fallback text)
- [ ] New component/service follows existing naming convention
- [ ] Reused shared styles instead of duplicating CSS
- [ ] No unused imports or dead code introduced
- [ ] Bundle size increase is justified (< 50 kB raw for feature additions)
- [ ] Back navigation works correctly after the change
- [ ] Accessibility: tap targets are at least 44×44px

---

## Type of Change

- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💅 UI / styling improvement
- [ ] ♻️ Refactor (no functional change)
- [ ] 🔧 Config / build change
- [ ] 📦 Dependency update
- [ ] 🔒 Security fix

---

## Screenshots / Screen Recording
<!-- Attach before/after screenshots or a short screen recording for UI changes. -->

| Before | After |
|--------|-------|
|        |       |

---

## Notes for Reviewer
<!-- Anything the reviewer should pay special attention to? -->
