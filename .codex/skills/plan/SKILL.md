---
name: plan
description: Use this project skill to save an implementation plan to .codex/temp for user review before writing code.
metadata:
  short-description: Save implementation plans
---

# plan

Use this skill when the user asks for `/plan`, a plan, an implementation plan,
or wants to think through an approach before writing code.

## Core Behavior

- Read relevant conventions (AGENTS.md, app-specific convention indexes) before
  designing the plan.
- Explore the codebase enough to ground the plan in actual current code, not
  assumptions.
- Produce a concrete, reviewable plan — not a vague outline. Include specific
  files, functions, types, and layering decisions.
- Save the plan to `.codex/temp/<slug>.md` where `<slug>` is a short kebab-case
  name derived from the task (e.g. `user-auth-flow`, `upload-endpoint-plan`).
- After saving, print the file path and ask the user to review and give feedback
  before you begin implementation.
- Do NOT start implementing until the user explicitly approves the plan or says
  to proceed.

## Plan File Format

```markdown
# <Task Title>

## Context
<Why this work is needed. What problem it solves. Relevant current state of the code.>

## Scope
<What is and is not included in this plan.>

## Design Decisions
<Key decisions with rationale. Include trade-offs considered.>

## Implementation Steps

1. <Step with specific file(s) and change description>
2. ...

## Open Questions
<Anything that needs user input or that you are uncertain about.>
```

## Workflow

1. Read AGENTS.md and the relevant app convention index if one exists.
2. Explore the codebase for files, types, and patterns relevant to the task.
3. Draft the plan in the format above.
4. Save it to `.codex/temp/<slug>.md`.
5. Print: `Plan saved to .codex/temp/<slug>.md — please review and let me know if you'd like any changes before I start.`
6. Stop and wait for user feedback.