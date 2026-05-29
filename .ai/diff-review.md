Review only the provided git diff.

Do not comment on unchanged code unless the diff makes it relevant.

Prioritize:
1. runtime bugs
2. security bugs
3. data loss
4. authorization mistakes
5. edge cases
6. async/concurrency bugs
7. type errors
8. API contract problems

Ignore:
- formatting
- naming preferences
- purely stylistic opinions
- broad rewrites

Return only actionable findings.

Output format:

## Blockers
- file:function
  - problem
  - fix

## Major
- file:function
  - problem
  - fix

## Minor
- file:function
  - problem
  - fix

## Verdict
Use exactly one:
- safe to commit
- safe after minor fixes
- fix first

If there are no blocker or major issues, say:
No blocker or major issues found.